/**
 * Class information for on-screen labels and schedules.
 * Visibility: staff see any class; learners only classes they're enrolled in; parents only their
 * children's classes.
 */
import express from "express";
import { and, eq, gte, inArray, notLike, or } from "drizzle-orm";
import { DEMO_PREFIX } from "./analytics/demo";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";

export const STAFF = ["admin", "instructor", "sales_rep", "auditor"];

export async function learnerKeys(userId: string, role: string): Promise<string[]> {
  const db: any = await getDb();
  if (role === "student") {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    return [userId, u?.studentCode].filter(Boolean) as string[];
  }
  if (role === "parent") {
    const kids = await db
      .select({ id: schema.users.id, code: schema.users.studentCode })
      .from(schema.guardians)
      .innerJoin(schema.users, eq(schema.users.id, schema.guardians.studentId))
      .where(eq(schema.guardians.parentId, userId));
    return kids.flatMap((k: any) => [k.id, k.code]).filter(Boolean);
  }
  return [];
}

export async function classByRoom(roomSlug: string) {
  const db: any = await getDb();
  const [row] = await db
    .select({ c: schema.classes, teacherName: schema.users.name })
    .from(schema.classes)
    .leftJoin(schema.users, eq(schema.users.id, schema.classes.teacherId))
    .where(eq(schema.classes.roomSlug, roomSlug));
  if (!row) return null;
  const enr = await db.select().from(schema.classEnrollments).where(eq(schema.classEnrollments.classId, row.c.id));
  return { ...row.c, scheduledStart: new Date(row.c.scheduledStart).toISOString(), teacherName: row.teacherName, studentKeys: enr.map((e: any) => e.studentKey) };
}

export function setupClassRoutes(app: express.Express) {
  app.get("/api/classes/by-room/:slug", requireAuth(), async (req, res) => {
    const cls = await classByRoom(req.params.slug);
    if (!cls) return res.status(404).json({ error: "No scheduled class for this room" });
    const user = req.user!;
    if (!STAFF.includes(user.role)) {
      const keys = (await learnerKeys(user.id, user.role)).map((k) => k.toLowerCase());
      if (!cls.studentKeys.some((k: string) => keys.includes(k.toLowerCase()))) return res.status(404).json({ error: "No scheduled class for this room" });
    }
    const { studentKeys, ...info } = cls;
    res.json({ class: { ...info, enrolledCount: studentKeys.length } });
  });

  /** Upcoming and recent classes for the signed-in person (teacher: theirs; learner/parent: enrolled). */
  app.get("/api/classes/mine", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const user = req.user!;
    const since = new Date(Date.now() - 14 * 864e5);
    let rows: any[];
    if (user.role === "instructor") {
      rows = await db.select().from(schema.classes).where(and(eq(schema.classes.teacherId, user.id), gte(schema.classes.scheduledStart, since), notLike(schema.classes.roomSlug, `${DEMO_PREFIX}%`)));
    } else if (STAFF.includes(user.role)) {
      rows = await db.select().from(schema.classes).where(and(gte(schema.classes.scheduledStart, since), notLike(schema.classes.roomSlug, `${DEMO_PREFIX}%`)));
    } else {
      const keys = await learnerKeys(user.id, user.role);
      if (!keys.length) return res.json({ classes: [] });
      const enr = await db.select().from(schema.classEnrollments).where(inArray(schema.classEnrollments.studentKey, keys));
      const ids = [...new Set(enr.map((e: any) => e.classId))] as string[];
      rows = ids.length ? await db.select().from(schema.classes).where(inArray(schema.classes.id, ids)) : [];
    }
    rows.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    const teacherIds = [...new Set(rows.map((c) => c.teacherId).filter(Boolean))] as string[];
    const teachers = teacherIds.length ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, teacherIds)) : [];
    const nameOf = new Map(teachers.map((t: any) => [t.id, t.name]));
    // Staff see who's booked into each class (for sign-in links); learners and parents don't get class lists
    let learnersOf = new Map<string, Array<{ id: string; name: string }>>();
    if (STAFF.includes(user.role) && rows.length) {
      const enr = await db.select().from(schema.classEnrollments).where(inArray(schema.classEnrollments.classId, rows.map((c) => c.id)));
      const keys = [...new Set(enr.map((e: any) => String(e.studentKey)))] as string[];
      const people = keys.length
        ? await db
            .select({ id: schema.users.id, name: schema.users.name, code: schema.users.studentCode })
            .from(schema.users)
            .where(or(inArray(schema.users.id, keys), inArray(schema.users.studentCode, keys)))
        : [];
      const byKey = new Map<string, { id: string; name: string }>();
      for (const p of people as any[]) {
        byKey.set(p.id, { id: p.id, name: p.name });
        if (p.code) byKey.set(p.code, { id: p.id, name: p.name });
      }
      for (const e of enr as any[]) {
        const who = byKey.get(String(e.studentKey));
        if (!who) continue;
        const list = learnersOf.get(e.classId) || [];
        if (!list.some((x) => x.id === who.id)) list.push(who);
        learnersOf.set(e.classId, list);
      }
    }
    res.json({
      classes: rows.map((c) => ({
        ...c,
        teacherName: nameOf.get(c.teacherId) || null,
        scheduledStart: new Date(c.scheduledStart).toISOString(),
        learners: STAFF.includes(user.role) ? learnersOf.get(c.id) || [] : undefined,
      })),
    });
  });
}
