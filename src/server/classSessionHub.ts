/**
 * Live class sessions: the server decides when a class is running.
 *  - Only the host starts/ends a class; everyone else learns about it from the server
 *    (a server message over the media and room sockets, plus GET polling for people in the lobby).
 *  - Starting a class starts its recording automatically; ending it stops the recording and
 *    produces lecture notes from the transcript.
 *  - Speakers post their own final caption lines; lines from learners without recording consent
 *    are not stored.
 *  - The media server reports who joins and leaves (attendance) and when a room empties (auto-end).
 */
import crypto from "crypto";
import express from "express";
import { and, desc, eq, gte, inArray, lte, notLike } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth, SessionUser } from "./auth/session";
import { kvLoad, kvUpsert, persist, auditInsert } from "./db/kv";
import { classByRoom, learnerKeys, STAFF } from "./classesHub";
import { admittedByRoom, admittedLoaded, clearAdmitted, canHost, presenceProbes, send } from "./roomControlHub";
import { mediaHooks, mediaRoomList, mediaPresence } from "./media/mediaServer";
import { BREAKOUT_SEP, hostName, isBreakoutRoom, parentRoom } from "./roomAccess";
import { getBreakouts } from "./breakoutAccess";
import { startRecording, stopRecording, getRecording, toRecording, generateNotes, transcriptFor, RecordingRow } from "./recording/recorder";
import { isRecordingExcluded } from "./recording/consent";
import { recordingPlayback } from "./recording/storage";
import { answerFromTranscript } from "./recording/ask";
import { scheduleFacts, backfillFacts } from "./analytics/facts";
import { DEMO_PREFIX, isDemoRoom } from "./analytics/demo";


export type SessionStatus = "waiting" | "in_progress" | "ended";

export interface ClassSession {
  roomSlug: string;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  startedBy?: string;
  recordingId?: string;
}

const sessions = new Map<string, ClassSession>();
let ready: Promise<void> | null = null;

let timersStarted = false;
function load() {
  if (!ready) {
    ready = (async () => {
      for (const { key, value } of await kvLoad<ClassSession>("class_sessions")) sessions.set(key, value);
      resumePendingNotes().catch((e) => console.error("[notes] resume failed:", e));
      reconcileSessions().catch((e) => console.error("[sessions] reconcile failed:", e));
      backfillFacts(25).catch((e) => console.error("[analytics] backfill failed:", e));
      if (!timersStarted) {
        timersStarted = true;
        setInterval(() => {
          reconcileSessions().catch(() => {});
          backfillFacts(25).catch(() => {});
        }, reconcileEveryMs()).unref();
      }
    })();
    // A database hiccup at startup must not break every room until restart: try again next time
    ready.catch(() => (ready = null));
  }
  return ready;
}

function save(s: ClassSession) {
  sessions.set(s.roomSlug, s);
  persist("class session", kvUpsert("class_sessions", [{ key: s.roomSlug, value: s }]));
}

/**
 * Safety net for a missed "room closed" event (e.g. this server restarted): a class still
 * marked running whose media room has been gone for two checks in a row is ended, dated to the
 * last time anyone was in the room.
 */
// Read when used (module code runs before server.ts loads .env)
const reconcileEveryMs = () => Number(process.env.SESSION_RECONCILE_MS || 5 * 60_000);
const staleAfterMs = () => Number(process.env.SESSION_STALE_AFTER_MS || 10 * 60_000);
const missingSince = new Map<string, number>();
async function reconcileSessions() {
  const live = new Set(mediaRoomList().filter((r) => r.numParticipants > 0).map((r) => r.name));
  const now = Date.now();
  for (const s of [...sessions.values()]) {
    // Someone still in the room over the realtime socket (direct peer-to-peer video) counts as alive
    const inBreakouts = [...live].some((name) => name.startsWith(`${s.roomSlug}${BREAKOUT_SEP}`));
    if (s.status !== "in_progress" || live.has(s.roomSlug) || inBreakouts || presentOnSocket(s.roomSlug) > 0) {
      missingSince.delete(s.roomSlug);
      continue;
    }
    // Started moments ago (host may not have joined yet)? Leave it.
    if (!s.startedAt || now - new Date(s.startedAt).getTime() < staleAfterMs()) continue;
    const first = missingSince.get(s.roomSlug);
    if (!first) {
      // Never end on a single miss: after a deploy, clients take a moment to rejoin and recreate the room
      missingSince.set(s.roomSlug, now);
      continue;
    }
    if (now - first >= reconcileEveryMs() - 1000) {
      missingSince.delete(s.roomSlug);
      await endSession(s.roomSlug, "room_closed", await lastActivity(s));
    }
  }
}

