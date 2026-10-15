/**
 * People (admin): add, edit, disable and link the school's accounts. This is how real staff,
 * learners and parents get into a production database. Every change is audited ("admin" stream).
 */
import crypto from "crypto";
import express from "express";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth, revokeUserSessions } from "./auth/session";
import { hashPassword, temporaryPassword } from "./auth/password";
import { auditInsert, persist } from "./db/kv";
import { validTimezone } from "./analytics/geo";
import { LANG_TAG_RE } from "../routing/appRoutes";

const ROLES = ["admin", "instructor", "sales_rep", "auditor", "student", "parent"] as const;
type Role = (typeof ROLES)[number];
const COLORS: Record<Role, string> = { admin: "#DC2626", instructor: "#003872", sales_rep: "#059669", auditor: "#7C3AED", student: "#0082FF", parent: "#F59E0B" };
const PREFIX: Record<Role, string> = { admin: "adm", instructor: "tch", sales_rep: "sales", auditor: "aud", student: "stu", parent: "par" };

export interface PersonInput {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  gradeLevel?: unknown;
  studentCode?: unknown;
  country?: unknown;
  timezone?: unknown;
  languageTag?: unknown;
}

/** Validates and normalises person fields. Returns the clean values or the first problem. */
export function cleanPerson(input: PersonInput, partial = false): { ok: true; value: Record<string, any> } | { ok: false; error: string } {
  const v: Record<string, any> = {};
  if (input.name !== undefined || !partial) {
    const name = String(input.name || "").trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 120) return { ok: false, error: "Enter a name (2–120 characters)." };
    v.name = name;
  }
  if (input.email !== undefined || !partial) {
    const email = String(input.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { ok: false, error: "Enter a valid email address." };
    v.email = email;
  }
  if (input.role !== undefined || !partial) {
    if (!ROLES.includes(input.role as Role)) return { ok: false, error: "Choose a role." };
    v.role = input.role;
  }
  if (input.gradeLevel !== undefined) {
    if (input.gradeLevel === null || input.gradeLevel === "") v.gradeLevel = null;
    else {
      const g = Number(input.gradeLevel);
      if (!Number.isInteger(g) || g < 1 || g > 12) return { ok: false, error: "Grade must be 1–12." };
      v.gradeLevel = g;
    }
  }
  if (input.studentCode !== undefined) {
    if (input.studentCode === null || input.studentCode === "") v.studentCode = null;
    else {
      const code = String(input.studentCode).trim().toUpperCase();
      if (!/^[A-Z0-9]{4,16}$/.test(code)) return { ok: false, error: "Student code: 4–16 letters and digits." };
      v.studentCode = code;
    }
  }
  if (input.country !== undefined) {
    if (input.country === null || input.country === "") v.country = null;
    else {
      const c = String(input.country).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(c)) return { ok: false, error: "Country must be a 3-letter code (e.g. IND, ARE, GBR)." };
      v.country = c;
    }
  }
  if (input.timezone !== undefined) {
    if (input.timezone === null || input.timezone === "") v.timezone = null;
    else {
      const tz = validTimezone(input.timezone);
      if (!tz) return { ok: false, error: "Unknown timezone." };
      v.timezone = tz;
    }
  }
  if (input.languageTag !== undefined) {
    if (input.languageTag === null || input.languageTag === "") v.languageTag = null;
    else {
      const t = String(input.languageTag).trim();
      if (!LANG_TAG_RE.test(t)) return { ok: false, error: "Language must look like en-IN or hi." };
      v.languageTag = t;
    }
  }
  return { ok: true, value: v };
}

/** Never send password hashes to the browser */
const publicPerson = ({ passwordHash, ...u }: any) => ({ ...u, hasPassword: Boolean(passwordHash) });

const audit = (actorId: string, type: string, data: Record<string, unknown>) =>
  persist("people audit", auditInsert("admin", { id: `adm-${crypto.randomUUID()}`, at: new Date().toISOString(), type, userId: actorId, data }));

async function adminCount(db: any) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(and(eq(schema.users.role, "admin"), eq(schema.users.disabled, false)));
  return Number(n);
}

