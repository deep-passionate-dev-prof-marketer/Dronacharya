/**
 * Teacher in-class controls, on the school's own media server:
 *  - waiting room: learners join without publish/subscribe rights until a host admits them;
 *  - mute / stop video / remove a participant;
 *  - quick polls (stored in Postgres, one vote per person, live results pushed to the room).
 * Hosts: the class's own teacher, admins, and staff on demo/admission/counselling sessions.
 */
import crypto from "crypto";
import express from "express";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth, SessionUser } from "./auth/session";
import { mediaAdmit, mediaEnabled, mediaMute, mediaRemove, mediaSend } from "./media/mediaServer";
import { classByRoom } from "./classesHub";
import { auditInsert, persist } from "./db/kv";

// Who's been let in from the waiting room (shared with the media server)
export { admittedByRoom, admittedLoaded, saveAdmitted, clearAdmitted } from "./admission";
import { admittedByRoom, admittedLoaded, saveAdmitted } from "./admission";

// Host rules live in roomAccess.ts (shared with tokens, sockets, invites and breakouts)
export { canHost } from "./roomAccess";
import { canAccessRoom, canHost } from "./roomAccess";

const hostOnly: express.RequestHandler = async (req, res, next) => {
  if (!(await canHost(req.user!, req.params.slug))) return res.status(403).json({ error: "Only the class host can do this." });
  next();
};
/** Muting someone else's track needs the media server (direct peer-to-peer mode can't force it). */
const needsMedia: express.RequestHandler = (_req, res, next) => {
  if (!mediaEnabled()) return res.status(503).json({ error: "This needs the school's media server, which isn't running." });
  next();
};

const log = (req: express.Request, type: string, detail: Record<string, unknown>) =>
  persist(
    "room control",
    auditInsert("room_control", {
      id: `rc-${crypto.randomUUID()}`,
      at: new Date().toISOString(),
      type,
      roomSlug: req.params.slug,
      userId: req.user!.id,
      data: { by: { id: req.user!.id, name: req.user!.name, role: req.user!.role }, ...detail },
    })
  );

/**
 * Other ways a server message reaches a room (the realtime WebSocket registers here), so class state
 * still arrives when a participant isn't on the media server, or joined just after a send.
 */
type RoomListener = (roomSlug: string, topic: string, payload: unknown, toIdentities?: string[]) => void;
export const roomListeners = new Set<RoomListener>();
/** How many people are in a room over the realtime socket (registered by the realtime hub) */
export const presenceProbes = new Set<(roomSlug: string) => number>();

/**
 * Server-originated message to a class (clients trust only these for class state): over the media
 * server's connection and the realtime WebSocket, to the class room and its breakout groups.
 */
export async function send(roomSlug: string, topic: string, payload: unknown, toIdentities?: string[]) {
  for (const fn of roomListeners) {
    try {
      fn(roomSlug, topic, payload, toIdentities);
    } catch {}
  }
  mediaSend(roomSlug, topic, payload, toIdentities);
}

async function tally(pollId: string) {
  const db: any = await getDb();
  const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, pollId));
  if (!poll) return null;
  const votes = await db.select().from(schema.pollVotes).where(eq(schema.pollVotes.pollId, pollId));
  const counts = (poll.options as string[]).map((_: string, i: number) => votes.filter((v: any) => v.optionIndex === i).length);
  return { id: poll.id, roomSlug: poll.roomSlug, question: poll.question, options: poll.options, counts, total: votes.length, closed: Boolean(poll.closedAt) };
}

