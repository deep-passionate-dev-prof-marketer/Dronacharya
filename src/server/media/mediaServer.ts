/**
 * The school's own media server (SFU): every participant sends their camera and microphone once,
 * and the server forwards them to everyone else in the class, choosing a lower or higher video
 * layer per viewer (simulcast). Built on mediasoup, running inside this Node process; nothing
 * leaves the school's server.
 *
 * Signalling is a WebSocket at /media (signed-in users only). A room is a class room or one of its
 * breakout groups (`<class>--bo-<n>`). The server enforces the same rules as the rest of the app:
 * class list, waiting room (no media in or out until admitted), host-only actions, device policy.
 *
 * Network: one UDP + TCP port per worker (MEDIA_PORT, default 40000; workers use consecutive
 * ports), announced as MEDIA_ANNOUNCED_IP (default: this machine's first public/LAN address).
 * Browsers connect over UDP, or over TCP when UDP is blocked.
 */
import crypto from "crypto";
import http from "http";
import os from "os";
import type { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import * as mediasoup from "mediasoup";
import type { types as ms } from "mediasoup";
import { SessionUser, userFromCookieHeader, userFromToken } from "../auth/session";
import { canAccessRoom, canHost, isBreakoutRoom, parentRoom } from "../roomAccess";
import { breakoutAllowed } from "../breakoutAccess";
import { admittedByRoom, admittedLoaded } from "../admission";
import { evaluateJoinRequest } from "../deviceAccessHub";
import { isRecordingExcluded } from "../recording/consent";
import { rememberTimezone } from "../analytics/geo";
import { createLimiter } from "../rateLimit";

// ---------------------------------------------------------------- configuration
const MEDIA_CODECS: ms.RtpCodecCapability[] = [
  { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2, preferredPayloadType: 111 },
  { kind: "video", mimeType: "video/VP8", clockRate: 90000, preferredPayloadType: 96, parameters: { "x-google-start-bitrate": 800 } },
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    preferredPayloadType: 102,
    parameters: { "packetization-mode": 1, "profile-level-id": "42e01f", "level-asymmetry-allowed": 1, "x-google-start-bitrate": 800 },
  },
];

function announcedAddress(): string {
  if (process.env.MEDIA_ANNOUNCED_IP) return process.env.MEDIA_ANNOUNCED_IP;
  const all = Object.values(os.networkInterfaces()).flat().filter((i): i is os.NetworkInterfaceInfo => Boolean(i && i.family === "IPv4" && !i.internal));
  return all[0]?.address || "127.0.0.1";
}

const SOURCES = ["camera", "microphone", "screen", "screen_audio"] as const;
type Source = (typeof SOURCES)[number];

// ---------------------------------------------------------------- state
interface Worker {
  worker: ms.Worker;
  webRtcServer: ms.WebRtcServer;
  rooms: number;
  /** Which port slot it holds (MEDIA_PORT + index); a replacement takes the same one */
  index: number;
  alive: boolean;
}
export interface MediaPeer {
  id: string; // user id (one connection per person per room)
  name: string;
  role: string;
  avatarColor: string | null;
  gradeLevel: number | null;
  isHost: boolean;
  waiting: boolean;
  /** Auditors observe silently: no media out, not listed to others */
  hidden: boolean;
  recordingExcluded: boolean;
  joinedAt: number;
  socket: WebSocket;
  transports: Map<string, ms.WebRtcTransport>;
  producers: Map<string, ms.Producer>;
  consumers: Map<string, ms.Consumer>;
}
interface Room {
  slug: string;
  router: ms.Router;
  levels: ms.AudioLevelObserver;
  peers: Map<string, MediaPeer>;
  worker: Worker;
  closeTimer: ReturnType<typeof setTimeout> | null;
}

const workers: Worker[] = [];
const rooms = new Map<string, Room>();
const pendingRooms = new Map<string, Promise<Room>>();
let started: Promise<boolean> | null = null;
let enabled = false;

