/**
 * Teacher↔student booking API. Bookings are rows in the classes/class_enrollments tables.
 * Every booking also registers the room's device policy (demo/paid session type).
 */
import express from "express";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { persist } from "./db/kv";
import crypto from "crypto";
import { createInviteToken } from "./auth/routes";
import { FACULTY_ROSTER, findFaculty } from "../services/matching/facultyRoster";
import { Booking, MatchRequest, findOpenSection, matchTeachers } from "../services/matching/teacherMatcher";
import { actorFromSession, upsertRoomPolicy } from "./deviceAccessHub";
import { requireAuth } from "./auth/session";
import type { SessionType } from "../services/devicePolicyEngine";

const STAFF = ["instructor", "admin", "sales_rep"];

/** What the class is, shown on screen. The sales breakout is presented as academic counselling. */
export type ClassKind = "admission" | "demo" | "counselling" | "doubt_clearing" | "enrolled";
const KINDS: ClassKind[] = ["admission", "demo", "counselling", "doubt_clearing", "enrolled"];
const KIND_SESSION: Record<ClassKind, SessionType> = {
  admission: "trial",
  demo: "demo",
  counselling: "trial",
  doubt_clearing: "paid",
  enrolled: "paid",
};

let bookings: Booking[] = [];

/** Bookings are classes with a teacher; enrolments are the students in them. */
async function loadFromDb() {
  const db: any = await getDb();
  const cls = await db.select().from(schema.classes);
  const enr = await db.select().from(schema.classEnrollments);
  bookings = cls
    .filter((c: any) => c.teacherId)
    .map((c: any) => ({
      id: c.id,
      teacherId: c.teacherId,
      startUtc: new Date(c.scheduledStart).toISOString(),
      endUtc: new Date(new Date(c.scheduledStart).getTime() + c.durationMin * 60000).toISOString(),
      roomSlug: c.roomSlug,
      subject: c.subject,
      gradeLevel: c.gradeLevel || 0,
      program: c.program || undefined,
      language: c.language,
      classSize: c.classSize,
      studentKeys: enr.filter((e: any) => e.classId === c.id).map((e: any) => e.studentKey),
      sessionType: KIND_SESSION[c.kind as ClassKind] || "paid",
      createdAt: new Date(c.createdAt).toISOString(),
    }));
}

function parseRequest(raw: any): MatchRequest | string {
  const startUtc = raw?.startUtc ? new Date(raw.startUtc) : null;
  if (!raw?.subject) return "subject is required";
  if (!startUtc || isNaN(startUtc.getTime())) return "startUtc must be a valid date";
  const classSize = Math.round(Number(raw.classSize) || 1);
  if (classSize < 1 || classSize > 24) return "classSize must be between 1 and 24";
  return {
    subject: String(raw.subject).slice(0, 120),
    gradeLevel: Math.round(Number(raw.gradeLevel) || 0),
    program: raw.program ? String(raw.program).toLowerCase().slice(0, 8) : undefined,
    language: String(raw.language || "en").toLowerCase().slice(0, 8),
    allowInterpreter: Boolean(raw.allowInterpreter),
    startUtc: startUtc.toISOString(),
    durationMin: Math.min(240, Math.max(15, Math.round(Number(raw.durationMin) || 60))),
    classSize,
    studentCountryIso2: raw.studentCountryIso2 ? String(raw.studentCountryIso2).toUpperCase().slice(0, 2) : undefined,
    studentTimezone: raw.studentTimezone ? String(raw.studentTimezone).slice(0, 64) : undefined,
    previousTeacherId: raw.previousTeacherId ? String(raw.previousTeacherId) : undefined,
  };
}

