/**
 * Parent portal: a guardian sees their own children only.
 *  - attendance per class session (LiveKit join/leave webhooks against each held class),
 *  - progress (classes attended, notes and homework, teacher remarks),
 *  - consent for engagement analytics and class recording, with history. A change applies
 *    immediately: analytics samples are refused at once, and a learner in a live class is
 *    dropped from (or returned to) the recording within seconds.
 * Teachers add remarks here too (shown to the learner and their parents).
 */
import crypto from "crypto";
import express from "express";
import { and, asc, desc, eq, inArray, gte } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth, SessionUser } from "./auth/session";
import { saveConsent } from "./engagementHub";
import { latestConsents, isRecordingExcluded, recordingDefaultIncluded } from "./recording/consent";
import { computeAttendance } from "./attendance";
import { canHost, rooms } from "./roomControlHub";
import { learnerKeys } from "./classesHub";
import { auditInsert, persist } from "./db/kv";

async function isGuardian(parentId: string, studentId: string) {
  const db: any = await getDb();
  const [row] = await db.select().from(schema.guardians).where(and(eq(schema.guardians.parentId, parentId), eq(schema.guardians.studentId, studentId)));
  return Boolean(row);
}

async function childrenOf(parentId: string) {
  const db: any = await getDb();
  return db
    .select({ id: schema.users.id, name: schema.users.name, studentCode: schema.users.studentCode, gradeLevel: schema.users.gradeLevel, avatarColor: schema.users.avatarColor, relation: schema.guardians.relation })
    .from(schema.guardians)
    .innerJoin(schema.users, eq(schema.users.id, schema.guardians.studentId))
    .where(eq(schema.guardians.parentId, parentId));
}

/** Learner (or their guardian) only. */
const childAccess: express.RequestHandler = async (req, res, next) => {
  const user = req.user!;
  const childId = req.params.id;
  if (user.role === "student" && user.id === childId) return next();
  if (user.role === "parent" && (await isGuardian(user.id, childId))) return next();
  return res.status(404).json({ error: "Not found" });
};

/** Live classes: put the learner's current consent on their participant so the recording layout follows it. */
async function applyRecordingConsentLive(childId: string, role: string) {
  const svc = rooms();
  if (!svc) return;
  const excluded = await isRecordingExcluded({ id: childId, role });
  const live = await svc.listRooms().catch(() => []);
  for (const room of live) {
    const p = await svc.getParticipant(room.name, childId).catch(() => null);
    if (!p) continue;
    let meta: any = {};
    try {
      meta = JSON.parse(p.metadata || "{}");
    } catch {}
    await svc.updateParticipant(room.name, childId, { metadata: JSON.stringify({ ...meta, recordingExcluded: excluded }) }).catch((e) => console.warn("[consent] live update failed", e?.message));
  }
}