/** Hooks for the rest of the app (attendance, class status, "everyone left") */
export const mediaHooks = {
  joined: new Set<(roomSlug: string, peer: MediaPeer) => void>(),
  left: new Set<(roomSlug: string, peer: MediaPeer) => void>(),
  roomEmpty: new Set<(roomSlug: string) => void>(),
};
const fire = <A extends unknown[]>(set: Set<(...a: A) => void>, ...args: A) => {
  for (const fn of set) {
    try {
      fn(...args);
    } catch (err) {
      console.error("[media] hook failed:", err);
    }
  }
};

export const mediaEnabled = () => enabled;

/** Starts the media workers (once). Returns false when media is switched off or can't start here. */
export function startMediaServer(): Promise<boolean> {
  if (started) return started;
  started = (async () => {
    if (process.env.MEDIA_DISABLED === "1") return false;
    try {
      const count = Math.max(1, Math.min(Number(process.env.MEDIA_WORKERS) || Math.min(os.cpus().length, 4), 16));
      basePort = Number(process.env.MEDIA_PORT) || 40000;
      address = announcedAddress();
      for (let i = 0; i < count; i++) await spawnWorker(i);
      enabled = true;
      console.log(`[media] ${count} worker(s) on ${address}, ports ${basePort}–${basePort + count - 1} (UDP and TCP)`);
      return true;
    } catch (err) {
      console.error("[media] couldn't start the media server; classes fall back to direct peer-to-peer video:", (err as Error)?.message || err);
      return false;
    }
  })();
  return started;
}

let basePort = 40000;
let address = "";

async function spawnWorker(index: number): Promise<Worker> {
  const worker = await mediasoup.createWorker({ logLevel: "warn" });
  try {
    const webRtcServer = await worker.createWebRtcServer({
      listenInfos: [
        { protocol: "udp", ip: "0.0.0.0", announcedAddress: address, port: basePort + index },
        { protocol: "tcp", ip: "0.0.0.0", announcedAddress: address, port: basePort + index },
      ],
    });
    const entry: Worker = { worker, webRtcServer, rooms: 0, index, alive: true };
    workers[index] = entry;
    worker.on("died", () => onWorkerDied(entry));
    return entry;
  } catch (err) {
    worker.close();
    throw err;
  }
}

/**
 * A media worker crashed: its classes reconnect on the other workers (browsers rejoin by themselves when
 * their socket closes), and a new worker takes its port. Classes on other workers carry on untouched.
 */
function onWorkerDied(entry: Worker) {
  if (!entry.alive) return;
  entry.alive = false;
  console.error(`[media] worker ${entry.worker.pid} died; its classes are reconnecting and a new worker is starting`);
  for (const room of [...rooms.values()]) {
    if (room.worker !== entry) continue;
    if (rooms.get(room.slug) === room) rooms.delete(room.slug);
    if (room.closeTimer) clearTimeout(room.closeTimer);
    room.closeTimer = null;
    for (const peer of [...room.peers.values()]) closePeer(room, peer, "restart");
  }
  const respawn = (attempt: number) => {
    const t = setTimeout(async () => {
      try {
        await spawnWorker(entry.index);
        console.log(`[media] replacement worker ready on port ${basePort + entry.index}`);
      } catch (err) {
        console.error(`[media] couldn't start a replacement worker (attempt ${attempt}):`, (err as Error)?.message || err);
        respawn(attempt + 1);
      }
    }, Math.min(1000 * 2 ** attempt, 30_000));
    t.unref?.();
  };
  respawn(0);
}