function roomSlugFor(req: MatchRequest, teacherId: string): string {
  const t = findFaculty(teacherId);
  const subject = req.subject.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10) || "class";
  const brand = req.program && ["cd", "rb", "ai", "ds", "dm"].includes(req.program) ? "21klf" : "21kos";
  const teacher = (t?.name.split(" ").pop() || teacherId).toLowerCase().replace(/[^a-z0-9]/g, "");
  return [t?.countryIso2.toLowerCase() || "in", brand, `gr${req.gradeLevel}`, req.program || "bc", subject, teacher, Math.random().toString(36).slice(2, 6)].join("-");
}

/**
 * Makes sure the booked learner (and their parent) can sign in: creates the accounts on first
 * booking and links the parent as guardian. Returns the learner's user id.
 */
async function ensureLearnerAccounts(student: { key: string; name?: string; email?: string; gradeLevel?: number }, parent?: { name?: string; email?: string }) {
  const db: any = await getDb();
  const code = student.key.toUpperCase();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.studentCode, code));
  let studentId = existing?.id as string | undefined;
  if (!studentId) {
    studentId = `stu-${code}`;
    await db
      .insert(schema.users)
      .values({
        id: studentId,
        email: (student.email || `${code.toLowerCase()}@learners.21k.school`).toLowerCase(),
        name: student.name || code,
        role: "student",
        avatarColor: "#0082FF",
        studentCode: code,
        gradeLevel: student.gradeLevel || null,
      })
      .onConflictDoNothing();
  }
  if (parent?.email) {
    const email = parent.email.trim().toLowerCase();
    let [p] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (!p) {
      [p] = await db
        .insert(schema.users)
        .values({ id: `par-${crypto.randomUUID().slice(0, 8)}`, email, name: parent.name || "Parent", role: "parent", avatarColor: "#F59E0B" })
        .returning();
    }
    if (p?.role === "parent") await db.insert(schema.guardians).values({ parentId: p.id, studentId, relation: "parent" }).onConflictDoNothing();
  }
  return studentId;
}

