/**
 * Attendance by class session, from the session facts (LiveKit join/leave records). Teachers see the
 * classes they taught or hosted; auditors and admins see every class. Demo history is left out.
 * No quality scores here: teachers never see analytics about themselves.
 */
import express from "express";
import { and, desc, eq, gte, inArray, lt, notLike, or } from "drizzle-orm";
import { getDb, schema } from "../db";
import { requireAuth } from "../auth/session";
import { DEMO_PREFIX } from "./demo";
import { sessionTitle } from "./aggregate";

const ALL = new Set(["auditor", "admin"]);

export function setupAttendanceRoutes(app: express.Express) {
  const staff = requireAuth("instructor", "auditor", "admin");

  app.get("/api/attendance/sessions", staff, async (req, res) => {
    const db: any = await getDb();
    const user = req.user!;
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));
    const since = new Date(Date.now() - days * 864e5);
    const conds = [gte(schema.sessionFacts.startedAt, since), lt(schema.sessionFacts.startedAt, new Date(Date.now() + 864e5)), notLike(schema.sessionFacts.roomSlug, `${DEMO_PREFIX}%`), eq(schema.sessionFacts.aborted, false)];
    if (!ALL.has(user.role)) conds.push(or(eq(schema.sessionFacts.teacherId, user.id), eq(schema.sessionFacts.hostId, user.id))!);
    const rows = await db
      .select()
      .from(schema.sessionFacts)
      .where(and(...conds))
      .orderBy(desc(schema.sessionFacts.startedAt))
      .limit(200);
    const ids = rows.map((r: any) => r.recordingId);
    const learners = ids.length ? await db.select().from(schema.sessionLearners).where(inArray(schema.sessionLearners.recordingId, ids)) : [];
    const count = (id: string, status: string) => learners.filter((l: any) => l.recordingId === id && l.status === status).length;
    res.json({
      sessions: rows.map((f: any) => ({
        recordingId: f.recordingId,
        roomSlug: f.roomSlug,
        title: sessionTitle(f),
        kind: f.kind,
        cohort: f.cohort,
        teacherName: f.teacherName,
        startedAt: new Date(f.startedAt).toISOString(),
        durationMin: f.durationMin,
        attendanceTracked: f.attendanceTracked,
        enrolled: f.enrolled,
        attended: f.attended,
        present: count(f.recordingId, "present"),
        late: count(f.recordingId, "late"),
        leftEarly: count(f.recordingId, "left_early"),
        absent: count(f.recordingId, "absent"),
      })),
    });
  });

  app.get("/api/attendance/sessions/:id", staff, async (req, res) => {
    const db: any = await getDb();
    const user = req.user!;
    const [f] = await db.select().from(schema.sessionFacts).where(eq(schema.sessionFacts.recordingId, req.params.id));
    if (!f || f.demo || (!ALL.has(user.role) && f.teacherId !== user.id && f.hostId !== user.id)) return res.status(404).json({ error: "Class not found" });
    const learners = await db.select().from(schema.sessionLearners).where(eq(schema.sessionLearners.recordingId, f.recordingId));
    // Guardians on file, so staff can follow up an absence directly
    const ids = learners.map((l: any) => l.learnerId);
    const links = ids.length
      ? await db
          .select({ studentId: schema.guardians.studentId, name: schema.users.name, email: schema.users.email })
          .from(schema.guardians)
          .innerJoin(schema.users, eq(schema.users.id, schema.guardians.parentId))
          .where(inArray(schema.guardians.studentId, ids))
      : [];
    res.json({
      session: { recordingId: f.recordingId, title: sessionTitle(f), startedAt: new Date(f.startedAt).toISOString(), durationMin: f.durationMin, teacherName: f.teacherName, attendanceTracked: f.attendanceTracked, roomSlug: f.roomSlug },
      learners: learners
        .map((l: any) => ({
          learnerId: l.learnerId,
          name: l.name || "Learner",
          enrolled: l.enrolled,
          status: l.status,
          minutesPresent: l.minutesPresent,
          deviceType: l.deviceType,
          guardians: links.filter((g: any) => g.studentId === l.learnerId).map((g: any) => ({ name: g.name, email: g.email })),
        }))
        .sort((a: any, b: any) => ["absent", "late", "left_early", "present"].indexOf(a.status) - ["absent", "late", "left_early", "present"].indexOf(b.status) || a.name.localeCompare(b.name)),
    });
  });
}