const presentOnSocket = (roomSlug: string) => [...presenceProbes].reduce((n, probe) => n + probe(roomSlug), 0);

/**
 * The media room empties (e.g. the host refreshed or lost their network).
 * Wait a little and check again before ending the class for everyone.
 */
const roomFinishedGraceMs = () => Number(process.env.ROOM_FINISHED_GRACE_MS || 120_000);
const pendingFinish = new Map<string, NodeJS.Timeout>();
function scheduleRoomFinished(roomSlug: string) {
  if (pendingFinish.has(roomSlug)) return;
  const t = setTimeout(async () => {
    pendingFinish.delete(roomSlug);
    try {
      const back = mediaPresence(roomSlug) > 0;
      // Everyone may be in breakout groups (the main video room empties): the class goes on
      if (back || presentOnSocket(roomSlug) > 0 || (await getBreakouts(roomSlug))) return;
      await endSession(roomSlug, "room_closed", new Date(Date.now() - roomFinishedGraceMs()));
    } catch (e) {
      console.warn("[sessions] room-finished check failed:", (e as any)?.message || e);
    }
  }, roomFinishedGraceMs());
  t.unref?.();
  pendingFinish.set(roomSlug, t);
}

/** When the class really stopped: the last join/leave or transcript line after it started. */
async function lastActivity(s: ClassSession): Promise<Date> {
  const db: any = await getDb();
  const since = new Date(s.startedAt!);
  const [att] = await db
    .select({ at: schema.attendanceEvents.at })
    .from(schema.attendanceEvents)
    .where(and(eq(schema.attendanceEvents.roomSlug, s.roomSlug), gte(schema.attendanceEvents.at, since)))
    .orderBy(desc(schema.attendanceEvents.at))
    .limit(1);
  const [line] = await db
    .select({ at: schema.transcriptLines.at })
    .from(schema.transcriptLines)
    .where(and(eq(schema.transcriptLines.roomSlug, s.roomSlug), gte(schema.transcriptLines.at, since)))
    .orderBy(desc(schema.transcriptLines.at))
    .limit(1);
  const times = [att?.at, line?.at].filter(Boolean).map((d: any) => new Date(d).getTime());
  return new Date(times.length ? Math.max(...times) : since.getTime());
}

/** A class that ended a while ago is "waiting" again (the room is reused for the next class). */
const ENDED_GRACE_MS = 30 * 60 * 1000;

export function sessionFor(roomSlug: string): ClassSession {
  const s = sessions.get(roomSlug);
  if (!s) return { roomSlug, status: "waiting" };
  if (s.status === "ended" && s.endedAt && Date.now() - new Date(s.endedAt).getTime() > ENDED_GRACE_MS) return { roomSlug, status: "waiting" };
  return s;
}

/** Recordings that ended while the server was down still get their notes. */
async function resumePendingNotes() {
  const db: any = await getDb();
  const recs = await db.select().from(schema.recordings).where(inArray(schema.recordings.status, ["ready", "processing", "failed"]));
  if (!recs.length) return;
  const notes = await db.select({ recordingId: schema.lectureNotes.recordingId }).from(schema.lectureNotes);
  const have = new Set(notes.map((n: any) => n.recordingId));
  // Demo analytics history (scripts/seed-analytics-demo.ts) never gets notes generated
  for (const r of recs) if (r.endedAt && !have.has(r.id) && !isDemoRoom(r.roomSlug)) await generateNotes(r.id).catch(() => {});
  // A recording left "recording" by a crash, whose session is no longer running, is stopped now
  const dangling = await db.select().from(schema.recordings).where(eq(schema.recordings.status, "recording"));
  for (const r of dangling) {
    const s = sessions.get(r.roomSlug);
    if (!s || s.recordingId !== r.id || s.status !== "in_progress") await stopRecording(r.id);
  }
}

// ---------------- access rules ----------------

/** May this person be in / see the state of this room? Mirrors class visibility. */
export { canAccessRoom } from "./roomAccess";
import { canAccessRoom } from "./roomAccess";