async function getRoom(slug: string): Promise<Room> {
  const existing = rooms.get(slug);
  if (existing) {
    if (existing.closeTimer) clearTimeout(existing.closeTimer);
    existing.closeTimer = null;
    return existing;
  }
  if (pendingRooms.has(slug)) return pendingRooms.get(slug)!;
  const p = (async () => {
    const alive = workers.filter((w) => w?.alive);
    if (!alive.length) throw new JoinError("restarting", "The media server is restarting. Trying again…");
    const worker = alive.reduce((a, b) => (b.rooms < a.rooms ? b : a));
    const router = await worker.worker.createRouter({ mediaCodecs: MEDIA_CODECS });
    const levels = await router.createAudioLevelObserver({ maxEntries: 6, threshold: -65, interval: 700 });
    const room: Room = { slug, router, levels, peers: new Map(), worker, closeTimer: null };
    worker.rooms++;
    levels.on("volumes", (volumes) => {
      broadcast(room, "speakers", { speakers: volumes.map((v) => ({ id: (v.producer.appData as any).peerId, volume: v.volume })) });
    });
    levels.on("silence", () => broadcast(room, "speakers", { speakers: [] }));
    rooms.set(slug, room);
    return room;
  })();
  pendingRooms.set(slug, p);
  try {
    return await p;
  } finally {
    pendingRooms.delete(slug);
  }
}

/** An empty room closes after a short grace (someone refreshing keeps it) */
function scheduleClose(room: Room) {
  if (room.peers.size || room.closeTimer) return;
  room.closeTimer = setTimeout(() => {
    if (room.peers.size) return;
    room.router.close();
    room.worker.rooms--;
    // A newer room under the same name (after a worker restart) isn't this one's to remove
    if (rooms.get(room.slug) !== room) return;
    rooms.delete(room.slug);
    fire(mediaHooks.roomEmpty, room.slug);
  }, 15_000);
  room.closeTimer.unref?.();
}

// ---------------------------------------------------------------- messages
const send = (peer: MediaPeer, method: string, data: unknown) => {
  if (peer.socket.readyState === WebSocket.OPEN) peer.socket.send(JSON.stringify({ notification: true, method, data }));
};
function broadcast(room: Room, method: string, data: unknown, opts: { except?: string; includeWaiting?: boolean; to?: string[] } = {}) {
  for (const p of room.peers.values()) {
    if (p.id === opts.except) continue;
    if (opts.to && !opts.to.includes(p.id)) continue;
    if (p.waiting && !opts.includeWaiting) continue;
    send(p, method, data);
  }
}

function publicPeer(p: MediaPeer) {
  return {
    id: p.id,
    name: p.name,
    role: p.role,
    avatarColor: p.avatarColor,
    gradeLevel: p.gradeLevel,
    waiting: p.waiting,
    joinedAt: p.joinedAt,
    recordingExcluded: p.recordingExcluded,
    producers: [...p.producers.values()].map((pr) => ({ id: pr.id, kind: pr.kind, source: (pr.appData as any).source, paused: pr.paused })),
  };
}
/** What one person sees of the room: everyone visible, minus themselves */
const visiblePeers = (room: Room, me: MediaPeer) => [...room.peers.values()].filter((p) => p.id !== me.id && !p.hidden).map(publicPeer);

// ---------------------------------------------------------------- peer lifecycle
function closePeer(room: Room, peer: MediaPeer, reason: "left" | "removed" | "duplicate" | "closed" | "restart") {
  if (room.peers.get(peer.id) !== peer) return;
  room.peers.delete(peer.id);
  for (const t of peer.transports.values()) t.close();
  peer.transports.clear();
  peer.producers.clear();
  peer.consumers.clear();
  // 4000: closed on purpose (the browser doesn't come back); 4001: come back (the browser rejoins)
  if (reason !== "left" && peer.socket.readyState === WebSocket.OPEN) peer.socket.close(reason === "restart" ? 4001 : 4000, reason);
  if (!peer.hidden) broadcast(room, "peerLeft", { id: peer.id }, { includeWaiting: true });
  fire(mediaHooks.left, room.slug, peer);
  scheduleClose(room);
}

const QUALITY = (score: number) => (score >= 8 ? "excellent" : score >= 5 ? "good" : score >= 2 ? "poor" : "lost");

