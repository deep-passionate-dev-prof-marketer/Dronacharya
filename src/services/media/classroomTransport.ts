/**
 * Classroom media + data transport.
 *
 * Primary path: the school's own media server (SFU on this server, see src/server/media). Each
 * participant sends their camera and microphone once; the server forwards them to everyone, at a
 * video quality that fits each viewer's tile and connection (simulcast). Only when the media server
 * isn't running does everyone use the peer-to-peer mesh in webRtcMeshService (small classes).
 * Any other failure retries with a visible reason: falling back silently would put the teacher and
 * the learners on different paths, where they can't see or hear each other.
 *
 * The rest of the app only sees Participant objects and typed data messages.
 */
import type { Device as MsDevice, types as msTypes } from "mediasoup-client";
import { webRtcMeshService, RemotePeerInfo } from "../webRtcMeshService";
import { realtimeSocket, RoomJoinState } from "../realtimeSocket";
import type { Participant, UserRole } from "../../types";

export type TransportMode = "sfu" | "mesh" | "none";
export type TransportStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export type TransportError =
  | "device_blocked"
  | "duplicate_identity"
  | "removed"
  | "denied"
  | "not_enrolled"
  | "not_in_group"
  | "parent"
  | "signed_out"
  | "connect_failed";

export interface TransportState {
  mode: TransportMode;
  status: TransportStatus;
  /** Browser blocked autoplay of remote audio; call startAudio() from a user gesture */
  audioBlocked: boolean;
  error?: TransportError;
  /** What went wrong, in words the person can act on (shown in the class banner) */
  errorMessage?: string;
  /** When the next automatic retry happens (epoch ms), for "Retrying in 8 s" */
  retryAt?: number;
  /** This learner is in the waiting room (connected, but no media until admitted) */
  waiting?: boolean;
  /** Last time one of our own tracks was muted from outside (e.g. by the teacher) */
  localMuted?: { kind: "audio" | "video"; at: number };
  /** Audio + slides only: remote cameras off, screen share at its low layer */
  lowBandwidth?: boolean;
  /** Our connection has been poor for a while: offer low-bandwidth mode */
  suggestLowBandwidth?: boolean;
}

export type DataTopic =
  | "caption"
  | "class_status"
  | "hand"
  | "chat"
  | "wb_stroke"
  | "wb_clear"
  | "wb_sync_request"
  | "wb_sync"
  | "stage"
  | "poll"
  | "poll_results"
  | "admitted"
  | "removed"
  | "slides"
  | "pad"
  | "breakouts";

export interface JoinParams {
  roomSlug: string;
  user: { id: string; name: string; role: UserRole; avatarColor?: string; studentCode?: string; gradeLevel?: number; email?: string };
  localStream?: MediaStream | null;
  device?: unknown;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export class DeviceBlockedError extends Error {
  constructor(public evaluation: unknown) {
    super("This device is not allowed to join this class.");
  }
}

/** The server said no (not on the class list, not this breakout group, parent account, signed out). */
export class RoomAccessError extends Error {
  constructor(public reason: "not_enrolled" | "not_in_group" | "parent" | "signed_out", message: string) {
    super(message);
  }
}

const BREAKOUT_SEP = "--bo-";
/** The class a room belongs to (a breakout room's parent; otherwise the room itself) */
export const parentRoomOf = (slug: string) => (slug.includes(BREAKOUT_SEP) ? slug.slice(0, slug.indexOf(BREAKOUT_SEP)) : slug);

type PeersListener = (peers: Participant[]) => void;
type StateListener = (s: TransportState) => void;
type DataListener = (payload: any, fromId: string, fromHost: boolean) => void;

const HOST_ROLES = ["instructor", "admin", "sales_rep"];
/** Only the server may change these (class state, polls, admission); clients can't spoof them. */
const SERVER_ONLY: DataTopic[] = ["class_status", "poll", "poll_results", "admitted", "removed", "slides", "pad", "breakouts"];
/** Only hosts may send these (room-wide stage changes, whiteboard snapshots). */
const HOST_ONLY: DataTopic[] = ["stage", "wb_sync"];

type Source = "camera" | "microphone" | "screen" | "screen_audio";
type Quality = NonNullable<Participant["connectionQuality"]>;

// Camera: three layers so small tiles and weak connections get a small stream
const CAMERA_ENCODINGS: RTCRtpEncodingParameters[] = [
  { rid: "r0", scaleResolutionDownBy: 4, maxBitrate: 150_000, maxFramerate: 15 },
  { rid: "r1", scaleResolutionDownBy: 2, maxBitrate: 450_000, maxFramerate: 24 },
  { rid: "r2", scaleResolutionDownBy: 1, maxBitrate: 1_200_000, maxFramerate: 30 },
];
// Screen: a readable low layer (5 fps) for weak connections, a sharp one for everyone else
const SCREEN_ENCODINGS: RTCRtpEncodingParameters[] = [
  { rid: "s0", scaleResolutionDownBy: 1.5, maxBitrate: 400_000, maxFramerate: 5 },
  { rid: "s1", scaleResolutionDownBy: 1, maxBitrate: 2_000_000, maxFramerate: 15 },
];

/** mediasoup-client loads only when someone joins a class (not on the sign-in screen). */
let msLoading: Promise<typeof import("mediasoup-client")> | null = null;
const loadMediasoup = () => (msLoading ||= import("mediasoup-client"));

// ---------------------------------------------------------------- signalling socket
class MediaSocket {
  private ws: WebSocket | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void; timer: ReturnType<typeof setTimeout> }>();
  onNotification: (method: string, data: any) => void = () => {};
  onClose: (code: number) => void = () => {};

