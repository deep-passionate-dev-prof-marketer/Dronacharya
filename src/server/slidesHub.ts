/**
 * Shared slides and the teacher's class notes pad.
 *
 * Slides: the host picks a PDF deck from the library (or uploads one) and turns pages; everyone
 * follows (late joiners land on the current page). The state is kept per room and survives restarts.
 * Notes pad: the host writes, everyone reads live; one pad per class session (a draft before the
 * class starts carries into the class), stored with the recording.
 */
import express from "express";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";
import { canAccessRoom, canHost, parentRoom } from "./roomAccess";
import { send } from "./roomControlHub";
import { sessionFor } from "./classSessionHub";
import { canSeeMaterial } from "./materialsHub";
import { getSlides, setSlides, clearSlides, slidesLoaded, SlidesState } from "./slidesState";
import { createLimiter } from "./rateLimit";

const PAD_MAX = 20_000;
const padLimiter = createLimiter(120, 60_000);

const hostOnly: express.RequestHandler = async (req, res, next) => {
  if (!(await canHost(req.user!, req.params.slug))) return res.status(403).json({ error: "Only the class host can do this." });
  next();
};
const member: express.RequestHandler = async (req, res, next) => {
  if (req.user!.role === "parent" || !(await canAccessRoom(req.user!, req.params.slug))) return res.status(404).json({ error: "Class not found" });
  next();
};

/** The pad for the current class session ("draft" before it starts); a draft moves into the class when it starts */
async function padKey(roomSlug: string) {
  const s = sessionFor(roomSlug);
  return s.status === "in_progress" && s.recordingId ? s.recordingId : "draft";
}

async function readPad(roomSlug: string) {
  const db: any = await getDb();
  const key = await padKey(roomSlug);
  let [row] = await db.select().from(schema.classPads).where(and(eq(schema.classPads.roomSlug, roomSlug), eq(schema.classPads.sessionKey, key)));
  if (!row && key !== "draft") {
    const [draft] = await db.select().from(schema.classPads).where(and(eq(schema.classPads.roomSlug, roomSlug), eq(schema.classPads.sessionKey, "draft")));
    if (draft?.content) {
      [row] = await db
        .insert(schema.classPads)
        .values({ roomSlug, sessionKey: key, content: draft.content, updatedBy: draft.updatedBy })
        .onConflictDoNothing()
        .returning();
      await db.delete(schema.classPads).where(eq(schema.classPads.id, draft.id));
    }
  }
  return { sessionKey: key, content: row?.content || "", updatedAt: row?.updatedAt || null };
}

export function setupSlidesRoutes(app: express.Express) {
  slidesLoaded().catch(() => {});

  app.get("/api/rooms/:slug/slides", requireAuth(), member, async (req, res) => {
    res.json({ slides: await getSlides(parentRoom(req.params.slug)) });
  });

  app.put("/api/rooms/:slug/slides", requireAuth(), hostOnly, async (req, res) => {
    const room = parentRoom(req.params.slug);
    const cur = await getSlides(room);
    const db: any = await getDb();
    let next: SlidesState;
    if (req.body?.materialId && req.body.materialId !== cur?.materialId) {
      const [m] = await db.select().from(schema.materials).where(eq(schema.materials.id, String(req.body.materialId)));
      if (!m || m.deletedAt || m.kind !== "slides" || !(await canSeeMaterial(req.user!, m))) return res.status(404).json({ error: "Slide deck not found" });
      next = { roomSlug: room, materialId: m.id, title: m.title, page: 1, pageCount: null, onStage: true, updatedAt: new Date().toISOString(), by: req.user!.id };
    } else if (cur) {
      next = { ...cur, updatedAt: new Date().toISOString(), by: req.user!.id };
    } else {
      return res.status(400).json({ error: "Choose a slide deck first." });
    }
    const pageCount = Number(req.body?.pageCount);
    if (Number.isInteger(pageCount) && pageCount > 0 && pageCount < 2000) next.pageCount = pageCount;
    const page = Number(req.body?.page);
    if (Number.isInteger(page)) next.page = Math.max(1, next.pageCount ? Math.min(page, next.pageCount) : page);
    if (typeof req.body?.onStage === "boolean") next.onStage = req.body.onStage;
    setSlides(next);
    await send(room, "slides", next);
    res.json({ slides: next });
  });

  app.delete("/api/rooms/:slug/slides", requireAuth(), hostOnly, async (req, res) => {
    const room = parentRoom(req.params.slug);
    clearSlides(room);
    await send(room, "slides", null);
    res.json({ slides: null });
  });

  app.get("/api/rooms/:slug/pad", requireAuth(), member, async (req, res) => {
    res.json({ pad: await readPad(parentRoom(req.params.slug)) });
  });

  app.put("/api/rooms/:slug/pad", requireAuth(), hostOnly, async (req, res) => {
    const room = parentRoom(req.params.slug);
    const content = String(req.body?.content ?? "");
    if (content.length > PAD_MAX) return res.status(413).json({ error: "The notes pad is full (20,000 characters)." });
    if (!padLimiter.hit(req.user!.id)) return res.status(429).json({ error: "Saving too often." });
    const db: any = await getDb();
    const { sessionKey } = await readPad(room);
    const [row] = await db
      .insert(schema.classPads)
      .values({ roomSlug: room, sessionKey, content, updatedBy: req.user!.id, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.classPads.roomSlug, schema.classPads.sessionKey], set: { content, updatedBy: req.user!.id, updatedAt: new Date() } })
      .returning();
    // A small "changed" signal; viewers fetch the text (it can be larger than a data message)
    await send(room, "pad", { updatedAt: row.updatedAt, length: content.length });
    res.json({ pad: { sessionKey, content: row.content, updatedAt: row.updatedAt } });
  });
}