async function handleRequest(ctx: Ctx, method: string, data: any): Promise<unknown> {
  if (method === "join") return join(ctx, data);
  const { room, peer } = ctx;
  if (!room || !peer || room.peers.get(peer.id) !== peer) throw new Error("Not in a room");
  const transport = (id: string) => {
    const t = peer.transports.get(String(id));
    if (!t) throw new Error("Unknown transport");
    return t;
  };

  switch (method) {
    case "createTransport": {
      if (peer.transports.size >= 4) throw new Error("Too many transports");
      const t = await room.router.createWebRtcTransport({
        webRtcServer: room.worker.webRtcServer,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1_000_000,
        appData: { direction: data?.direction === "send" ? "send" : "recv" },
      });
      if (data?.direction === "send") await t.setMaxIncomingBitrate(4_000_000).catch(() => {});
      peer.transports.set(t.id, t);
      t.on("dtlsstatechange", (s) => s === "closed" && t.close());
      return { id: t.id, iceParameters: t.iceParameters, iceCandidates: t.iceCandidates, dtlsParameters: t.dtlsParameters };
    }
    case "connectTransport": {
      await transport(data?.transportId).connect({ dtlsParameters: data?.dtlsParameters });
      return {};
    }
    case "restartIce": {
      return { iceParameters: await transport(data?.transportId).restartIce() };
    }
    case "produce": {
      if (peer.waiting) throw new Error("Waiting to be admitted");
      if (peer.hidden) throw new Error("Observers don't send media");
      const source = String(data?.source) as Source;
      if (!SOURCES.includes(source)) throw new Error("Unknown source");
      if (source === "screen_audio" && !peer.isHost) throw new Error("Only the host shares screen audio");
      // One producer per source: replacing closes the old one
      for (const pr of peer.producers.values()) if ((pr.appData as any).source === source) closeProducer(room, peer, pr);
      const t = transport(data?.transportId);
      const producer = await t.produce({ kind: data?.kind, rtpParameters: data?.rtpParameters, appData: { source, peerId: peer.id } });
      peer.producers.set(producer.id, producer);
      if (producer.kind === "audio" && source === "microphone") room.levels.addProducer({ producerId: producer.id }).catch(() => {});
      let lastQuality = "";
      producer.on("score", (scores) => {
        const q = QUALITY(Math.min(...scores.map((s) => s.score)));
        if (q === lastQuality) return;
        lastQuality = q;
        broadcast(room, "quality", { id: peer.id, quality: q }, { includeWaiting: false });
        send(peer, "quality", { id: peer.id, quality: q });
      });
      producer.on("transportclose", () => peer.producers.delete(producer.id));
      if (!peer.hidden) broadcast(room, "newProducer", { peerId: peer.id, producer: { id: producer.id, kind: producer.kind, source, paused: producer.paused } }, { except: peer.id });
      return { id: producer.id };
    }
    case "closeProducer": {
      const pr = peer.producers.get(String(data?.producerId));
      if (pr) closeProducer(room, peer, pr);
      return {};
    }
    case "pauseProducer":
    case "resumeProducer": {
      const pr = peer.producers.get(String(data?.producerId));
      if (!pr) throw new Error("Unknown producer");
      if (method === "pauseProducer") await pr.pause();
      else await pr.resume();
      broadcast(room, "producerPaused", { peerId: peer.id, producerId: pr.id, paused: pr.paused }, { except: peer.id });
      return {};
    }
    case "consume": {
      if (peer.waiting) throw new Error("Waiting to be admitted");
      const producerId = String(data?.producerId);
      const owner = [...room.peers.values()].find((p) => p.producers.has(producerId));
      if (!owner || owner.id === peer.id) throw new Error("Unknown producer");
      if (!room.router.canConsume({ producerId, rtpCapabilities: data?.rtpCapabilities })) throw new Error("Can't receive this media on this device");
      const t = transport(data?.transportId);
      const consumer = await t.consume({ producerId, rtpCapabilities: data?.rtpCapabilities, paused: true });
      peer.consumers.set(consumer.id, consumer);
      const forget = () => {
        peer.consumers.delete(consumer.id);
        send(peer, "consumerClosed", { consumerId: consumer.id });
      };
      consumer.on("transportclose", () => peer.consumers.delete(consumer.id));
      consumer.on("producerclose", forget);
      consumer.on("producerpause", () => send(peer, "consumerPaused", { consumerId: consumer.id, paused: true }));
      consumer.on("producerresume", () => send(peer, "consumerPaused", { consumerId: consumer.id, paused: false }));
      return {
        id: consumer.id,
        producerId,
        peerId: owner.id,
        kind: consumer.kind,
        source: (consumer.appData as any).source || ([...owner.producers.values()].find((p) => p.id === producerId)?.appData as any)?.source,
        rtpParameters: consumer.rtpParameters,
        producerPaused: consumer.producerPaused,
      };
    }
    case "resumeConsumer":
    case "pauseConsumer": {
      const c = peer.consumers.get(String(data?.consumerId));
      if (!c) return {};
      if (method === "resumeConsumer") await c.resume();
      else await c.pause();
      return {};
    }
    case "setLayers": {
      const c = peer.consumers.get(String(data?.consumerId));
      if (c && c.type === "simulcast") await c.setPreferredLayers({ spatialLayer: Math.max(0, Math.min(2, Number(data?.spatialLayer) || 0)) });
      return {};
    }
    case "data": {
      // Classroom data (hand, whiteboard, stage, captions…) to the room; the server stamps the sender
      if (peer.waiting || peer.hidden) throw new Error("Not allowed");
      if (!ctx.dataLimiter.hit(ctx.connId)) throw new Error("Too many messages");
      const message = data?.message;
      if (!message || typeof message !== "object" || JSON.stringify(message).length > 32_000) throw new Error("Invalid message");
      const to = Array.isArray(data?.to) ? data.to.map(String).slice(0, 50) : undefined;
      broadcast(room, "data", { message: { ...message, from: peer.id }, fromRole: peer.role, fromHost: peer.isHost }, { except: peer.id, to });
      return {};
    }
    case "leave": {
      closePeer(room, peer, "left");
      ctx.room = null;
      ctx.peer = null;
      return {};
    }
    default:
      throw new Error(`Unknown method ${method}`);
  }
}

