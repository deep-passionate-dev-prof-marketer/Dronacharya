/**
 * Library: documents and images teachers share with a class, with every class of a course, or
 * (admins) with the whole school. Learners see what's shared with their classes; parents see their
 * children's; staff see everything. Every download re-checks access.
 */
import crypto from "crypto";
import express from "express";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth, SessionUser } from "./auth/session";
import { learnerKeys } from "./classesHub";
import { canHost, parentRoom } from "./roomAccess";
import { cleanFileName, deleteFile, MAX_UPLOAD_BYTES, newStorageKey, putFile, sendStoredFile, sniffFileType, typeFromMime } from "./files";
import { createLimiter } from "./rateLimit";
import { auditInsert, persist } from "./db/kv";
import { roomsPresenting } from "./slidesState";

const STAFF = ["admin", "auditor", "instructor", "sales_rep"];
const uploadLimiter = createLimiter(30, 60 * 60_000);

/** Rooms, courses and grades a learner (or a parent's children) is enrolled in */
async function learnerScope(user: Pick<SessionUser, "id" | "role">) {
  const db: any = await getDb();
  const keys = await learnerKeys(user.id, user.role);
  if (!keys.length) return { rooms: [] as string[], courses: [] as Array<{ course: string; grade: number | null }> };
  const enr = await db.select().from(schema.classEnrollments).where(inArray(schema.classEnrollments.studentKey, keys));
  const ids = [...new Set(enr.map((e: any) => e.classId))] as string[];
  const classes = ids.length ? await db.select().from(schema.classes).where(inArray(schema.classes.id, ids)) : [];
  return {
    rooms: classes.map((c: any) => c.roomSlug as string),
    courses: classes.filter((c: any) => c.course).map((c: any) => ({ course: String(c.course), grade: c.gradeLevel ?? null })),
  };
}

export async function canSeeMaterial(user: Pick<SessionUser, "id" | "role">, m: any, scope?: Awaited<ReturnType<typeof learnerScope>>) {
  if (STAFF.includes(user.role) || m.uploadedBy === user.id) return true;
  if (!["student", "parent"].includes(user.role)) return false;
  if (!m.roomSlug && !m.course) return true; // school-wide
  const s = scope || (await learnerScope(user));
  if (m.roomSlug && s.rooms.includes(m.roomSlug)) return true;
  // A deck being presented in one of their classes
  if (roomsPresenting(m.id).some((r) => s.rooms.includes(r))) return true;
  if (m.course) return s.courses.some((c: { course: string; grade: number | null }) => c.course.toLowerCase() === String(m.course).toLowerCase() && (m.gradeLevel == null || c.grade == null || c.grade === m.gradeLevel));
  return false;
}

const publicMaterial = (m: any, me: SessionUser, classTitle?: string | null) => ({
  id: m.id,
  title: m.title,
  kind: m.kind,
  fileName: m.fileName,
  mime: m.mime,
  type: typeFromMime(m.mime)?.label || "File",
  size: m.size,
  roomSlug: m.roomSlug,
  classTitle: classTitle || null,
  course: m.course,
  gradeLevel: m.gradeLevel,
  uploadedBy: m.uploaderName ? { id: m.uploadedBy, name: m.uploaderName } : { id: m.uploadedBy },
  createdAt: m.createdAt,
  canDelete: me.role === "admin" || m.uploadedBy === me.id,
});