export function setupRoomControlRoutes(app: express.Express) {
  admittedLoaded();
  // ---------------- waiting room ----------------
  app.post("/api/rooms/:slug/admit", requireAuth(), hostOnly, async (req, res) => {
    const ids: string[] = (Array.isArray(req.body?.identities) ? req.body.identities.map(String) : [String(req.body?.identity || "")]).filter(Boolean).slice(0, 100);
    // Remembered first, so a learner who reconnects (or isn't connected yet) is let straight in
    if (!admittedByRoom.has(req.params.slug)) admittedByRoom.set(req.params.slug, new Set());
    for (const identity of ids) admittedByRoom.get(req.params.slug)!.add(identity);
    saveAdmitted(req.params.slug);
    const reached = mediaAdmit(req.params.slug, ids);
    // Also told over the class socket (direct mode, or someone whose video is reconnecting)
    await send(req.params.slug, "admitted", { identities: ids }, ids);
    log(req, "admit", { identities: ids, connected: reached });
    res.json({ admitted: ids, failed: [] });
  });

  app.post("/api/rooms/:slug/deny", requireAuth(), hostOnly, async (req, res) => {
    const identity = String(req.body?.identity || "");
    await send(req.params.slug, "removed", { identity, reason: "denied" }, [identity]);
    mediaRemove(req.params.slug, identity, "denied");
    log(req, "deny", { identity });
    res.json({ ok: true });
  });

  // ---------------- mute / stop video / remove ----------------
  // The slug is the video room the person is in (a breakout group while the host visits one)
  app.post("/api/rooms/:slug/mute", requireAuth(), hostOnly, needsMedia, async (req, res) => {
    const identity = String(req.body?.identity || "");
    const kind = req.body?.kind === "video" ? "video" : "audio";
    const muted = await mediaMute(req.params.slug, identity, kind);
    if (muted < 0) return res.status(404).json({ error: "They're not in this room right now." });
    log(req, kind === "audio" ? "mute" : "stop_video", { identity });
    res.json({ muted });
  });

  app.post("/api/rooms/:slug/remove", requireAuth(), hostOnly, async (req, res) => {
    const identity = String(req.body?.identity || "");
    admittedByRoom.get(req.params.slug)?.delete(identity);
    saveAdmitted(req.params.slug);
    await send(req.params.slug, "removed", { identity, reason: "removed" }, [identity]);
    mediaRemove(req.params.slug, identity, "removed");
    log(req, "remove", { identity, reason: req.body?.reason ? String(req.body.reason).slice(0, 200) : undefined });
    res.json({ ok: true });
  });

  // ---------------- quick polls ----------------
  app.post("/api/rooms/:slug/polls", requireAuth(), hostOnly, async (req, res) => {
    const question = String(req.body?.question || "").trim().slice(0, 200);
    const options: string[] = Array.isArray(req.body?.options) ? req.body.options.map((o: any) => String(o).trim().slice(0, 80)).filter(Boolean).slice(0, 6) : [];
    if (!question || options.length < 2) return res.status(400).json({ error: "A question and at least two options are needed." });
    const db: any = await getDb();
    const id = `poll-${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(schema.polls).values({ id, roomSlug: req.params.slug, question, options, createdBy: req.user!.id });
    const result = await tally(id);
    await send(req.params.slug, "poll", result);
    log(req, "poll_start", { pollId: id, question });
    res.json({ poll: result });
  });

  app.post("/api/polls/:id/vote", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, req.params.id));
    if (!poll || !(await canAccessRoom(req.user!, poll.roomSlug))) return res.status(404).json({ error: "Poll not found" });
    if (poll.closedAt) return res.status(409).json({ error: "This poll has closed." });
    const optionIndex = Number(req.body?.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (poll.options as string[]).length) return res.status(400).json({ error: "Invalid option" });
    // One vote per person; voting again changes the answer
    await db
      .insert(schema.pollVotes)
      .values({ pollId: poll.id, userId: req.user!.id, optionIndex })
      .onConflictDoUpdate({ target: [schema.pollVotes.pollId, schema.pollVotes.userId], set: { optionIndex, at: new Date() } });
    const result = await tally(poll.id);
    await send(poll.roomSlug, "poll_results", result);
    res.json({ poll: result, myVote: optionIndex });
  });

  app.post("/api/polls/:id/close", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, req.params.id));
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (!(await canHost(req.user!, poll.roomSlug))) return res.status(403).json({ error: "Only the class host can close polls." });
    await db.update(schema.polls).set({ closedAt: new Date() }).where(and(eq(schema.polls.id, poll.id)));
    const result = await tally(poll.id);
    await send(poll.roomSlug, "poll_results", result);
    res.json({ poll: result });
  });

  app.get("/api/polls/:id", requireAuth(), async (req, res) => {
    const result = await tally(req.params.id);
    if (!result || !(await canAccessRoom(req.user!, result.roomSlug))) return res.status(404).json({ error: "Poll not found" });
    res.json({ poll: result });
  });
}