/** Notes: auditors/admins all; teachers their classes; counsellors sessions they ran; learners and parents enrolled classes. */
export async function canReadNotes(user: SessionUser, roomSlug: string, startedBy?: string | null): Promise<boolean> {
  if (user.role === "admin" || user.role === "auditor") return true;
  const cls = await classByRoom(roomSlug);
  if (user.role === "instructor" || user.role === "sales_rep") return cls ? cls.teacherId === user.id || startedBy === user.id : startedBy === user.id;
  if (user.role === "student" || user.role === "parent") {
    if (!cls) return false;
    const keys = (await learnerKeys(user.id, user.role)).map((k) => k.toLowerCase());
    return cls.studentKeys.some((k: string) => keys.includes(k.toLowerCase()));
  }
  return false;
}

/** Video playback: auditors/admins, and the teacher of the class. Learners and parents get notes only. */
export async function canWatchRecording(user: SessionUser, rec: RecordingRow): Promise<boolean> {
  if (user.role === "admin" || user.role === "auditor") return true;
  if (user.role === "instructor" || user.role === "sales_rep") return canReadNotes(user, rec.roomSlug, rec.startedBy);
  return false;
}

// ---------------- helpers ----------------

function publicSession(s: ClassSession, rec: RecordingRow | null) {
  return {
    status: s.status,
    startedAt: s.startedAt || null,
    endedAt: s.endedAt || null,
    recording: rec ? { id: rec.id, mode: rec.mode, status: rec.status, error: rec.mode === "transcript_only" ? rec.error : null } : null,
  };
}

async function broadcast(s: ClassSession) {
  const rec = s.recordingId ? await getRecording(s.recordingId) : null;
  await send(s.roomSlug, "class_status", publicSession(s, rec));
}

/** One start/end at a time per room (double clicks, two hosts, a webhook racing the host). */
const roomLocks = new Map<string, Promise<unknown>>();
function withRoomLock<T>(roomSlug: string, fn: () => Promise<T>): Promise<T> {
  const prev = roomLocks.get(roomSlug) || Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => {});
  roomLocks.set(roomSlug, tail);
  tail.then(() => {
    if (roomLocks.get(roomSlug) === tail) roomLocks.delete(roomSlug);
  });
  return run;
}

export function startSession(roomSlug: string, by: SessionUser): Promise<ClassSession> {
  return withRoomLock(roomSlug, () => startSessionNow(roomSlug, by));
}

export function endSession(roomSlug: string, reason: "host" | "room_closed", endedAt?: Date): Promise<ClassSession> {
  return withRoomLock(roomSlug, () => endSessionNow(roomSlug, reason, endedAt));
}

async function startSessionNow(roomSlug: string, by: SessionUser): Promise<ClassSession> {
  // A new class cancels any pending "room closed" check from the previous one
  const pending = pendingFinish.get(roomSlug);
  if (pending) {
    clearTimeout(pending);
    pendingFinish.delete(roomSlug);
  }
  const cur = sessionFor(roomSlug);
  if (cur.status === "in_progress") return cur;
  const rec = await startRecording(roomSlug, by.id);
  const s: ClassSession = { roomSlug, status: "in_progress", startedAt: new Date().toISOString(), startedBy: by.id, recordingId: rec.id };
  save(s);
  await broadcast(s);
  return s;
}

async function endSessionNow(roomSlug: string, reason: "host" | "room_closed", endedAt: Date = new Date()): Promise<ClassSession> {
  const cur = sessionFor(roomSlug);
  if (cur.status !== "in_progress") return cur;
  const s: ClassSession = { ...cur, status: "ended", endedAt: endedAt.toISOString() };
  save(s);
  if (s.recordingId) {
    await stopRecording(s.recordingId, endedAt);
    scheduleFacts(s.recordingId);
  }
  // The next session starts with an empty waiting room again
  clearAdmitted(roomSlug);
  await broadcast(s);
  persist(
    "session audit",
    auditInsert("room_control", { id: `rc-${crypto.randomUUID()}`, at: s.endedAt!, type: "class_end", roomSlug, userId: cur.startedBy, data: { reason, recordingId: s.recordingId } })
  );
  return s;
}

const transcriptRate = new Map<string, { n: number; at: number }>();

/** Attendance from the media server; breakout groups count as being in the class. Observers aren't attendees. */
function persistAttendance(roomSlug: string, peer: { id: string; name: string; role: string; hidden: boolean }, event: "join" | "leave") {
  if (peer.hidden) return;
  persist(
    "attendance",
    getDb().then((db: any) =>
      db.insert(schema.attendanceEvents).values({ roomSlug, userId: peer.id, name: peer.name || null, role: peer.role || null, event, at: new Date(), eventId: `media-${crypto.randomUUID()}` })
    )
  );
}