export function setupMaterialsRoutes(app: express.Express) {
  /** Upload: the raw file is the request body; details are query parameters (50 MB cap). */
  app.post(
    "/api/materials",
    requireAuth("instructor", "admin"),
    express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
    async (req, res) => {
      const user = req.user!;
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || !body.length) return res.status(400).json({ error: "Choose a file to upload." });
      const rawName = decodeURIComponent(String(req.get("x-file-name") || "file"));
      const type = sniffFileType(body, rawName);
      if (!type) return res.status(415).json({ error: "Only PDF, Word, PowerPoint, Excel and image files (PNG, JPG, GIF, WebP) can be shared." });
      if (!uploadLimiter.hit(user.id)) return res.status(429).json({ error: "You've uploaded a lot in the last hour. Try again later." });

      const roomSlug = req.query.roomSlug ? parentRoom(String(req.query.roomSlug).slice(0, 120)) : null;
      const course = req.query.course ? String(req.query.course).trim().slice(0, 120) : null;
      const grade = req.query.gradeLevel ? Number(req.query.gradeLevel) : null;
      const gradeLevel = grade && Number.isInteger(grade) && grade >= 1 && grade <= 12 ? grade : null;
      const kind = req.query.kind === "slides" ? "slides" : "file";
      if (kind === "slides" && type.ext !== "pdf") return res.status(415).json({ error: "Slides need to be a PDF (export your deck as PDF)." });
      if (roomSlug && !(await canHost(user, roomSlug))) return res.status(403).json({ error: "You can only share files with classes you teach." });
      if (!roomSlug && !course && user.role !== "admin") return res.status(400).json({ error: "Choose a class or a course to share with." });
      if (!roomSlug && course && user.role !== "admin") {
        const db: any = await getDb();
        const mine = await db.select({ course: schema.classes.course }).from(schema.classes).where(eq(schema.classes.teacherId, user.id));
        if (!mine.some((c: any) => String(c.course || "").toLowerCase() === course.toLowerCase())) return res.status(403).json({ error: "You can only share with courses you teach." });
      }

      const fileName = cleanFileName(rawName, type);
      const title = String(req.query.title || "").trim().slice(0, 160) || fileName.replace(/\.[^.]+$/, "");
      const storageKey = newStorageKey(kind === "slides" ? "slides" : "materials", type);
      try {
        await putFile(storageKey, body, type);
      } catch (err) {
        console.error("[materials] storage failed:", (err as Error).message);
        return res.status(502).json({ error: "Couldn't save the file to storage. Try again in a moment." });
      }
      const db: any = await getDb();
      const id = `mat-${crypto.randomUUID()}`;
      const [row] = await db
        .insert(schema.materials)
        .values({ id, title, kind, fileName, mime: type.mime, size: body.length, storageKey, roomSlug, course, gradeLevel, uploadedBy: user.id })
        .returning();
      persist("materials audit", auditInsert("materials", { id: `mt-${crypto.randomUUID()}`, at: new Date().toISOString(), type: "upload", roomSlug: roomSlug || undefined, userId: user.id, data: { materialId: id, fileName, size: body.length } }));
      res.json({ material: publicMaterial({ ...row, uploaderName: user.name }, user) });
    }
  );

  app.get("/api/materials", requireAuth(), async (req, res) => {
    const user = req.user!;
    const db: any = await getDb();
    const room = req.query.room ? parentRoom(String(req.query.room)) : null;
    const kind = req.query.kind === "slides" ? "slides" : req.query.kind === "file" ? "file" : null;
    const conds: any[] = [isNull(schema.materials.deletedAt)];
    if (kind) conds.push(eq(schema.materials.kind, kind));
    const rows = await db
      .select({ m: schema.materials, uploaderName: schema.users.name })
      .from(schema.materials)
      .leftJoin(schema.users, eq(schema.users.id, schema.materials.uploadedBy))
      .where(and(...conds))
      .orderBy(desc(schema.materials.createdAt))
      .limit(500);
    const scope = ["student", "parent"].includes(user.role) ? await learnerScope(user) : undefined;
    const visible = [];
    for (const r of rows) {
      const m = { ...r.m, uploaderName: r.uploaderName };
      if (room && m.roomSlug && m.roomSlug !== room) continue;
      if (await canSeeMaterial(user, m, scope)) visible.push(m);
    }
    const slugs = [...new Set(visible.map((m: any) => m.roomSlug).filter(Boolean))] as string[];
    const classes = slugs.length ? await db.select().from(schema.classes).where(inArray(schema.classes.roomSlug, slugs)) : [];
    const titleOf = (slug: string | null) => {
      const c = classes.find((x: any) => x.roomSlug === slug);
      return c ? (c.topic ? `${c.subject}: ${c.topic}` : c.subject) : null;
    };
    res.json({ materials: visible.map((m: any) => publicMaterial(m, user, titleOf(m.roomSlug))) });
  });

  /** Where this teacher can share: their classes and courses (admins: everything, plus school-wide) */
  app.get("/api/materials/targets", requireAuth("instructor", "admin"), async (req, res) => {
    const user = req.user!;
    const db: any = await getDb();
    const since = new Date(Date.now() - 60 * 864e5);
    const rows = user.role === "admin" ? await db.select().from(schema.classes) : await db.select().from(schema.classes).where(eq(schema.classes.teacherId, user.id));
    const classes = rows
      .filter((c: any) => !String(c.roomSlug).startsWith("demo-") && new Date(c.scheduledStart) >= since)
      .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
      .map((c: any) => ({ roomSlug: c.roomSlug, title: c.topic ? `${c.subject}: ${c.topic}` : c.subject, scheduledStart: c.scheduledStart, course: c.course, gradeLevel: c.gradeLevel }));
    const courses = [...new Map(rows.filter((c: any) => c.course).map((c: any) => [`${c.course}|${c.gradeLevel ?? ""}`, { course: c.course, gradeLevel: c.gradeLevel ?? null }])).values()];
    res.json({ classes, courses, schoolWide: user.role === "admin" });
  });

  app.get("/api/materials/:id/download", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const [m] = await db.select().from(schema.materials).where(and(eq(schema.materials.id, req.params.id), isNull(schema.materials.deletedAt)));
    if (!m || !(await canSeeMaterial(req.user!, m))) return res.status(404).json({ error: "File not found" });
    const type = typeFromMime(m.mime);
    sendStoredFile(res, { key: m.storageKey, fileName: m.fileName, mime: m.mime, inline: Boolean(type?.inline), forceDownload: req.query.download === "1" });
  });

  app.delete("/api/materials/:id", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const [m] = await db.select().from(schema.materials).where(and(eq(schema.materials.id, req.params.id), isNull(schema.materials.deletedAt)));
    if (!m) return res.status(404).json({ error: "File not found" });
    if (m.uploadedBy !== req.user!.id && req.user!.role !== "admin") return res.status(403).json({ error: "Only the person who shared it (or an admin) can remove it." });
    await db.update(schema.materials).set({ deletedAt: new Date() }).where(eq(schema.materials.id, m.id));
    await deleteFile(m.storageKey).catch(() => {});
    persist("materials audit", auditInsert("materials", { id: `mt-${crypto.randomUUID()}`, at: new Date().toISOString(), type: "delete", roomSlug: m.roomSlug || undefined, userId: req.user!.id, data: { materialId: m.id } }));
    res.json({ ok: true });
  });
}