function closeProducer(room: Room, peer: MediaPeer, pr: ms.Producer) {
  pr.close();
  peer.producers.delete(pr.id);
  broadcast(room, "producerClosed", { peerId: peer.id, producerId: pr.id });
}

interface Ctx {
  connId: string;
  /** The browser's address (behind a proxy, from X-Forwarded-For) */
  ip: string;
  ws: WebSocket;
  upgradeReq: http.IncomingMessage;
  cookieUser: Promise<SessionUser | null>;
  room: Room | null;
  peer: MediaPeer | null;
  dataLimiter: ReturnType<typeof createLimiter>;
}

export class JoinError extends Error {
  constructor(public reason: string, message: string, public extra?: unknown) {
    super(message);
  }
}

async function join(ctx: Ctx, data: any) {
  if (!enabled) throw new JoinError("unavailable", "The media server isn't running.");
  const user = (data?.ticket ? await userFromToken(String(data.ticket), "ws").then((r) => r?.user || null) : null) || (await ctx.cookieUser);
  if (!user) throw new JoinError("signed_out", "Your sign-in has expired. Sign in again to join the class.");
  const slug = String(data?.roomSlug || "").slice(0, 120);
  if (!slug) throw new JoinError("bad_request", "roomSlug is required");
  if (user.role === "parent") throw new JoinError("parent", "Parents can't join live classes from this account.");
  if (!(await canAccessRoom(user, slug))) throw new JoinError("not_enrolled", "You're not on this class's list. Check the link, or ask your teacher to add you.");
  if (isBreakoutRoom(slug) && !(await breakoutAllowed(user, slug))) throw new JoinError("not_in_group", "This breakout group isn't yours.");
  rememberTimezone(user.id, data?.device?.timezone).catch(() => {});
  if (!["instructor", "admin", "sales_rep", "auditor", "ta"].includes(user.role)) {
    // The device rules use the browser's request details (user agent, client hints, address)
    const fakeReq: any = {
      headers: ctx.upgradeReq.headers,
      ip: ctx.ip,
      user,
      get: (h: string) => ctx.upgradeReq.headers[h.toLowerCase()],
    };
    const evaluation = evaluateJoinRequest(fakeReq, slug, { id: user.id, name: user.name, role: user.role, studentCode: user.studentCode || undefined, email: user.email }, data?.device);
    if (evaluation.decision === "block") throw new JoinError("device", "This device is not allowed to join this class.", evaluation);
  }
  // Moving rooms (e.g. into a breakout group): leave the previous one first
  if (ctx.room && ctx.peer) closePeer(ctx.room, ctx.peer, "left");

  await admittedLoaded().catch(() => {});
  const room = await getRoom(slug);
  // The same account in this room on another tab or device: that one gives way
  const dup = room.peers.get(user.id);
  if (dup) {
    send(dup, "duplicate", {});
    closePeer(room, dup, "duplicate");
  }
  const peer: MediaPeer = {
    id: user.id,
    name: user.name || "Participant",
    role: user.role,
    avatarColor: user.avatarColor || null,
    gradeLevel: user.gradeLevel ?? null,
    isHost: await canHost(user, slug),
    waiting: user.role === "student" && !admittedByRoom.get(parentRoom(slug))?.has(user.id),
    hidden: user.role === "auditor",
    recordingExcluded: await isRecordingExcluded(user).catch(() => false),
    joinedAt: Date.now(),
    socket: ctx.ws,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };
  room.peers.set(peer.id, peer);
  ctx.room = room;
  ctx.peer = peer;
  if (!peer.hidden) broadcast(room, "peerJoined", publicPeer(peer), { except: peer.id, includeWaiting: true });
  fire(mediaHooks.joined, slug, peer);
  return {
    rtpCapabilities: room.router.rtpCapabilities,
    you: { id: peer.id, isHost: peer.isHost, waiting: peer.waiting, hidden: peer.hidden },
    peers: visiblePeers(room, peer),
  };
}