async function overview(childId: string) {
  const db: any = await getDb();
  const [child] = await db.select().from(schema.users).where(eq(schema.users.id, childId));
  const keys = [child.id, child.studentCode].filter(Boolean) as string[];
  const enr = await db.select().from(schema.classEnrollments).where(inArray(schema.classEnrollments.studentKey, keys));
  const classIds = [...new Set(enr.map((e: any) => e.classId))] as string[];
  const classes = classIds.length
    ? await db
        .select({ c: schema.classes, teacherName: schema.users.name })
        .from(schema.classes)
        .leftJoin(schema.users, eq(schema.users.id, schema.classes.teacherId))
        .where(inArray(schema.classes.id, classIds))
    : [];
  const classByRoom = new Map(classes.map((r: any) => [r.c.roomSlug, { ...r.c, scheduledStart: new Date(r.c.scheduledStart).toISOString(), teacherName: r.teacherName }]));
  const roomSlugs = [...classByRoom.keys()] as string[];

  // Held sessions = recordings (every started class has one), newest first, last 90 days
  const since = new Date(Date.now() - 90 * 864e5);
  const held = roomSlugs.length
    ? await db.select().from(schema.recordings).where(and(inArray(schema.recordings.roomSlug, roomSlugs), gte(schema.recordings.startedAt, since))).orderBy(desc(schema.recordings.startedAt))
    : [];
  const events = roomSlugs.length
    ? await db
        .select()
        .from(schema.attendanceEvents)
        .where(and(eq(schema.attendanceEvents.userId, childId), inArray(schema.attendanceEvents.roomSlug, roomSlugs), gte(schema.attendanceEvents.at, new Date(since.getTime() - 864e5))))
        .orderBy(asc(schema.attendanceEvents.at))
    : [];
  const attendance = held.map((h: any) => {
    const start = new Date(h.startedAt);
    const end = h.endedAt ? new Date(h.endedAt) : new Date();
    const result = computeAttendance(
      events.filter((e: any) => e.roomSlug === h.roomSlug).map((e: any) => ({ event: e.event, at: e.at })),
      start,
      end
    );
    const cls: any = classByRoom.get(h.roomSlug);
    return {
      recordingId: h.id,
      roomSlug: h.roomSlug,
      class: cls ? { kind: cls.kind, subject: cls.subject, topic: cls.topic, course: cls.course, teacherName: cls.teacherName } : null,
      startedAt: start.toISOString(),
      endedAt: h.endedAt ? end.toISOString() : null,
      running: !h.endedAt,
      ...result,
    };
  });

  // Notes and homework from the classes held
  const notes = held.length ? await db.select().from(schema.lectureNotes).where(inArray(schema.lectureNotes.recordingId, held.map((h: any) => h.id))) : [];
  const notesByRec = new Map(notes.map((n: any) => [n.recordingId, n]));
  const homework = held
    .map((h: any) => {
      const n: any = notesByRec.get(h.id);
      const items = (n?.data?.homework || []) as string[];
      const cls: any = classByRoom.get(h.roomSlug);
      return items.length ? { recordingId: h.id, classTitle: cls ? (cls.topic ? `${cls.subject}: ${cls.topic}` : cls.subject) : h.roomSlug, date: new Date(h.startedAt).toISOString(), items } : null;
    })
    .filter(Boolean);

  const remarks = await db
    .select({ r: schema.remarks, teacherName: schema.users.name })
    .from(schema.remarks)
    .leftJoin(schema.users, eq(schema.users.id, schema.remarks.teacherId))
    .where(eq(schema.remarks.studentId, childId))
    .orderBy(desc(schema.remarks.at))
    .limit(50);

  const history = await db.select().from(schema.consents).where(eq(schema.consents.userId, childId)).orderBy(desc(schema.consents.at), desc(schema.consents.id)).limit(50);
  const [analytics, recording] = await Promise.all([latestConsents([childId], "analytics"), latestConsents([childId], "recording")]);

  const ended = attendance.filter((a: any) => !a.running);
  return {
    child: { id: child.id, name: child.name, studentCode: child.studentCode, gradeLevel: child.gradeLevel, avatarColor: child.avatarColor },
    classes: [...classByRoom.values()].sort((a: any, b: any) => a.scheduledStart.localeCompare(b.scheduledStart)),
    attendance,
    summary: {
      held: ended.length,
      attended: ended.filter((a: any) => a.status !== "absent").length,
      late: ended.filter((a: any) => a.status === "late").length,
      minutesPresent: ended.reduce((s: number, a: any) => s + a.minutesPresent, 0),
      notesAvailable: notes.length,
    },
    homework,
    remarks: remarks.map((x: any) => ({ id: x.r.id, kind: x.r.kind, stars: x.r.stars, note: x.r.note, at: new Date(x.r.at).toISOString(), teacherName: x.teacherName, roomSlug: x.r.roomSlug })),
    consents: {
      analytics: analytics.get(childId) || null,
      recording: recording.get(childId) || null,
      recordingDefault: recordingDefaultIncluded() ? "included" : "excluded",
    },
    consentHistory: history.map((c: any) => ({ kind: c.kind, granted: c.granted, decidedBy: c.decidedBy, guardianName: c.guardianName, at: new Date(c.at).toISOString() })),
  };
}