export function setupMatchingRoutes(app: express.Express) {
  const ready = loadFromDb().catch((err) => console.error("[Matching] load failed:", err));
  app.use(["/api/match", "/api/bookings"], (_req, _res, next) => {
    ready.then(() => next());
  });

  app.get("/api/faculty/roster", requireAuth(), (_req, res) => {
    res.json({ faculty: FACULTY_ROSTER });
  });

  app.post("/api/match/preview", requireAuth("admin", "instructor", "sales_rep"), (req, res) => {
    const parsed = parseRequest(req.body?.request);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    res.json({ ...matchTeachers(parsed, FACULTY_ROSTER, bookings), openSection: findOpenSection(parsed, bookings) || null });
  });

  app.post("/api/match/assign", requireAuth("admin", "instructor", "sales_rep"), async (req, res) => {
    const actor = actorFromSession(req);
    const actorRole = actor.role;
    const parsed = parseRequest(req.body?.request);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    const rawKey = String(req.body?.student?.key || req.body?.student?.email || "").trim().slice(0, 80);
    if (!rawKey) return res.status(400).json({ error: "student.key is required" });
    // Prefer the explicit class kind; fall back to the legacy sessionType
    const kind: ClassKind = KINDS.includes(req.body?.kind) ? req.body.kind : req.body?.sessionType === "demo" ? "demo" : "enrolled";
    const sessionType: SessionType = KIND_SESSION[kind];
    const topic = req.body?.topic ? String(req.body.topic).slice(0, 160) : null;

    const learnerId = await ensureLearnerAccounts(
      { key: rawKey, name: req.body?.student?.name, email: req.body?.student?.email, gradeLevel: parsed.gradeLevel },
      req.body?.parent
    );
    // Enrolments always reference the learner's user id
    const studentKey = learnerId;
    const inviteFor = async (slug: string) =>
      `${req.protocol}://${req.get("host")}/?room=${encodeURIComponent(slug)}&invite=${encodeURIComponent(await createInviteToken(learnerId, slug))}`;

    // 1. Join an open section of the same cohort if there is one
    const section = findOpenSection(parsed, bookings);
    if (section) {
      if (!section.studentKeys.includes(studentKey)) {
        section.studentKeys.push(studentKey);
        persist("enrolment", getDb().then((db: any) => db.insert(schema.classEnrollments).values({ classId: section.id, studentKey }).onConflictDoNothing()));
      }
      return res.json({ booking: section, teacher: findFaculty(section.teacherId), placement: "joined_section", inviteUrl: await inviteFor(section.roomSlug) });
    }

    // 2. Otherwise pick the best eligible teacher
    const { ranked, excluded } = matchTeachers(parsed, FACULTY_ROSTER, bookings);
    // Staff may pick an alternative, but only among eligible teachers (hard rules still apply)
    const preferred = req.body?.preferredTeacherId ? ranked.find((c) => c.teacherId === req.body.preferredTeacherId) : undefined;
    if (req.body?.preferredTeacherId && !preferred) {
      const why = excluded.find((c) => c.teacherId === req.body.preferredTeacherId);
      return res.status(409).json({ error: `${why?.teacherName || "That teacher"} can't take this class: ${why?.blockers.join("; ") || "not eligible"}`, excluded });
    }
    const best = preferred || ranked[0];
    if (!best) {
      return res.status(409).json({ error: "No teacher is available for this slot.", excluded });
    }
    const roomSlug = String(req.body?.roomSlug || "") || roomSlugFor(parsed, best.teacherId);
    const booking: Booking = {
      id: `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      teacherId: best.teacherId,
      startUtc: parsed.startUtc,
      endUtc: new Date(Date.parse(parsed.startUtc) + parsed.durationMin * 60000).toISOString(),
      roomSlug,
      subject: parsed.subject,
      gradeLevel: parsed.gradeLevel,
      program: parsed.program,
      language: parsed.language,
      classSize: parsed.classSize,
      studentKeys: [studentKey],
      sessionType,
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    persist(
      "class booking",
      getDb().then(async (db: any) => {
        await db.insert(schema.classes).values({
          id: booking.id,
          roomSlug,
          kind,
          subject: parsed.subject,
          course: req.body?.course ? String(req.body.course).slice(0, 160) : null,
          topic,
          gradeLevel: parsed.gradeLevel,
          program: parsed.program || null,
          language: parsed.language,
          teacherId: best.teacherId,
          scheduledStart: new Date(parsed.startUtc),
          durationMin: parsed.durationMin,
          classSize: parsed.classSize,
          createdBy: actor.id,
        });
        await db.insert(schema.classEnrollments).values({ classId: booking.id, studentKey });
      })
    );
    upsertRoomPolicy({
      roomSlug,
      context: { sessionType, gradeLevel: parsed.gradeLevel, courseCode: parsed.program },
      actor,
    });
    res.json({ booking, teacher: findFaculty(best.teacherId), placement: "new_class", match: best, alternatives: ranked.slice(1, 4), excluded, inviteUrl: await inviteFor(roomSlug) });
  });

  app.get("/api/bookings", requireAuth("admin", "instructor", "sales_rep", "auditor"), (req, res) => {
    const { teacherId, student } = req.query as Record<string, string | undefined>;
    const list = bookings
      .filter((b) => (!teacherId || b.teacherId === teacherId) && (!student || b.studentKeys.some((k) => k.toLowerCase() === student.toLowerCase())))
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    res.json({ bookings: list });
  });

  app.delete("/api/bookings/:id", requireAuth("admin", "sales_rep"), (req, res) => {
    const before = bookings.length;
    bookings = bookings.filter((b) => b.id !== req.params.id);
    persist(
      "cancel booking",
      getDb().then(async (db: any) => {
        await db.delete(schema.classEnrollments).where(eq(schema.classEnrollments.classId, req.params.id));
        await db.delete(schema.classes).where(eq(schema.classes.id, req.params.id));
      })
    );
    res.json({ removed: before - bookings.length });
  });
}