// ---------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
const requestLimiter = createLimiter(400, 1000);

wss.on("connection", (ws: WebSocket, upgradeReq: http.IncomingMessage) => {
  // Behind the reverse proxy (one hop, like Express's "trust proxy 1"): the last address it added
  const forwarded = String(upgradeReq.headers["x-forwarded-for"] || "").split(",").map((x) => x.trim()).filter(Boolean);
  const direct = (upgradeReq as any).__remoteAddress || "";
  const ctx: Ctx = {
    connId: `media-${crypto.randomUUID()}`,
    ip: forwarded.length ? forwarded[forwarded.length - 1] : direct,
    ws,
    upgradeReq,
    cookieUser: userFromCookieHeader(upgradeReq.headers.cookie).then((r) => r?.user || null).catch(() => null),
    room: null,
    peer: null,
    dataLimiter: createLimiter(60, 1000),
  };
  // A socket that never joins a room is closed
  const joinTimer = setTimeout(() => !ctx.peer && ws.close(4001, "join required"), 20_000);
  joinTimer.unref?.();
  ws.on("message", async (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.method !== "string") return;
    const reply = (body: Record<string, unknown>) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ id: msg.id, ...body }));
    if (!requestLimiter.hit(ctx.connId)) return reply({ ok: false, error: "Too many requests" });
    try {
      const data = await handleRequest(ctx, msg.method, msg.data);
      reply({ ok: true, data });
    } catch (err: any) {
      reply({ ok: false, error: err?.message || "Failed", reason: err?.reason, extra: err?.extra });
    }
  });
  ws.on("close", () => {
    clearTimeout(joinTimer);
    if (ctx.room && ctx.peer) closePeer(ctx.room, ctx.peer, "closed");
  });
  ws.on("error", () => {});
});