  open(): Promise<void> {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${protocol}//${window.location.host}/media`);
      this.ws = ws;
      const fail = setTimeout(() => {
        reject(new Error("The media server didn't answer."));
        ws.close();
      }, 10_000);
      ws.onopen = () => {
        clearTimeout(fail);
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(fail);
        reject(new Error("Couldn't reach the media server."));
      };
      ws.onmessage = (ev) => {
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.notification) return this.onNotification(msg.method, msg.data);
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.ok) p.resolve(msg.data);
        else p.reject(Object.assign(new Error(msg.error || "Failed"), { reason: msg.reason, extra: msg.extra }));
      };
      ws.onclose = (ev) => {
        clearTimeout(fail);
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new Error("Connection to the media server closed."));
        }
        this.pending.clear();
        if (this.ws === ws) this.onClose(ev.code);
      };
    });
  }

  request<T = any>(method: string, data?: unknown, timeoutMs = 15_000): Promise<T> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Not connected to the media server."));
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`The media server didn't answer (${method}).`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, data }));
    });
  }

  close() {
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
  }
}

// ---------------------------------------------------------------- remote people
interface RemoteProducer {
  id: string;
  kind: "audio" | "video";
  source: Source;
  paused: boolean;
}
interface RemotePeer {
  id: string;
  name: string;
  role: UserRole;
  avatarColor: string | null;
  gradeLevel: number | null;
  waiting: boolean;
  joinedAt: number;
  producers: Map<string, RemoteProducer>;
  /** What we receive from them, by source */
  consumers: Map<Source, msTypes.Consumer>;
  speaking: boolean;
  volume: number;
  quality: Quality;
}

class ClassroomTransport {
  private state: TransportState = { mode: "none", status: "idle", audioBlocked: false };
  private peersListeners = new Set<PeersListener>();
  private stateListeners = new Set<StateListener>();
  private dataListeners = new Map<DataTopic, Set<DataListener>>();
  private handRaised = new Map<string, boolean>();
  private meshPeers = new Map<string, RemotePeerInfo>();
  private meshUnbind: Array<() => void> = [];
  private audioContainer: HTMLDivElement | null = null;
  private roomSlug = "";
  private selfId = "";
  private lastParams: JoinParams | null = null;
  /** The newest camera/mic stream from the app (kept while waiting, published once admitted) */
  private latestLocalStream: MediaStream | null = null;
  private rejoinAttempts = 0;
  private rejoinTimer: ReturnType<typeof setTimeout> | null = null;
  /** Direct (peer-to-peer) mode: checks whether the media server came back, to move everyone onto it */
  private upgradeTimer: ReturnType<typeof setInterval> | null = null;
  private meshStarted = false;

  // Media-server session
  private sock: MediaSocket | null = null;
  private device: MsDevice | null = null;
  private sendTransport: msTypes.Transport | null = null;
  private recvTransport: msTypes.Transport | null = null;
  private producers = new Map<Source, msTypes.Producer>();
  private peers = new Map<string, RemotePeer>();
  private hidden = false;
  private selfSpeaking = false;
  private selfQuality: Quality = "unknown";
  /** Video consumers and the element showing each, for picking a layer that fits the tile */
  private layerWatch = new Map<string, { el: HTMLVideoElement; ro: ResizeObserver; layer: number }>();

  constructor() {
    // Server messages (class status, polls, admission) also arrive over the room WebSocket, so they
    // reach people in direct mode and anyone who reconnected a moment after a send
    realtimeSocket.on("SERVER_ROOM_DATA", (d: any) => {
      if (!this.roomSlug || !d?.message || d.roomId !== parentRoomOf(this.roomSlug)) return;
      this.handleServerMessage(d.message);
    });
  }

  // ---------------------------------------------------------------- subscriptions
  onPeers(cb: PeersListener) {
    this.peersListeners.add(cb);
    cb(this.snapshotPeers());
    return () => {
      this.peersListeners.delete(cb);
    };
  }

