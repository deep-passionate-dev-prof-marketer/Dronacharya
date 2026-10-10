/**
 * Class information for on-screen labels and schedules.
 * Visibility: staff see any class; learners only classes they're enrolled in; parents only their
 * children's classes.
 */
import express from "express";
import { and, eq, gte, inArray, notLike } from "drizzle-orm";
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
    res.json({ classes: rows.map((c) => ({ ...c, scheduledStart: new Date(c.scheduledStart).toISOString() })) });
  });
}