/** Admins; teachers of a class the learner is enrolled in; or the host of a live room the learner is in. */
async function mayRemark(user: SessionUser, studentId: string, roomSlug: string | null) {
  if (user.role === "admin") return true;
  const db: any = await getDb();
  const keys = await learnerKeys(studentId, "student");
  if (user.role === "instructor" && keys.length) {
    const mine = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .innerJoin(schema.classEnrollments, eq(schema.classEnrollments.classId, schema.classes.id))
      .where(and(eq(schema.classes.teacherId, user.id), inArray(schema.classEnrollments.studentKey, keys)));
    if (mine.length) return true;
  }
  if (roomSlug && (await canHost(user, roomSlug))) {
    const p = await rooms()?.getParticipant(roomSlug, studentId).catch(() => null);
    if (p) return true;
  }
  return false;
}

export function setupParentRoutes(app: express.Express) {
  app.get("/api/parent/children", requireAuth("parent"), async (req, res) => {
    res.json({ children: await childrenOf(req.user!.id) });
  });

  app.get("/api/parent/children/:id", requireAuth("parent", "student"), childAccess, async (req, res) => {
    res.json(await overview(req.params.id));
  });

  app.post("/api/parent/children/:id/consent", requireAuth("parent"), childAccess, async (req, res) => {
    const kind = req.body?.kind;
    if (kind !== "analytics" && kind !== "recording") return res.status(400).json({ error: "Unknown consent type" });
    if (typeof req.body?.granted !== "boolean") return res.status(400).json({ error: "Choose allow or don't allow" });
    const parent = req.user!;
    const guardianName = String(req.body?.guardianName || parent.name).trim().slice(0, 120);
    if (!guardianName) return res.status(400).json({ error: "Your name is needed to record this decision" });
    const db: any = await getDb();
    const [child] = await db.select().from(schema.users).where(eq(schema.users.id, req.params.id));
    await saveConsent(
      {
        participantId: child.id,
        name: child.name,
        role: child.role,
        granted: req.body.granted,
        guardianName,
        guardianAttested: true,
        country: parent.country || undefined,
        at: new Date().toISOString(),
        userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
      },
      kind,
      parent.id
    );
    if (kind === "recording") await applyRecordingConsentLive(child.id, child.role);
    persist(
      "consent audit",
      auditInsert("consent", { id: `cn-${crypto.randomUUID()}`, at: new Date().toISOString(), type: `${kind}_${req.body.granted ? "granted" : "declined"}`, userId: parent.id, data: { childId: child.id, kind, granted: req.body.granted, guardianName } })
    );
    res.json(await overview(child.id));
  });

  // ---------------- teacher remarks ----------------
  app.post("/api/remarks", requireAuth("instructor", "admin", "sales_rep"), async (req, res) => {
    const studentId = String(req.body?.studentId || "");
    const note = String(req.body?.note || "").trim().slice(0, 500);
    const kind = String(req.body?.kind || "Remark").trim().slice(0, 40);
    const stars = Math.max(0, Math.min(5, Math.round(Number(req.body?.stars) || 0)));
    if (!note) return res.status(400).json({ error: "Write a short note" });
    const db: any = await getDb();
    const [student] = await db.select().from(schema.users).where(eq(schema.users.id, studentId));
    if (!student || student.role !== "student") return res.status(404).json({ error: "Learner not found" });
    if (!(await mayRemark(req.user!, student.id, req.body?.roomSlug ? String(req.body.roomSlug) : null))) return res.status(403).json({ error: "You can only add remarks for learners you teach." });
    const id = `rmk-${crypto.randomUUID()}`;
    await db.insert(schema.remarks).values({ id, studentId, teacherId: req.user!.id, roomSlug: req.body?.roomSlug ? String(req.body.roomSlug).slice(0, 120) : null, kind, stars, note });
    res.json({ remark: { id, studentId, kind, stars, note } });
  });
}