  onState(cb: StateListener) {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  onData(topic: DataTopic, cb: DataListener) {
    if (!this.dataListeners.has(topic)) this.dataListeners.set(topic, new Set());
    this.dataListeners.get(topic)!.add(cb);
    return () => {
      this.dataListeners.get(topic)?.delete(cb);
    };
  }

  getState() {
    return this.state;
  }

  // ---------------------------------------------------------------- lifecycle
  async join(params: JoinParams): Promise<TransportMode> {
    if (this.roomSlug === params.roomSlug && this.selfId === params.user.id && this.state.status !== "disconnected" && this.state.mode !== "none") {
      return this.state.mode;
    }
    await this.leave();
    this.lastParams = params;
    this.roomSlug = params.roomSlug;
    this.selfId = params.user.id;
    if (this.wantMic === null) this.wantMic = params.audioEnabled;
    if (this.wantCamera === null) this.wantCamera = params.videoEnabled;
    this.setState({ mode: "none", status: "connecting", audioBlocked: false });

    // Is the media server running? If not, everyone uses direct video
    let sfu = true;
    try {
      const res = await fetch("/api/media/status");
      if (!(res.headers.get("content-type") || "").includes("application/json")) throw new Error("not the class server");
      sfu = Boolean((await res.json()).sfu);
    } catch {
      this.scheduleRetry("The class server can't be reached. Check your connection.");
      return "none";
    }
    if (params !== this.lastParams) return "none";
    if (!sfu) {
      this.joinMesh(params);
      return "mesh";
    }

    try {
      await this.joinSfu(params);
      return "sfu";
    } catch (err: any) {
      if (params !== this.lastParams) return "none";
      this.teardownSfu();
      const reason = err?.reason as string | undefined;
      if (reason === "device") {
        this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: "device_blocked" });
        throw new DeviceBlockedError(err.extra);
      }
      if (reason === "not_enrolled" || reason === "not_in_group" || reason === "parent" || reason === "signed_out") {
        this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: reason, errorMessage: err.message });
        throw new RoomAccessError(reason, err.message);
      }
      if (reason === "unavailable") {
        this.joinMesh(params);
        return "mesh";
      }
      console.warn("[Transport] media server connect failed:", err);
      this.scheduleRetry(err?.message?.includes("media server") ? `${err.message} A firewall may be blocking it.` : "Couldn't connect to the class video. Retrying…");
      return "none";
    }
  }

  /** Try again later, with the reason on screen; backs off to every 30 s. */
  private scheduleRetry(message: string) {
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
    const delay = Math.min(2000 * 2 ** this.rejoinAttempts++, 30_000);
    this.setState({ mode: "none", status: "reconnecting", audioBlocked: false, error: "connect_failed", errorMessage: message, retryAt: Date.now() + delay });
    const params = this.lastParams;
    this.rejoinTimer = setTimeout(() => {
      this.rejoinTimer = null;
      if (params && params === this.lastParams) {
        this.roomSlug = "";
        this.join(params).catch(() => {});
      }
    }, delay);
  }

  /** "Try again now" from the banner */
  retryNow() {
    if (!this.lastParams) return;
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
    this.rejoinTimer = null;
    this.rejoinAttempts = 0;
    this.roomSlug = "";
    this.join(this.lastParams).catch(() => {});
  }

  /** Take the class back after it was opened in another tab/device, or retry after a drop. */
  async rejoin() {
    if (!this.lastParams) return;
    const params = this.lastParams;
    this.roomSlug = "";
    this.rejoinAttempts = 0;
    await this.join(params);
  }

  /** Forget the room entirely (signed out, or left the class): no automatic retries. */
  async reset() {
    this.lastParams = null;
    this.roomSlug = "";
    this.wantMic = null;
    this.wantCamera = null;
    await this.leave();
  }

  async leave() {
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
    this.rejoinTimer = null;
    if (this.upgradeTimer) clearInterval(this.upgradeTimer);
    this.upgradeTimer = null;
    if (this.sock) {
      // Tell the server first so the others see us go at once
      await this.sock.request("leave", {}, 1500).catch(() => {});
    }
    this.teardownSfu();
    this.meshUnbind.forEach((u) => u());
    this.meshUnbind = [];
    if (this.meshStarted) webRtcMeshService.leaveRoom();
    this.meshStarted = false;
    this.meshPeers.clear();
    this.handRaised.clear();
    this.audioContainer?.remove();
    this.audioContainer = null;
    this.setState({ mode: "none", status: "disconnected", audioBlocked: false });
    this.emitPeers();
  }

  /** Drops the media-server session (no network calls). Local camera/mic tracks are the app's: never stopped here. */
  private teardownSfu() {
    const sock = this.sock;
    this.sock = null;
    if (sock) {
      sock.onClose = () => {};
      sock.onNotification = () => {};
      sock.close();
    }
    for (const w of this.layerWatch.values()) w.ro.disconnect();
    this.layerWatch.clear();
    for (const p of this.peers.values()) for (const c of p.consumers.values()) c.close();
    this.peers.clear();
    this.producers.clear();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
    this.audioContainer?.querySelectorAll("audio").forEach((el) => el.remove());
  }

  /** Must be called from a user gesture when audioBlocked is true (mobile autoplay rules). */
  async startAudio() {
    let blocked = false;
    for (const a of Array.from(this.audioContainer?.querySelectorAll("audio") || [])) await (a as HTMLAudioElement).play().catch(() => (blocked = true));
    this.setState({ ...this.state, audioBlocked: blocked });
  }

  // ---------------------------------------------------------------- media server
  private async joinSfu(params: JoinParams) {
    const ms = await loadMediasoup();
    const sock = new MediaSocket();
    this.sock = sock;
    sock.onNotification = (method, data) => this.onNotification(sock, method, data);
    sock.onClose = (code) => this.onSocketClosed(sock, code);
    await sock.open();
    let ticket: string | undefined;
    try {
      const res = await fetch("/api/auth/ws-ticket");
      if (res.ok) ticket = (await res.json()).ticket;
    } catch {}
    const joined = await sock.request<{ rtpCapabilities: msTypes.RtpCapabilities; you: { id: string; isHost: boolean; waiting: boolean; hidden: boolean }; peers: any[] }>("join", {
      roomSlug: params.roomSlug,
      device: params.device,
      ticket,
    });
    if (this.sock !== sock) return;
    const device = new ms.Device();
    await device.load({ routerRtpCapabilities: joined.rtpCapabilities });
    this.device = device;
    this.hidden = joined.you.hidden;
    this.peers.clear();
    for (const p of joined.peers) this.upsertPeer(p);
    this.rejoinAttempts = 0;
    this.setState({ mode: "sfu", status: "connected", audioBlocked: false, waiting: joined.you.waiting });
    if (!joined.you.waiting) await this.startMedia(params);
    this.emitPeers();
  }

  /** Once in (not waiting): receive everyone, then send our camera and microphone */
  private async startMedia(params: JoinParams | null) {
    await this.ensureRecvTransport();
    for (const p of this.peers.values()) for (const pr of p.producers.values()) this.consume(p.id, pr).catch(() => {});
    if (!this.hidden && params && params.user.role !== "auditor") await this.replaceLocalStream(this.latestLocalStream || params.localStream || null);
  }

  private async createTransport(direction: "send" | "recv") {
    const sock = this.sock!;
    const info = await sock.request("createTransport", { direction });
    const t = direction === "send" ? this.device!.createSendTransport(info) : this.device!.createRecvTransport(info);
    t.on("connect", ({ dtlsParameters }, ok, fail) => {
      sock.request("connectTransport", { transportId: t.id, dtlsParameters }).then(() => ok(), fail);
    });
    if (direction === "send") {
      t.on("produce", ({ kind, rtpParameters, appData }, ok, fail) => {
        sock.request<{ id: string }>("produce", { transportId: t.id, kind, rtpParameters, source: (appData as any).source }).then(({ id }) => ok({ id }), fail);
      });
    }
    t.on("connectionstatechange", (state) => {
      if (this.sock !== sock) return;
      if (state === "failed" || state === "disconnected") {
        this.setState({ ...this.state, status: "reconnecting" });
        // A network change: new ICE credentials usually bring it back; otherwise rejoin
        sock
          .request<{ iceParameters: msTypes.IceParameters }>("restartIce", { transportId: t.id })
          .then(({ iceParameters }) => t.restartIce({ iceParameters }))
          .catch(() => this.onSocketClosed(sock, 1006));
      } else if (state === "connected" && this.state.status === "reconnecting") {
        this.setState({ ...this.state, status: "connected" });
      }
    });
    return t;
  }

  private async ensureRecvTransport() {
    if (!this.recvTransport) this.recvTransport = await this.createTransport("recv");
    return this.recvTransport;
  }
  private async ensureSendTransport() {
    if (!this.sendTransport) this.sendTransport = await this.createTransport("send");
    return this.sendTransport;
  }

  private async consume(peerId: string, pr: RemoteProducer) {
    if (!this.sock || !this.device || this.state.waiting) return;
    const peer = this.peers.get(peerId);
    if (!peer || peer.consumers.has(pr.source)) return;
    // Low-bandwidth mode: no cameras at all
    if (this.lowBandwidth && pr.source === "camera") return;
    const sock = this.sock;
    const t = await this.ensureRecvTransport();
    const info = await sock.request("consume", { transportId: t.id, producerId: pr.id, rtpCapabilities: this.device.rtpCapabilities });
    if (this.sock !== sock || this.peers.get(peerId) !== peer) return;
    const consumer = await t.consume({ id: info.id, producerId: info.producerId, kind: info.kind, rtpParameters: info.rtpParameters, appData: { source: info.source, peerId } });
    peer.consumers.set(info.source, consumer);
    if (consumer.kind === "audio") this.attachAudio(consumer.track, peerId, info.source);
    // Screen at its sharp layer unless saving bandwidth; cameras start small and grow with the tile
    if (info.source === "screen") sock.request("setLayers", { consumerId: consumer.id, spatialLayer: this.lowBandwidth ? 0 : 1 }).catch(() => {});
    else if (info.source === "camera") sock.request("setLayers", { consumerId: consumer.id, spatialLayer: 0 }).catch(() => {});
    await sock.request("resumeConsumer", { consumerId: consumer.id }).catch(() => {});
    this.emitPeers();
  }

  private dropConsumer(consumerId: string) {
    for (const p of this.peers.values()) {
      for (const [source, c] of p.consumers) {
        if (c.id !== consumerId) continue;
        c.close();
        p.consumers.delete(source);
        this.layerWatch.get(c.id)?.ro.disconnect();
        this.layerWatch.delete(c.id);
        this.audioContainer?.querySelector(`audio[data-consumer="${CSS.escape(c.id)}"]`)?.remove();
      }
    }
  }

  private upsertPeer(p: any) {
    const existing = this.peers.get(p.id);
    const peer: RemotePeer = existing || {
      id: p.id,
      name: p.name,
      role: p.role,
      avatarColor: p.avatarColor,
      gradeLevel: p.gradeLevel,
      waiting: p.waiting,
      joinedAt: p.joinedAt,
      producers: new Map(),
      consumers: new Map(),
      speaking: false,
      volume: 0,
      quality: "unknown",
    };
    peer.name = p.name;
    peer.waiting = Boolean(p.waiting);
    peer.producers = new Map((p.producers || []).map((pr: RemoteProducer) => [pr.id, pr]));
    this.peers.set(peer.id, peer);
    return peer;
  }

  private onNotification(sock: MediaSocket, method: string, data: any) {
    if (this.sock !== sock) return;
    switch (method) {
      case "peerJoined":
      case "peerUpdated": {
        const peer = this.upsertPeer(data);
        for (const pr of peer.producers.values()) this.consume(peer.id, pr).catch(() => {});
        break;
      }
      case "peerLeft": {
        const peer = this.peers.get(data?.id);
        if (peer) {
          for (const c of peer.consumers.values()) this.dropConsumer(c.id);
          this.peers.delete(peer.id);
          this.handRaised.delete(peer.id);
          this.audioContainer?.querySelectorAll(`audio[data-participant="${CSS.escape(peer.id)}"]`).forEach((el) => el.remove());
        }
        break;
      }
      case "newProducer": {
        const peer = this.peers.get(data?.peerId);
        if (!peer) break;
        peer.producers.set(data.producer.id, data.producer);
        this.consume(peer.id, data.producer).catch(() => {});
        break;
      }
      case "producerClosed": {
        const peer = this.peers.get(data?.peerId);
        const pr = peer?.producers.get(data?.producerId);
        if (!peer || !pr) break;
        peer.producers.delete(pr.id);
        const c = peer.consumers.get(pr.source);
        if (c) this.dropConsumer(c.id);
        break;
      }
      case "producerPaused": {
        const pr = this.peers.get(data?.peerId)?.producers.get(data?.producerId);
        if (pr) pr.paused = Boolean(data.paused);
        break;
      }
      case "consumerClosed":
        this.dropConsumer(data?.consumerId);
        break;
      case "speakers": {
        const loud = new Map<string, number>((data?.speakers || []).map((s: any) => [s.id, s.volume]));
        for (const p of this.peers.values()) {
          p.speaking = loud.has(p.id);
          p.volume = loud.get(p.id) ?? -100;
        }
        this.selfSpeaking = loud.has(this.selfId);
        break;
      }
      case "quality": {
        if (data?.id === this.selfId) {
          this.selfQuality = data.quality;
          this.watchLocalQuality(data.quality);
        } else {
          const p = this.peers.get(data?.id);
          if (p) p.quality = data.quality;
        }
        break;
      }
      case "data": {
        const msg = data?.message;
        if (!msg?.topic) break;
        if (msg.from === "server") this.handleServerMessage(msg);
        else this.dispatchData(msg, msg.from, data.fromHost ? "instructor" : data.fromRole || "");
        return; // data listeners update what they need
      }
      case "admitted": {
        if (!this.state.waiting) break;
        this.setState({ ...this.state, waiting: false });
        for (const p of data?.peers || []) this.upsertPeer(p);
        this.startMedia(this.lastParams).catch((err) => console.warn("[Transport] starting media after admission failed", err));
        break;
      }
      case "mutedByHost": {
        const source = data?.source as Source;
        const pr = this.producers.get(source);
        pr?.pause();
        if (source === "microphone") this.wantMic = false;
        if (source === "camera") this.wantCamera = false;
        this.setState({ ...this.state, localMuted: { kind: source === "microphone" ? "audio" : "video", at: Date.now() } });
        break;
      }
      case "removed": {
        const denied = Boolean(this.state.waiting) || data?.reason === "denied";
        this.teardownSfu();
        this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: denied ? "denied" : "removed", waiting: false });
        break;
      }
      case "duplicate": {
        // Same account opened the class in another tab/device; the person chooses where to continue
        this.teardownSfu();
        this.setState({ ...this.state, mode: "none", status: "disconnected", error: "duplicate_identity" });
        break;
      }
    }
    this.emitPeers();
  }

  /** The connection dropped (network, server restart): rejoin automatically so the class carries on */
  private onSocketClosed(sock: MediaSocket, code: number) {
    if (this.sock !== sock) return;
    this.teardownSfu();
    if (code === 4000) return; // closed on purpose by the server (removed / duplicate); handled by its notification
    this.setState({ ...this.state, mode: "none", status: "reconnecting" });
    const delay = Math.min(1000 * 2 ** this.rejoinAttempts++, 15000);
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
    this.rejoinTimer = setTimeout(() => {
      this.rejoinTimer = null;
      if (this.lastParams) {
        this.roomSlug = "";
        this.join(this.lastParams).catch(() => {});
      }
    }, delay);
    this.emitPeers();
  }

  // ---------------------------------------------------------------- local media controls
  /**
   * What the person chose for their mic and camera. Remembered even before anything is published
   * (e.g. muting in the waiting room), and applied the moment tracks are published.
   */
  private wantMic: boolean | null = null;
  private wantCamera: boolean | null = null;

  async setMicEnabled(enabled: boolean) {
    this.wantMic = enabled;
    await this.setProducerPaused("microphone", !enabled);
  }

  async setCameraEnabled(enabled: boolean) {
    this.wantCamera = enabled;
    await this.setProducerPaused("camera", !enabled);
  }

  private async setProducerPaused(source: Source, paused: boolean) {
    const pr = this.producers.get(source);
    if (!pr || !this.sock) return;
    if (paused) pr.pause();
    else pr.resume();
    await this.sock.request(paused ? "pauseProducer" : "resumeProducer", { producerId: pr.id }).catch(() => {});
  }

  private publishQueue: Promise<void> = Promise.resolve();
  private lowBandwidth = false;
  private poorSince: number | null = null;
  private poorTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestionDismissed = false;

  /** Audio + slides only. Remote cameras are switched off (nothing downloaded), screen share drops to its low layer. */
  setLowBandwidth(on: boolean) {
    this.lowBandwidth = on;
    this.setState({ ...this.state, lowBandwidth: on, suggestLowBandwidth: false });
    const sock = this.sock;
    if (sock) {
      for (const p of this.peers.values()) {
        const cam = p.consumers.get("camera");
        if (on && cam) this.dropConsumer(cam.id);
        if (!on) for (const pr of p.producers.values()) if (pr.source === "camera") this.consume(p.id, pr).catch(() => {});
        const screen = p.consumers.get("screen");
        if (screen) sock.request("setLayers", { consumerId: screen.id, spatialLayer: on ? 0 : 1 }).catch(() => {});
      }
    }
    this.emitPeers();
  }

  dismissLowBandwidthSuggestion() {
    this.suggestionDismissed = true;
    this.setState({ ...this.state, suggestLowBandwidth: false });
  }

  /** Poor connection for 10s in a row → suggest low-bandwidth mode (once, unless dismissed). */
  private watchLocalQuality(quality: Quality) {
    const poor = quality === "poor" || quality === "lost";
    if (!poor) {
      this.poorSince = null;
      if (this.poorTimer) clearTimeout(this.poorTimer);
      this.poorTimer = null;
      return;
    }
    if (this.lowBandwidth || this.suggestionDismissed || this.poorSince) return;
    this.poorSince = Date.now();
    this.poorTimer = setTimeout(() => {
      if (this.poorSince && !this.lowBandwidth && !this.suggestionDismissed) this.setState({ ...this.state, suggestLowBandwidth: true });
    }, 10_000);
  }

  /**
   * Send the app's camera/mic stream (first permission grant, device change, or once admitted).
   * Calls are queued so two overlapping calls never publish the microphone twice.
   */
  replaceLocalStream(stream: MediaStream | null): Promise<void> {
    if (stream) this.latestLocalStream = stream;
    const run = this.publishQueue.then(() => this.doReplaceLocalStream(stream));
    this.publishQueue = run.catch(() => {});
    return run;
  }

  private async doReplaceLocalStream(stream: MediaStream | null) {
    if (this.state.mode === "mesh") {
      if (stream) webRtcMeshService.setLocalStream(stream);
      return;
    }
    if (this.state.mode !== "sfu" || !stream || this.state.waiting || this.hidden || !this.device) return;
    const audio = stream.getAudioTracks()[0];
    const video = stream.getVideoTracks()[0];
    if (audio) await this.publish("microphone", audio);
    if (video) await this.publish("camera", video);
    // Keep the person's own choice (muted in the lobby stays muted once admitted)
    if (this.wantMic === false) await this.setProducerPaused("microphone", true);
    if (this.wantCamera === false) await this.setProducerPaused("camera", true);
  }

  private async publish(source: Source, track: MediaStreamTrack) {
    const existing = this.producers.get(source);
    if (existing && !existing.closed) {
      // Same source, new device: swap the track without renegotiating
      if (existing.track !== track) await existing.replaceTrack({ track }).catch(() => {});
      return;
    }
    const t = await this.ensureSendTransport();
    const producer = await t.produce({
      track,
      appData: { source },
      stopTracks: false,
      ...(source === "camera"
        ? { encodings: CAMERA_ENCODINGS, codecOptions: { videoGoogleStartBitrate: 800 } }
        : source === "screen"
        ? { encodings: SCREEN_ENCODINGS }
        : source === "microphone"
        ? { codecOptions: { opusDtx: true, opusFec: true, opusStereo: false } }
        : {}),
    });
    this.producers.set(source, producer);
    producer.on("transportclose", () => this.producers.delete(source));
  }

  async publishScreen(track: MediaStreamTrack | null) {
    if (this.state.mode !== "sfu" || !this.sock) return;
    const existing = this.producers.get("screen");
    if (existing) {
      existing.close();
      this.producers.delete("screen");
      await this.sock.request("closeProducer", { producerId: existing.id }).catch(() => {});
    }
    if (track) {
      // Text and slides stay sharp: favour resolution over frame rate
      try {
        (track as any).contentHint = "detail";
      } catch {}
      await this.publish("screen", track).catch((err) => console.warn("[Transport] screen publish failed", err));
    }
  }

  // ---------------------------------------------------------------- data
  sendData(topic: DataTopic, payload: unknown, opts: { reliable?: boolean; to?: string[] } = {}) {
    const message = { topic, payload, from: this.selfId };
    if (topic === "hand") this.handRaised.set(this.selfId, Boolean((payload as any)?.raised));
    if (this.state.mode === "sfu" && this.sock) {
      this.sock.request("data", { message, to: opts.to }).catch(() => {});
      return;
    }
    // Direct mode: relay through our realtime server
    realtimeSocket.send("ROOM_DATA", { roomId: this.roomSlug, message });
  }

  // ---------------------------------------------------------------- remote audio and video
  /** Remote audio lives outside React so layout changes, swipes and re-renders never interrupt it. */
  private attachAudio(track: MediaStreamTrack, peerId: string, source: string) {
    if (!this.audioContainer) {
      this.audioContainer = document.createElement("div");
      this.audioContainer.id = "classroom-remote-audio";
      this.audioContainer.style.display = "none";
      document.body.appendChild(this.audioContainer);
    }
    const el = document.createElement("audio");
    el.autoplay = true;
    el.dataset.participant = peerId;
    el.dataset.source = source;
    const consumer = this.peers.get(peerId)?.consumers.get(source as Source);
    if (consumer) el.dataset.consumer = consumer.id;
    el.srcObject = new MediaStream([track]);
    this.audioContainer.appendChild(el);
    el.play().catch(() => this.setState({ ...this.state, audioBlocked: true }));
  }

  /** Shows a remote video in an element, at a layer that fits the element (small tiles get the small layer) */
  private attachConsumer(consumer: msTypes.Consumer, el: HTMLVideoElement, isScreen: boolean) {
    el.srcObject = new MediaStream([consumer.track]);
    el.play().catch(() => {});
    if (isScreen) return () => {
      if ((el.srcObject as MediaStream | null)?.getVideoTracks()[0] === consumer.track) el.srcObject = null;
    };
    const sock = this.sock;
    const pick = () => {
      const w = el.clientWidth * (window.devicePixelRatio || 1);
      const layer = w > 900 ? 2 : w > 360 ? 1 : 0;
      const watch = this.layerWatch.get(consumer.id);
      if (!watch || watch.layer === layer || !sock) return;
      watch.layer = layer;
      sock.request("setLayers", { consumerId: consumer.id, spatialLayer: layer }).catch(() => {});
    };
    const ro = new ResizeObserver(pick);
    this.layerWatch.get(consumer.id)?.ro.disconnect();
    this.layerWatch.set(consumer.id, { el, ro, layer: 0 });
    ro.observe(el);
    pick();
    return () => {
      ro.disconnect();
      if (this.layerWatch.get(consumer.id)?.el === el) this.layerWatch.delete(consumer.id);
      if ((el.srcObject as MediaStream | null)?.getVideoTracks()[0] === consumer.track) el.srcObject = null;
    };
  }

  private sfuPeer(p: RemotePeer): Participant {
    const prOf = (source: Source) => [...p.producers.values()].find((x) => x.source === source);
    const mic = prOf("microphone");
    const cam = prOf("camera");
    const camC = p.consumers.get("camera");
    const screenC = p.consumers.get("screen");
    return {
      id: p.id,
      name: p.name || p.id,
      role: (p.role || "student") as UserRole,
      avatarColor: p.avatarColor || "#0082FF",
      isLocal: false,
      audioEnabled: Boolean(mic && !mic.paused),
      videoEnabled: Boolean(cam && !cam.paused && camC),
      screenSharing: Boolean(screenC),
      handRaised: this.handRaised.get(p.id) || false,
      breakoutRoomId: null,
      // Volume in dBov (-127..0) to a rough 0..100 level
      audioLevel: p.speaking ? Math.max(0, Math.min(100, Math.round(((p.volume + 70) / 70) * 100))) : 0,
      isSpeaking: p.speaking,
      connectionQuality: p.quality,
      attendanceStatus: "present",
      joinedAt: p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      joinedAtMs: p.joinedAt || undefined,
      xpPoints: 0,
      gradeLevel: p.gradeLevel ?? undefined,
      waiting: p.waiting,
      attachVideo: camC ? (el: HTMLVideoElement) => this.attachConsumer(camC, el, false) : undefined,
      attachScreen: screenC ? (el: HTMLVideoElement) => this.attachConsumer(screenC, el, true) : undefined,
    };
  }

  // ---------------------------------------------------------------- Mesh fallback
  /**
   * Direct mode (the media server isn't running). Signalling goes through the room WebSocket, so the
   * mesh starts once that socket is in the room, and only after a host admits a waiting learner.
   */
  private joinMesh(params: JoinParams) {
    const room = parentRoomOf(params.roomSlug);
    const local: Participant = {
      id: params.user.id,
      name: params.user.name,
      role: params.user.role,
      avatarColor: params.user.avatarColor || "#0082FF",
      isLocal: true,
      audioEnabled: params.audioEnabled,
      videoEnabled: params.videoEnabled,
      screenSharing: false,
      handRaised: false,
      breakoutRoomId: null,
      audioLevel: 0,
      attendanceStatus: "present",
      joinedAt: "",
      xpPoints: 0,
    };
    const stopMesh = () => {
      if (!this.meshStarted) return;
      webRtcMeshService.leaveRoom();
      this.meshStarted = false;
      this.meshPeers.clear();
      this.emitPeers();
    };
    const follow = (js: RoomJoinState) => {
      if (params !== this.lastParams || js.roomId !== room) return;
      if (js.status === "denied") {
        stopMesh();
        this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: "not_enrolled", errorMessage: js.reason || "You're not on this class's list." });
        return;
      }
      if (js.status === "signed_out") {
        stopMesh();
        this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: "signed_out", errorMessage: "Your sign-in has expired. Sign in again to join the class." });
        return;
      }
      if (js.status !== "joined") {
        this.setState({ ...this.state, mode: "mesh", status: this.meshStarted ? "reconnecting" : "connecting" });
        return;
      }
      if (js.waiting) {
        stopMesh();
        this.setState({ ...this.state, mode: "mesh", status: "connected", waiting: true, error: undefined, errorMessage: undefined });
        return;
      }
      if (!this.meshStarted) {
        this.meshStarted = true;
        webRtcMeshService.joinRoom(params.roomSlug, local, this.latestLocalStream || params.localStream || undefined);
      }
      this.rejoinAttempts = 0;
      this.setState({ ...this.state, mode: "mesh", status: "connected", waiting: false, error: undefined, errorMessage: undefined });
    };
    this.meshUnbind.push(
      webRtcMeshService.onPeerStream((peer) => {
        this.meshPeers.set(peer.peerId, peer);
        this.emitPeers();
      }),
      webRtcMeshService.onPeersChanged((peers) => {
        this.meshPeers = new Map(peers.map((p) => [p.peerId, p]));
        this.emitPeers();
      }),
      webRtcMeshService.onPeerLeft((id) => {
        this.meshPeers.delete(id);
        this.emitPeers();
      }),
      realtimeSocket.on("ROOM_DATA", (data: any) => {
        // The realtime server stamps the verified sender on relayed messages
        if (data?.roomId === room && data.message?.from !== this.selfId) this.dispatchData(data.message, data.message.from, data.message.fromHost ? "instructor" : data.message.fromRole || "");
      }),
      realtimeSocket.on("join_state", follow)
    );
    this.setState({ mode: "mesh", status: "connecting", audioBlocked: false });
    realtimeSocket.joinRoom(params.user, room);
    follow(realtimeSocket.getJoinState());

    // If the media server comes back (e.g. after a restart), move onto it so everyone shares one path
    this.upgradeTimer = setInterval(async () => {
      try {
        const res = await fetch("/api/media/status");
        const body = res.ok ? await res.json() : null;
        if (body?.sfu && params === this.lastParams && this.state.mode === "mesh") this.rejoin();
      } catch {}
    }, 30_000);
  }

  /** Server messages: class status, polls, and this learner being admitted or removed. */
  private handleServerMessage(msg: { topic: DataTopic; payload: any }) {
    if (!msg?.topic) return;
    if (msg.topic === "removed" && msg.payload?.identity === this.selfId && this.state.error !== "removed" && this.state.error !== "denied") {
      const denied = Boolean(this.state.waiting) || msg.payload?.reason === "denied";
      this.leave().then(() => this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: denied ? "denied" : "removed" }));
    }
    this.dispatchData(msg as any, "server", "server");
  }

  // ---------------------------------------------------------------- helpers
  private dispatchData(msg: { topic: DataTopic; payload: any; from: string }, fromId: string, fromRole: string) {
    if (!msg?.topic) return;
    const fromHost = fromRole === "server" || HOST_ROLES.includes(fromRole);
    if (SERVER_ONLY.includes(msg.topic) && fromRole !== "server") return;
    if (HOST_ONLY.includes(msg.topic) && !fromHost) return;
    // Whiteboard: people change only their own strokes; only hosts wipe the board
    if (msg.topic === "wb_stroke" && !fromHost && msg.payload?.by !== fromId) return;
    if (msg.topic === "wb_clear" && !fromHost && !Array.isArray(msg.payload?.ids)) return;
    if (msg.topic === "hand") {
      this.handRaised.set(fromId, Boolean(msg.payload?.raised));
      this.emitPeers();
    }
    this.dataListeners.get(msg.topic)?.forEach((cb) => {
      try {
        cb(msg.payload, fromId, fromHost);
      } catch (err) {
        console.warn("[Transport] data listener error", err);
      }
    });
  }

  /** Remote peers only; the context owns the local participant. */
  private snapshotPeers(): Participant[] {
    if (this.state.mode === "sfu") return [...this.peers.values()].map((p) => this.sfuPeer(p));
    if (this.state.mode === "mesh") {
      return Array.from(this.meshPeers.values()).map((p) => ({
        id: p.peerId,
        name: p.name,
        role: p.role,
        avatarColor: p.avatarColor,
        isLocal: false,
        audioEnabled: !p.isAudioMuted,
        videoEnabled: !p.isVideoOff,
        screenSharing: false,
        handRaised: this.handRaised.get(p.peerId) || false,
        breakoutRoomId: null,
        audioLevel: p.audioLevel || 0,
        attendanceStatus: "present" as const,
        joinedAt: "",
        xpPoints: 0,
        stream: p.stream,
        connectionQuality: "unknown" as const,
      }));
    }
    return [];
  }

  /** Local participant extras that only the transport knows (speaking, network quality). */
  localStatus(): Pick<Participant, "isSpeaking" | "connectionQuality"> {
    return this.state.mode === "sfu" ? { isSpeaking: this.selfSpeaking, connectionQuality: this.selfQuality } : {};
  }

  /** Peer-to-peer fallback: play each peer's audio through a hidden element, like the media-server path. */
  private syncMeshAudio() {
    if (this.state.mode !== "mesh") return;
    const live = new Set<string>();
    for (const p of this.meshPeers.values()) {
      const tracks = p.stream?.getAudioTracks() || [];
      if (!tracks.length) continue;
      live.add(p.peerId);
      if (!this.audioContainer) {
        this.audioContainer = document.createElement("div");
        this.audioContainer.style.display = "none";
        document.body.appendChild(this.audioContainer);
      }
      let el = this.audioContainer.querySelector<HTMLAudioElement>(`audio[data-participant="${CSS.escape(p.peerId)}"]`);
      if (!el) {
        el = document.createElement("audio");
        el.autoplay = true;
        el.dataset.participant = p.peerId;
        this.audioContainer.appendChild(el);
      }
      const current = el.srcObject as MediaStream | null;
      if (!current || current.getAudioTracks()[0] !== tracks[0]) {
        el.srcObject = new MediaStream(tracks);
        el.play().catch(() => this.setState({ ...this.state, audioBlocked: true }));
      }
    }
    this.audioContainer?.querySelectorAll<HTMLAudioElement>("audio[data-participant]").forEach((el) => {
      if (!live.has(el.dataset.participant || "")) el.remove();
    });
  }

  private emitPeers() {
    this.syncMeshAudio();
    const peers = this.snapshotPeers();
    this.peersListeners.forEach((cb) => cb(peers));
  }

  private setState(next: TransportState) {
    // The bandwidth choice outlives reconnects (join() replaces the rest of the state)
    this.state = { ...next, lowBandwidth: this.lowBandwidth };
    const state = this.state;
    this.stateListeners.forEach((cb) => cb(state));
  }
}

export const classroomTransport = new ClassroomTransport();

// Development only: lets the automated class test look inside the transport
if (import.meta.env?.DEV && typeof window !== "undefined") (window as any).__classroomTransport = classroomTransport;
