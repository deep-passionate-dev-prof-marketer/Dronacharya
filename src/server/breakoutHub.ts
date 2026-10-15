/**
 * Breakout rooms: the host splits admitted learners into groups, each in its own media room
 * (`<class room>--bo-<n>`), with an optional timer; broadcasts a message to every group; moves
 * people; and brings everyone back. The class session, recording and attendance stay with the main
 * room (attendance from a breakout room is recorded under the class).
 */
import express from "express";
import { inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";
import { canAccessRoom, canHost, isBreakoutRoom, parentRoom } from "./roomAccess";
import { send } from "./roomControlHub";
import { mediaEnabled } from "./media/mediaServer";
import { allBreakouts, BreakoutState, breakoutRoomName, clearBreakouts, getBreakouts, setBreakouts } from "./breakoutAccess";
import { auditInsert, persist } from "./db/kv";
import crypto from "crypto";

const MAX_GROUPS = 20;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const hostOnly: express.RequestHandler = async (req, res, next) => {
  if (isBreakoutRoom(req.params.slug)) return res.status(400).json({ error: "Use the class's main room." });
  if (!(await canHost(req.user!, req.params.slug))) return res.status(403).json({ error: "Only the class host can run breakout rooms." });
  next();
};

/** What everyone is told: groups with names (learners use it to find their own room) */
async function publicState(s: BreakoutState | null) {
  if (!s) return { active: false as const };
  const ids = [...new Set(s.groups.flatMap((g) => g.members))];
  const db: any = await getDb();
  const people = ids.length ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, ids)) : [];
  const nameOf = new Map(people.map((p: any) => [p.id, p.name]));
  return {
    active: true as const,
    roomSlug: s.roomSlug,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    groups: s.groups.map((g) => ({ n: g.n, name: g.name, room: breakoutRoomName(s.roomSlug, g.n), members: g.members.map((id) => ({ id, name: nameOf.get(id) || "Learner" })) })),
  };
}

async function announce(roomSlug: string, extra: Record<string, unknown> = {}) {
  const s = await getBreakouts(roomSlug);
  await send(roomSlug, "breakouts", { ...(await publicState(s)), ...extra });
}

async function closeNow(roomSlug: string, by: string | null) {
  const t = timers.get(roomSlug);
  if (t) clearTimeout(t);
  timers.delete(roomSlug);
  if (!(await getBreakouts(roomSlug))) return;
  // Tell everyone (including the groups) before the groups stop existing
  await send(roomSlug, "breakouts", { active: false, roomSlug, closedBy: by ? "host" : "timer" });
  clearBreakouts(roomSlug);
  persist("breakout audit", auditInsert("room_control", { id: `rc-${crypto.randomUUID()}`, at: new Date().toISOString(), type: "breakouts_close", roomSlug, userId: by || undefined, data: { by: by ? "host" : "timer" } }));
}

function scheduleClose(s: BreakoutState) {
  const t = timers.get(s.roomSlug);
  if (t) clearTimeout(t);
  timers.delete(s.roomSlug);
  if (!s.endsAt) return;
  const ms = Math.max(0, new Date(s.endsAt).getTime() - Date.now());
  const timer = setTimeout(() => closeNow(s.roomSlug, null).catch((e) => console.error("[breakouts] auto-close failed", e)), ms);
  timer.unref?.();
  timers.set(s.roomSlug, timer);
}

/** Learners only, each in at most one group, all allowed in the class */
async function cleanGroups(roomSlug: string, raw: unknown): Promise<{ ok: true; groups: BreakoutState["groups"] } | { ok: false; error: string }> {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_GROUPS) return { ok: false, error: `Make between 1 and ${MAX_GROUPS} groups.` };
  const seen = new Set<string>();
  const all = raw.flatMap((g: any) => (Array.isArray(g?.members) ? g.members.map(String) : []));
  const db: any = await getDb();
  const users = all.length ? await db.select({ id: schema.users.id, role: schema.users.role, disabled: schema.users.disabled }).from(schema.users).where(inArray(schema.users.id, all)) : [];
  const byId = new Map(users.map((u: any) => [u.id, u]));
  const groups: BreakoutState["groups"] = [];
  for (let i = 0; i < raw.length; i++) {
    const g: any = raw[i];
    const members: string[] = [];
    for (const id of Array.isArray(g?.members) ? g.members.map(String) : []) {
      const u: any = byId.get(id);
      if (!u || u.disabled || u.role !== "student" || seen.has(id)) continue;
      if (!(await canAccessRoom(u, roomSlug))) continue;
      seen.add(id);
      members.push(id);
    }
    groups.push({ n: i + 1, name: String(g?.name || `Group ${i + 1}`).trim().slice(0, 40) || `Group ${i + 1}`, members });
  }
  if (!seen.size) return { ok: false, error: "Put at least one learner in a group." };
  return { ok: true, groups };
}

