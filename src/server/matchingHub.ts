/**
 * Teacher↔student booking API. Bookings persist to DATA_DIR/matching/bookings.json.
 * Every booking also registers the room's device policy (demo/paid session type).
 */
import fs from "fs";
import path from "path";
import express from "express";
import { FACULTY_ROSTER, findFaculty } from "../services/matching/facultyRoster";
import { Booking, MatchRequest, findOpenSection, matchTeachers } from "../services/matching/teacherMatcher";
import { upsertRoomPolicy } from "./deviceAccessHub";
import type { SessionType } from "../services/devicePolicyEngine";

const DIR = path.join(process.env.DEVICE_ACCESS_DATA_DIR ? path.dirname(process.env.DEVICE_ACCESS_DATA_DIR) : path.join(process.cwd(), "data"), "matching");
const FILE = path.join(DIR, "bookings.json");
const STAFF = ["instructor", "admin", "sales_rep"];

let bookings: Booking[] = [];
let persist = true;
try {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(FILE)) bookings = JSON.parse(fs.readFileSync(FILE, "utf-8"));
} catch {
  persist = false;
}

const save = () => {
  if (persist) fs.writeFile(FILE, JSON.stringify(bookings, null, 2), () => {});
};

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

export function setupMatchingRoutes(app: express.Express) {
  app.get("/api/faculty/roster", (_req, res) => {
    res.json({ faculty: FACULTY_ROSTER });
  });

  app.post("/api/match/preview", (req, res) => {
    const parsed = parseRequest(req.body?.request);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    res.json({ ...matchTeachers(parsed, FACULTY_ROSTER, bookings), openSection: findOpenSection(parsed, bookings) || null });
  });

  app.post("/api/match/assign", (req, res) => {
    const actorRole = String(req.body?.actor?.role || "");
    if (!STAFF.includes(actorRole)) return res.status(403).json({ error: "Only staff can book classes." });
    const parsed = parseRequest(req.body?.request);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    const studentKey = String(req.body?.student?.key || req.body?.student?.email || "").toLowerCase().slice(0, 80);
    if (!studentKey) return res.status(400).json({ error: "student.key is required" });
    const sessionType: SessionType = ["demo", "paid", "trial", "free", "internal"].includes(req.body?.sessionType) ? req.body.sessionType : "paid";

    // 1. Join an open section of the same cohort if there is one
    const section = findOpenSection(parsed, bookings);
    if (section) {
      if (!section.studentKeys.includes(studentKey)) section.studentKeys.push(studentKey);
      save();
      return res.json({ booking: section, teacher: findFaculty(section.teacherId), placement: "joined_section" });
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
    save();
    upsertRoomPolicy({
      roomSlug,
      context: { sessionType, gradeLevel: parsed.gradeLevel, courseCode: parsed.program },
      actor: { id: String(req.body?.actor?.id || "staff"), name: String(req.body?.actor?.name || "Staff"), role: actorRole },
    });
    res.json({ booking, teacher: findFaculty(best.teacherId), placement: "new_class", match: best, alternatives: ranked.slice(1, 4), excluded });
  });

  app.get("/api/bookings", (req, res) => {
    const { teacherId, student } = req.query as Record<string, string | undefined>;
    const list = bookings
      .filter((b) => (!teacherId || b.teacherId === teacherId) && (!student || b.studentKeys.includes(student.toLowerCase())))
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    res.json({ bookings: list });
  });

  app.delete("/api/bookings/:id", (req, res) => {
    const before = bookings.length;
    bookings = bookings.filter((b) => b.id !== req.params.id);
    save();
    res.json({ removed: before - bookings.length });
  });
}
