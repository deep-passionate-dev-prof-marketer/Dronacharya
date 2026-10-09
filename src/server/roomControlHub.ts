/**
 * Teacher in-class controls on top of LiveKit's server API:
 *  - waiting room: learners join without publish/subscribe rights until a host admits them;
 *  - mute / stop video / remove a participant;
 *  - quick polls (stored in Postgres, one vote per person, live results pushed to the room).
 * Hosts: the class's own teacher, admins, and staff on demo/admission/counselling sessions.
 */
import crypto from "crypto";
import express from "express";
import { RoomServiceClient, DataPacket_Kind, TrackSource } from "livekit-server-sdk";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth, SessionUser } from "./auth/session";
import { livekitConfig } from "./livekitHub";
import { classByRoom } from "./classesHub";
import { auditInsert, persist } from "./db/kv";

/** Identities admitted in each room for this class session (rejoin after refresh skips the lobby). */
export const admittedByRoom = new Map<string, Set<string>>();

let roomService: RoomServiceClient | null = null;
function rooms(): RoomServiceClient | null {
  const cfg = livekitConfig();
  if (!cfg) return null;
  if (!roomService) roomService = new RoomServiceClient(cfg.url.replace(/^ws/, "http"), cfg.apiKey, cfg.apiSecret);
  return roomService;
}

export async function canHost(user: SessionUser, roomSlug: string): Promise<boolean> {
  if (user.role === "admin") return true;
  if (!["instructor", "sales_rep"].includes(user.role)) return false;
  const cls = await classByRoom(roomSlug);
  if (!cls) return true; // ad-hoc room: any teacher/counsellor present can host
  if (cls.teacherId === user.id) return true;
  return user.role === "sales_rep" && cls.kind !== "enrolled" && cls.kind !== "doubt_clearing";
}

const hostOnly: express.RequestHandler = async (req, res, next) => {
  if (!(await canHost(req.user!, req.params.slug))) return res.status(403).json({ error: "Only the class host can do this." });
  if (!rooms()) return res.status(503).json({ error: "Live video service is not configured." });
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

async function send(roomSlug: string, topic: string, payload: unknown) {
  const svc = rooms();
  if (!svc) return;
  const data = new TextEncoder().encode(JSON.stringify({ topic, payload, from: "server" }));
  await svc.sendData(roomSlug, data, DataPacket_Kind.RELIABLE, { topic }).catch((e) => console.warn("[rooms] sendData failed", e?.message));
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
  // ---------------- waiting room ----------------
  app.post("/api/rooms/:slug/admit", requireAuth(), hostOnly, async (req, res) => {
    const ids: string[] = Array.isArray(req.body?.identities) ? req.body.identities.map(String) : [String(req.body?.identity || "")];
    const svc = rooms()!;
    const admitted: string[] = [];
    for (const identity of ids.filter(Boolean)) {
      try {
        const p = await svc.getParticipant(req.params.slug, identity);
        const meta = { ...(p.metadata ? JSON.parse(p.metadata) : {}), waiting: false };
        await svc.updateParticipant(req.params.slug, identity, {
          metadata: JSON.stringify(meta),
          permission: {
            canSubscribe: true,
            canPublish: true,
            canPublishData: true,
            canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE],
          },
        });
        if (!admittedByRoom.has(req.params.slug)) admittedByRoom.set(req.params.slug, new Set());
        admittedByRoom.get(req.params.slug)!.add(identity);
        admitted.push(identity);
      } catch (e: any) {
        console.warn("[rooms] admit failed", identity, e?.message);
      }
    }
    log(req, "admit", { identities: admitted });
    res.json({ admitted });
  });

  app.post("/api/rooms/:slug/deny", requireAuth(), hostOnly, async (req, res) => {
    const identity = String(req.body?.identity || "");
    await rooms()!.removeParticipant(req.params.slug, identity).catch(() => {});
    log(req, "deny", { identity });
    res.json({ ok: true });
  });

  // ---------------- mute / stop video / remove ----------------
  app.post("/api/rooms/:slug/mute", requireAuth(), hostOnly, async (req, res) => {
    const identity = String(req.body?.identity || "");
    const kind = req.body?.kind === "video" ? "video" : "audio";
    const svc = rooms()!;
    try {
      const p = await svc.getParticipant(req.params.slug, identity);
      const wanted = kind === "audio" ? TrackSource.MICROPHONE : TrackSource.CAMERA;
      const tracks = p.tracks.filter((t) => t.source === wanted);
      for (const t of tracks) await svc.mutePublishedTrack(req.params.slug, identity, t.sid, true);
      log(req, kind === "audio" ? "mute" : "stop_video", { identity });
      res.json({ muted: tracks.length });
    } catch (e: any) {
      res.status(404).json({ error: "Participant not found" });
    }
  });

  app.post("/api/rooms/:slug/remove", requireAuth(), hostOnly, async (req, res) => {
    const identity = String(req.body?.identity || "");
    admittedByRoom.get(req.params.slug)?.delete(identity);
    await rooms()!.removeParticipant(req.params.slug, identity).catch(() => {});
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
    if (!poll) return res.status(404).json({ error: "Poll not found" });
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
    if (!result) return res.status(404).json({ error: "Poll not found" });
    res.json({ poll: result });
  });
}