/** The teacher's notes pad for one recorded class */
async function teacherPad(roomSlug: string, recordingId: string): Promise<string | null> {
  const db: any = await getDb();
  const [row] = await db.select().from(schema.classPads).where(and(eq(schema.classPads.roomSlug, roomSlug), eq(schema.classPads.sessionKey, recordingId)));
  return row?.content || null;
}

export function setupClassSessionRoutes(app: express.Express) {
  load();
  app.use(["/api/rooms", "/api/recordings", "/api/notes"], (_req, _res, next) => {
    load().then(() => next(), next);
  });

  // ---------------- session state ----------------
  app.get("/api/rooms/:slug/session", requireAuth(), async (req, res) => {
    if (!(await canAccessRoom(req.user!, req.params.slug))) {
      return res.status(403).json({ error: "You're not on this class's list. Check the link, or ask your teacher to add you.", reason: "not_enrolled" });
    }
    const s = sessionFor(req.params.slug);
    const rec = s.recordingId ? await getRecording(s.recordingId) : null;
    res.json({
      session: publicSession(s, rec),
      me: { recordingExcluded: await isRecordingExcluded(req.user!), isHost: await canHost(req.user!, req.params.slug) },
      // "Hosted by …" for people who see the class but can't start it
      host: { name: await hostName(req.params.slug) },
    });
  });

  app.post("/api/rooms/:slug/session/start", requireAuth(), async (req, res) => {
    if (!(await canHost(req.user!, req.params.slug))) return res.status(403).json({ error: "Only the class host can start the class." });
    const s = await startSession(req.params.slug, req.user!);
    const rec = s.recordingId ? await getRecording(s.recordingId) : null;
    res.json({ session: publicSession(s, rec) });
  });

  app.post("/api/rooms/:slug/session/end", requireAuth(), async (req, res) => {
    if (!(await canHost(req.user!, req.params.slug))) return res.status(403).json({ error: "Only the class host can end the class." });
    const s = await endSession(req.params.slug, "host");
    const rec = s.recordingId ? await getRecording(s.recordingId) : null;
    res.json({ session: publicSession(s, rec) });
  });

  // ---------------- transcript (each speaker posts their own final lines) ----------------
  app.post("/api/rooms/:slug/transcript", requireAuth(), async (req, res) => {
    const user = req.user!;
    const text = String(req.body?.text || "").trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: "Empty line" });
    const now = Date.now();
    const r = transcriptRate.get(user.sid) || { n: 0, at: now };
    if (now - r.at > 60_000) Object.assign(r, { n: 0, at: now });
    if (++r.n > 120) return res.status(429).json({ error: "Too many lines" });
    transcriptRate.set(user.sid, r);

    const s = sessionFor(req.params.slug);
    if (s.status !== "in_progress") return res.json({ stored: false, reason: "class_not_running" });
    if (user.role === "parent" || user.role === "auditor") return res.status(403).json({ error: "Not a speaker in this class" });
    if (!(await canAccessRoom(user, req.params.slug))) return res.status(404).json({ error: "Class not found" });
    // Only people really in the class: admitted learners, and the class's host (not other staff passing by)
    if (user.role === "student") {
      await admittedLoaded().catch(() => {});
      if (!admittedByRoom.get(req.params.slug)?.has(user.id)) return res.status(403).json({ error: "Not admitted to this class" });
    } else if (!(await canHost(user, req.params.slug))) {
      return res.status(403).json({ error: "Only the class's host and admitted learners are transcribed" });
    }
    if (await isRecordingExcluded(user)) return res.json({ stored: false, reason: "no_recording_consent" });
    const db: any = await getDb();
    await db.insert(schema.transcriptLines).values({
      roomSlug: req.params.slug,
      speakerId: user.id,
      speakerName: user.name,
      text,
      translated: req.body?.translated ? String(req.body.translated).slice(0, 2000) : null,
      lang: req.body?.lang ? String(req.body.lang).slice(0, 12) : null,
    });
    res.json({ stored: true });
  });

  // ---------------- recordings & notes ----------------
  app.get("/api/recordings", requireAuth(), async (req, res) => {
    const user = req.user!;
    if (!["admin", "auditor", "instructor", "sales_rep"].includes(user.role)) return res.status(403).json({ error: "Not allowed" });
    const db: any = await getDb();
    const roomFilter = req.query.room ? eq(schema.recordings.roomSlug, String(req.query.room)) : undefined;
    const rows = await db.select().from(schema.recordings).where(and(notLike(schema.recordings.roomSlug, `${DEMO_PREFIX}%`), roomFilter)).orderBy(desc(schema.recordings.startedAt)).limit(200);
    const out = [];
    for (const r of rows.map(toRecording)) {
      if (!(await canWatchRecording(user, r))) continue;
      const cls = await classByRoom(r.roomSlug);
      out.push({ ...publicRecording(r), class: cls ? { kind: cls.kind, subject: cls.subject, topic: cls.topic, teacherName: cls.teacherName } : null });
    }
    res.json({ recordings: out, egress: false });
  });

  app.get("/api/recordings/:id", requireAuth(), async (req, res) => {
    const rec = await getRecording(req.params.id);
    if (!rec || !(await canWatchRecording(req.user!, rec))) return res.status(404).json({ error: "Recording not found" });
    const db: any = await getDb();
    const end = rec.endedAt ? new Date(new Date(rec.endedAt).getTime() + 30_000) : new Date();
    const transcript = await transcriptFor(rec.roomSlug, new Date(rec.startedAt), end);
    // Engagement analytics stay with auditors/admins (never teachers)
    let timeline: ReturnType<typeof engagementTimeline> | null = null;
    if (req.user!.role === "auditor" || req.user!.role === "admin") {
      const samples = await db
        .select()
        .from(schema.engagementSamples)
        .where(and(eq(schema.engagementSamples.roomSlug, rec.roomSlug), gte(schema.engagementSamples.at, new Date(rec.startedAt)), lte(schema.engagementSamples.at, end)));
      timeline = engagementTimeline(samples, rec.startedAt);
    }
    const [notes] = await db.select().from(schema.lectureNotes).where(eq(schema.lectureNotes.recordingId, rec.id));
    const cls = await classByRoom(rec.roomSlug);
    res.json({
      recording: publicRecording(rec),
      class: cls ? { kind: cls.kind, subject: cls.subject, topic: cls.topic, course: cls.course, teacherName: cls.teacherName } : null,
      transcript,
      engagement: timeline,
      notes: notes ? { ...notes.data, createdAt: new Date(notes.createdAt).toISOString() } : null,
      // What the teacher wrote in the class notes pad during this class
      teacherNotes: await teacherPad(rec.roomSlug, rec.id),
    });
  });

  app.get("/api/recordings/:id/media", requireAuth(), async (req, res) => {
    const rec = await getRecording(req.params.id);
    if (!rec || !(await canWatchRecording(req.user!, rec))) return res.status(404).json({ error: "Recording not found" });
    if (rec.mode !== "video" || rec.status !== "ready" || !rec.filePath) return res.status(404).json({ error: "No video for this recording" });
    const target = recordingPlayback(rec.filePath);
    if (!target) return res.status(404).json({ error: "Video file is missing" });
    persist(
      "playback audit",
      auditInsert("recording_access", { id: `ra-${crypto.randomUUID()}`, at: new Date().toISOString(), type: "playback", roomSlug: rec.roomSlug, userId: req.user!.id, data: { recordingId: rec.id, role: req.user!.role } })
    );
    res.setHeader("Cache-Control", "private, no-store");
    if ("url" in target) return res.redirect(302, target.url);
    res.sendFile(target.file, { headers: { "Content-Type": "video/mp4" } });
  });

  /** Lecture notes the signed-in person may read (notebook, parent portal). */
  app.get("/api/notes", requireAuth(), async (req, res) => {
    const user = req.user!;
    const db: any = await getDb();
    const rows = await db.select().from(schema.lectureNotes).where(notLike(schema.lectureNotes.roomSlug, `${DEMO_PREFIX}%`)).orderBy(desc(schema.lectureNotes.createdAt)).limit(300);
    const recIds = rows.map((r: any) => r.recordingId).filter(Boolean);
    const recs = recIds.length ? await db.select().from(schema.recordings).where(inArray(schema.recordings.id, recIds)) : [];
    const recById = new Map(recs.map((r: any) => [r.id, toRecording(r)]));
    const out = [];
    for (const n of rows) {
      const rec: any = recById.get(n.recordingId);
      if (!(await canReadNotes(user, n.roomSlug, rec?.startedBy))) continue;
      const cls = await classByRoom(n.roomSlug);
      out.push({
        id: n.id,
        roomSlug: n.roomSlug,
        recordingId: n.recordingId,
        generator: n.generator,
        createdAt: new Date(n.createdAt).toISOString(),
        classStartedAt: rec?.startedAt || null,
        class: cls ? { kind: cls.kind, subject: cls.subject, topic: cls.topic, course: cls.course, teacherName: cls.teacherName } : null,
        notes: n.data,
        teacherNotes: n.recordingId ? await teacherPad(n.roomSlug, n.recordingId) : null,
      });
    }
    res.json({ notes: out });
  });

  /** Questions about one class, answered only from that class's transcript. */
  const askRate = new Map<string, { n: number; at: number }>();
  app.post("/api/notes/:id/ask", requireAuth(), async (req, res) => {
    const user = req.user!;
    const question = String(req.body?.question || "").trim().slice(0, 500);
    if (question.length < 3) return res.status(400).json({ error: "Ask a question about the class." });
    const now = Date.now();
    const r = askRate.get(user.id) || { n: 0, at: now };
    if (now - r.at > 60_000) Object.assign(r, { n: 0, at: now });
    if (++r.n > 20) return res.status(429).json({ error: "Too many questions; try again in a minute." });
    askRate.set(user.id, r);

    const db: any = await getDb();
    const [n] = await db.select().from(schema.lectureNotes).where(eq(schema.lectureNotes.id, req.params.id));
    const rec = n?.recordingId ? await getRecording(n.recordingId) : null;
    if (!n || !rec || !(await canReadNotes(user, n.roomSlug, rec.startedBy))) return res.status(404).json({ error: "Notes not found" });
    const end = rec.endedAt ? new Date(new Date(rec.endedAt).getTime() + 30_000) : new Date();
    const lines = await transcriptFor(rec.roomSlug, new Date(rec.startedAt), end);
    const answer = await answerFromTranscript(question, lines, rec.startedAt);
    res.json(answer);
  });

  // ---------------- attendance and "everyone left", from the media server ----------------
  mediaHooks.joined.add((mediaRoom, peer) => {
    const roomSlug = parentRoom(mediaRoom);
    persistAttendance(roomSlug, peer, "join");
    // Whoever just joined gets the class's current state at once (a broadcast sent before they connected is gone)
    (async () => {
      const cur = sessionFor(roomSlug);
      const rec = cur.recordingId ? await getRecording(cur.recordingId) : null;
      await send(roomSlug, "class_status", publicSession(cur, rec), [peer.id]);
    })().catch(() => {});
  });
  mediaHooks.left.add((mediaRoom, peer) => persistAttendance(parentRoom(mediaRoom), peer, "leave"));
  mediaHooks.roomEmpty.add((mediaRoom) => {
    if (!isBreakoutRoom(mediaRoom)) scheduleRoomFinished(mediaRoom);
  });
}