export function setupBreakoutRoutes(app: express.Express) {
  // After a restart, groups with a timer still close on time
  allBreakouts()
    .then((list) => list.forEach(scheduleClose))
    .catch(() => {});

  app.get("/api/rooms/:slug/breakouts", requireAuth(), async (req, res) => {
    const room = parentRoom(req.params.slug);
    if (req.user!.role === "parent" || !(await canAccessRoom(req.user!, room))) return res.status(404).json({ error: "Class not found" });
    const s = await getBreakouts(room);
    const pub = await publicState(s);
    // Learners only see their own group
    if (pub.active && req.user!.role === "student") return res.json({ breakouts: { ...pub, groups: pub.groups.filter((g) => g.members.some((m) => m.id === req.user!.id)) } });
    res.json({ breakouts: pub });
  });

  app.post("/api/rooms/:slug/breakouts", requireAuth(), hostOnly, async (req, res) => {
    if (!mediaEnabled()) return res.status(503).json({ error: "Breakout rooms need the school's media server, which isn't running." });
    const room = req.params.slug;
    if (await getBreakouts(room)) return res.status(409).json({ error: "Breakout rooms are already running. Close them first." });
    const clean = await cleanGroups(room, req.body?.groups);
    if (!clean.ok) return res.status(400).json({ error: clean.error });
    const minutes = Number(req.body?.minutes);
    const endsAt = Number.isFinite(minutes) && minutes >= 1 && minutes <= 180 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
    const s: BreakoutState = { roomSlug: room, groups: clean.groups, startedAt: new Date().toISOString(), startedBy: req.user!.id, endsAt };
    setBreakouts(s);
    scheduleClose(s);
    await announce(room);
    persist("breakout audit", auditInsert("room_control", { id: `rc-${crypto.randomUUID()}`, at: s.startedAt, type: "breakouts_start", roomSlug: room, userId: req.user!.id, data: { groups: s.groups.length, learners: s.groups.reduce((a, g) => a + g.members.length, 0), minutes: endsAt ? minutes : null } }));
    res.json({ breakouts: await publicState(s) });
  });

  /** Move one learner to a group (n) or back to the main room (null) */
  app.post("/api/rooms/:slug/breakouts/move", requireAuth(), hostOnly, async (req, res) => {
    const room = req.params.slug;
    const s = await getBreakouts(room);
    if (!s) return res.status(409).json({ error: "Breakout rooms aren't running." });
    const userId = String(req.body?.userId || "");
    const to = req.body?.group === null ? null : Number(req.body?.group);
    if (to !== null && !s.groups.some((g) => g.n === to)) return res.status(400).json({ error: "Unknown group" });
    if (to !== null) {
      const clean = await cleanGroups(room, [{ members: [userId] }]);
      if (!clean.ok) return res.status(400).json({ error: "Only learners in this class can be moved into a group." });
    }
    const next: BreakoutState = { ...s, groups: s.groups.map((g) => ({ ...g, members: g.members.filter((m) => m !== userId).concat(g.n === to ? [userId] : []) })) };
    setBreakouts(next);
    await announce(room);
    res.json({ breakouts: await publicState(next) });
  });

  app.post("/api/rooms/:slug/breakouts/broadcast", requireAuth(), hostOnly, async (req, res) => {
    const text = String(req.body?.message || "").trim().slice(0, 300);
    if (!text) return res.status(400).json({ error: "Write a message first." });
    if (!(await getBreakouts(req.params.slug))) return res.status(409).json({ error: "Breakout rooms aren't running." });
    await announce(req.params.slug, { announcement: { text, at: new Date().toISOString(), from: req.user!.name } });
    res.json({ ok: true });
  });

  app.post("/api/rooms/:slug/breakouts/close", requireAuth(), hostOnly, async (req, res) => {
    await closeNow(req.params.slug, req.user!.id);
    res.json({ breakouts: { active: false } });
  });
}