const uniqueError = (err: any) => {
  const msg = String(err?.message || err?.cause?.message || "");
  if (/users_email|email/i.test(msg)) return "Someone already has that email address.";
  if (/student_code/i.test(msg)) return "That student code is already taken.";
  return null;
};

export function setupPeopleRoutes(app: express.Express) {
  const admin = requireAuth("admin");

  app.get("/api/admin/users", admin, async (req, res) => {
    const db: any = await getDb();
    const q = String(req.query.q || "").trim().slice(0, 80);
    const role = String(req.query.role || "");
    const conds: any[] = [];
    if (q) conds.push(or(ilike(schema.users.name, `%${q}%`), ilike(schema.users.email, `%${q}%`), ilike(schema.users.studentCode, `%${q}%`)));
    if (ROLES.includes(role as Role)) conds.push(eq(schema.users.role, role));
    // Demo analytics learners and counsellors never appear here
    conds.push(sql`${schema.users.id} not like 'demo-%'`);
    const rows = await db.select().from(schema.users).where(and(...conds)).orderBy(asc(schema.users.name)).limit(500);
    const ids = rows.map((r: any) => r.id);
    const links = ids.length
      ? await db.select().from(schema.guardians).where(or(inArray(schema.guardians.parentId, ids), inArray(schema.guardians.studentId, ids)))
      : [];
    res.json({
      users: rows.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        gradeLevel: u.gradeLevel,
        studentCode: u.studentCode,
        country: u.country,
        timezone: u.timezone,
        languageTag: u.languageTag,
        disabled: u.disabled,
        hasPassword: Boolean(u.passwordHash),
        mustChangePassword: u.mustChangePassword,
        createdAt: u.createdAt,
        children: links.filter((l: any) => l.parentId === u.id).map((l: any) => l.studentId),
        parents: links.filter((l: any) => l.studentId === u.id).map((l: any) => l.parentId),
      })),
    });
  });

  app.post("/api/admin/users", admin, async (req, res) => {
    const clean = cleanPerson(req.body || {});
    if (!clean.ok) return res.status(400).json({ error: clean.error });
    const v = clean.value;
    if (v.role === "student" && !v.studentCode) v.studentCode = `${v.gradeLevel ? String(v.gradeLevel).padStart(2, "0") : "00"}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const id = v.role === "student" ? `stu-${v.studentCode}` : `${PREFIX[v.role as Role]}-${crypto.randomBytes(5).toString("hex")}`;
    const db: any = await getDb();
    // Every new account gets a temporary password (shown to the admin once); they choose their own at first sign-in
    const temporary = temporaryPassword();
    try {
      const [row] = await db
        .insert(schema.users)
        .values({ id, avatarColor: COLORS[v.role as Role], ...v, passwordHash: await hashPassword(temporary), mustChangePassword: true, passwordUpdatedAt: new Date() })
        .returning();
      audit(req.user!.id, "user_created", { id, role: v.role, email: v.email });
      res.json({ user: publicPerson(row), temporaryPassword: temporary });
    } catch (err) {
      const msg = uniqueError(err);
      if (msg) return res.status(409).json({ error: msg });
      throw err;
    }
  });

  app.patch("/api/admin/users/:id", admin, async (req, res) => {
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, req.params.id));
    if (!u) return res.status(404).json({ error: "Person not found" });
    const clean = cleanPerson(req.body || {}, true);
    if (!clean.ok) return res.status(400).json({ error: clean.error });
    const v = clean.value;
    const disabling = req.body?.disabled === true;
    if (req.body?.disabled !== undefined) v.disabled = Boolean(req.body.disabled);
    // Never lock the school out: an admin can't demote or disable themselves, and the last admin stays
    const losingAdmin = u.role === "admin" && ((v.role && v.role !== "admin") || disabling);
    if (losingAdmin && u.id === req.user!.id) return res.status(400).json({ error: "You can't remove your own admin access." });
    if (losingAdmin && (await adminCount(db)) <= 1) return res.status(400).json({ error: "This is the only admin. Add another admin first." });
    try {
      const [row] = await db.update(schema.users).set(v).where(eq(schema.users.id, u.id)).returning();
      const out = publicPerson(row);
      if (disabling || (v.role && v.role !== u.role)) {
        await revokeUserSessions(u.id);
        await db.update(schema.inviteTokens).set({ revokedAt: new Date() }).where(eq(schema.inviteTokens.userId, u.id));
      }
      audit(req.user!.id, disabling ? "user_disabled" : "user_updated", { id: u.id, changes: Object.keys(v) });
      res.json({ user: out });
    } catch (err) {
      const msg = uniqueError(err);
      if (msg) return res.status(409).json({ error: msg });
      throw err;
    }
  });

  /** New temporary password (shown once); the person must choose their own at next sign-in. Signs them out everywhere. */
  app.post("/api/admin/users/:id/password", admin, async (req, res) => {
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, req.params.id));
    if (!u) return res.status(404).json({ error: "Person not found" });
    const temporary = temporaryPassword();
    await db.update(schema.users).set({ passwordHash: await hashPassword(temporary), mustChangePassword: true, passwordUpdatedAt: new Date() }).where(eq(schema.users.id, u.id));
    await revokeUserSessions(u.id);
    audit(req.user!.id, "password_reset", { id: u.id });
    res.json({ temporaryPassword: temporary });
  });

  app.post("/api/admin/guardians", admin, async (req, res) => {
    const db: any = await getDb();
    const parentId = String(req.body?.parentId || "");
    const studentId = String(req.body?.studentId || "");
    const people = parentId && studentId ? await db.select().from(schema.users).where(inArray(schema.users.id, [parentId, studentId])) : [];
    const parent = people.find((p: any) => p.id === parentId);
    const student = people.find((p: any) => p.id === studentId);
    if (parent?.role !== "parent" || student?.role !== "student") return res.status(400).json({ error: "Link a parent account to a learner account." });
    await db.insert(schema.guardians).values({ parentId, studentId, relation: String(req.body?.relation || "parent").slice(0, 30) }).onConflictDoNothing();
    audit(req.user!.id, "guardian_linked", { parentId, studentId });
    res.json({ ok: true });
  });

  app.delete("/api/admin/guardians", admin, async (req, res) => {
    const db: any = await getDb();
    const parentId = String(req.body?.parentId || req.query.parentId || "");
    const studentId = String(req.body?.studentId || req.query.studentId || "");
    await db.delete(schema.guardians).where(and(eq(schema.guardians.parentId, parentId), eq(schema.guardians.studentId, studentId)));
    audit(req.user!.id, "guardian_unlinked", { parentId, studentId });
    res.json({ ok: true });
  });

  /** Classes a learner is enrolled in, for "copy invite link" */
  app.get("/api/admin/users/:id/classes", admin, async (req, res) => {
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, req.params.id));
    if (!u) return res.status(404).json({ error: "Person not found" });
    let keys = [u.id, u.studentCode].filter(Boolean);
    if (u.role === "parent") {
      const kids = await db.select({ id: schema.users.id, code: schema.users.studentCode }).from(schema.guardians).innerJoin(schema.users, eq(schema.users.id, schema.guardians.studentId)).where(eq(schema.guardians.parentId, u.id));
      keys = kids.flatMap((k: any) => [k.id, k.code]).filter(Boolean);
    }
    const enr = keys.length ? await db.select().from(schema.classEnrollments).where(inArray(schema.classEnrollments.studentKey, keys)) : [];
    const ids = [...new Set(enr.map((e: any) => e.classId))] as string[];
    const classes = ids.length ? await db.select().from(schema.classes).where(inArray(schema.classes.id, ids)) : [];
    res.json({
      classes: classes
        .filter((c: any) => !String(c.roomSlug).startsWith("demo-"))
        .map((c: any) => ({ id: c.id, roomSlug: c.roomSlug, kind: c.kind, subject: c.subject, topic: c.topic, scheduledStart: c.scheduledStart })),
    });
  });
}