function publicRecording(r: RecordingRow) {
  return {
    id: r.id,
    roomSlug: r.roomSlug,
    mode: r.mode,
    status: r.status,
    error: r.error,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    hasVideo: r.mode === "video" && r.status === "ready" && Boolean(r.filePath),
  };
}

/** Per-minute class engagement (share attentive, people present, dominant state) for the playback overlay. */
function engagementTimeline(samples: any[], startedAt: string) {
  const t0 = new Date(startedAt).getTime();
  const byMinute = new Map<number, { eye: number[]; people: Set<string>; states: Map<string, number> }>();
  for (const s of samples) {
    const d = s.data || {};
    const minute = Math.max(0, Math.floor((new Date(s.at).getTime() - t0) / 60000));
    if (!byMinute.has(minute)) byMinute.set(minute, { eye: [], people: new Set(), states: new Map() });
    const b = byMinute.get(minute)!;
    b.people.add(s.participantId);
    const eye = Number(d.summary?.eyeContact ?? d.eyeContact);
    if (Number.isFinite(eye)) b.eye.push(eye);
    const dom = d.summary?.dominant ?? d.dominant;
    if (dom) b.states.set(dom, (b.states.get(dom) || 0) + 1);
  }
  return [...byMinute.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minute, b]) => ({
      minute,
      attention: b.eye.length ? b.eye.reduce((x, y) => x + y, 0) / b.eye.length : null,
      people: b.people.size,
      dominant: [...b.states.entries()].sort((a, c) => c[1] - a[1])[0]?.[0] || null,
    }));
}