/** Takes the /media upgrade (true) or leaves it for someone else (false) */
export function handleMediaUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): boolean {
  const path = (req.url || "").split("?")[0];
  if (path !== "/media") return false;
  // The socket belongs to the WebSocket after this: keep the address for the device rules
  (req as any).__remoteAddress = (socket as any).remoteAddress;
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  return true;
}

// ---------------------------------------------------------------- the app's controls
/** Rooms for a class: the class room and its breakout groups */
const roomsOf = (classRoom: string) => [...rooms.values()].filter((r) => parentRoom(r.slug) === parentRoom(classRoom));

/** A server message to everyone in a class (and its breakout groups); `to` limits it to some people */
export function mediaSend(classRoom: string, topic: string, payload: unknown, to?: string[]) {
  for (const room of roomsOf(classRoom)) {
    broadcast(room, "data", { message: { topic, payload, from: "server" }, fromRole: "server", fromHost: true }, { includeWaiting: true, to });
  }
}

/** Lets admitted learners out of the lobby wherever they're connected in this class */
export function mediaAdmit(classRoom: string, userIds: string[]): string[] {
  const reached: string[] = [];
  for (const room of roomsOf(classRoom)) {
    for (const id of userIds) {
      const p = room.peers.get(id);
      if (!p || !p.waiting) continue;
      p.waiting = false;
      reached.push(id);
      send(p, "admitted", { peers: visiblePeers(room, p) });
      broadcast(room, "peerUpdated", publicPeer(p), { except: p.id, includeWaiting: true });
    }
  }
  return reached;
}

/** Host mutes someone's microphone or stops their camera (they can turn it back on themselves) */
export async function mediaMute(roomSlug: string, userId: string, kind: "audio" | "video"): Promise<number> {
  const room = rooms.get(roomSlug);
  const p = room?.peers.get(userId);
  if (!room || !p) return -1;
  let n = 0;
  for (const pr of p.producers.values()) {
    const source = (pr.appData as any).source;
    if ((kind === "audio" && source === "microphone") || (kind === "video" && source === "camera")) {
      await pr.pause();
      n++;
      send(p, "mutedByHost", { source, producerId: pr.id });
      broadcast(room, "producerPaused", { peerId: p.id, producerId: pr.id, paused: true }, { except: p.id });
    }
  }
  return n;
}

/** Sends someone out of the class (and its breakout groups) */
export function mediaRemove(classRoom: string, userId: string, reason: "removed" | "denied") {
  for (const room of roomsOf(classRoom)) {
    const p = room.peers.get(userId);
    if (!p) continue;
    send(p, "removed", { reason });
    closePeer(room, p, "removed");
  }
}

/** Who's connected (for "is the class still going", parents' live checks, the observer) */
export function mediaRoomList() {
  return [...rooms.values()].map((r) => ({ name: r.slug, numParticipants: r.peers.size }));
}
export const mediaPresence = (roomSlug: string) => rooms.get(roomSlug)?.peers.size || 0;
export const mediaHasPeer = (roomSlug: string, userId: string) => Boolean(rooms.get(roomSlug)?.peers.has(userId));
export function mediaPeers(roomSlug: string) {
  const room = rooms.get(roomSlug);
  return room ? [...room.peers.values()].map(publicPeer) : [];
}

/** A parent changed recording consent mid-class: everyone's screen shows it */
export function mediaSetRecordingExcluded(userId: string, excluded: boolean) {
  for (const room of rooms.values()) {
    const p = room.peers.get(userId);
    if (!p) continue;
    p.recordingExcluded = excluded;
    broadcast(room, "peerUpdated", publicPeer(p), { includeWaiting: true });
  }
}
