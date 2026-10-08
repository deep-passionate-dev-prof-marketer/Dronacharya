/**
 * Classroom media + data transport.
 *
 * Primary path: LiveKit SFU (one upload per participant, simulcast, adaptive quality per viewer,
 * TURN built in), which is what makes 1:20 / 1:24 classes smooth. Fallback when the server has no
 * LiveKit configured: the peer-to-peer mesh in webRtcMeshService (fine for small same-network demos).
 *
 * The rest of the app only sees TransportPeer objects and typed data messages, so the layout code
 * does not care which path is active.
 */
import {
  ConnectionQuality,
  DisconnectReason,
  LocalTrackPublication,
  Participant as LkParticipant,
  RemoteParticipant,
  RemoteTrack,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
  VideoPresets,
} from "livekit-client";
import { webRtcMeshService, RemotePeerInfo } from "../webRtcMeshService";
import { realtimeSocket } from "../realtimeSocket";
import type { Participant, UserRole } from "../../types";

export type TransportMode = "livekit" | "mesh" | "none";
export type TransportStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export interface TransportState {
  mode: TransportMode;
  status: TransportStatus;
  /** Browser blocked autoplay of remote audio; call startAudio() from a user gesture */
  audioBlocked: boolean;
  error?: string;
}

export type DataTopic = "caption" | "class_status" | "hand" | "chat" | "wb_stroke" | "wb_clear" | "wb_sync_request" | "wb_sync" | "stage";

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

type PeersListener = (peers: Participant[]) => void;
type StateListener = (s: TransportState) => void;
type DataListener = (payload: any, fromId: string) => void;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const QUALITY: Record<string, Participant["connectionQuality"]> = {
  [ConnectionQuality.Excellent]: "excellent",
  [ConnectionQuality.Good]: "good",
  [ConnectionQuality.Poor]: "poor",
  [ConnectionQuality.Lost]: "lost",
};

class ClassroomTransport {
  private room: Room | null = null;
  private state: TransportState = { mode: "none", status: "idle", audioBlocked: false };
  private peersListeners = new Set<PeersListener>();
  private stateListeners = new Set<StateListener>();
  private dataListeners = new Map<DataTopic, Set<DataListener>>();
  private handRaised = new Map<string, boolean>();
  private meshPeers = new Map<string, RemotePeerInfo>();
  private meshUnbind: Array<() => void> = [];
  private audioContainer: HTMLDivElement | null = null;
  private cameraPub: LocalTrackPublication | null = null;
  private micPub: LocalTrackPublication | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private roomSlug = "";
  private selfId = "";
  private lastParams: JoinParams | null = null;
  private rejoinAttempts = 0;
  private rejoinTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.setState({ mode: "none", status: "connecting", audioBlocked: false, error: undefined });

    let tokenResponse: { token: string; url: string } | null = null;
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomSlug: params.roomSlug, user: params.user, device: params.device }),
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        this.setState({ mode: "none", status: "disconnected", audioBlocked: false, error: "device_blocked" });
        throw new DeviceBlockedError(body.evaluation);
      }
      if (res.ok) tokenResponse = await res.json();
    } catch (err) {
      if (err instanceof DeviceBlockedError) throw err;
      // Network error / no server: fall back to mesh below
    }

    if (tokenResponse) {
      try {
        await this.joinLivekit(tokenResponse, params);
        return "livekit";
      } catch (err) {
        console.warn("[Transport] LiveKit connect failed, falling back to peer-to-peer:", err);
      }
    }
    this.joinMesh(params);
    return "mesh";
  }

  /** Take the class back after it was opened in another tab/device, or retry after a drop. */
  async rejoin() {
    if (!this.lastParams) return;
    const params = this.lastParams;
    this.roomSlug = "";
    this.rejoinAttempts = 0;
    await this.join(params);
  }

  async leave() {
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
    this.rejoinTimer = null;
    if (this.room) {
      const room = this.room;
      this.room = null;
      room.removeAllListeners();
      await room.disconnect().catch(() => {});
    }
    this.meshUnbind.forEach((u) => u());
    this.meshUnbind = [];
    if (this.state.mode === "mesh") webRtcMeshService.leaveRoom();
    this.meshPeers.clear();
    this.handRaised.clear();
    this.cameraPub = null;
    this.micPub = null;
    this.screenTrack = null;
    this.audioContainer?.remove();
    this.audioContainer = null;
    this.setState({ mode: "none", status: "disconnected", audioBlocked: false });
    this.emitPeers();
  }

  /** Must be called from a user gesture when audioBlocked is true (mobile autoplay rules). */
  async startAudio() {
    if (this.room) await this.room.startAudio().catch(() => {});
    this.audioContainer?.querySelectorAll("audio").forEach((a) => (a as HTMLAudioElement).play().catch(() => {}));
    this.setState({ ...this.state, audioBlocked: false });
  }

  // ---------------------------------------------------------------- local media controls
  async setMicEnabled(enabled: boolean) {
    if (this.state.mode === "livekit") {
      if (this.micPub) await (enabled ? this.micPub.unmute() : this.micPub.mute()).catch(() => {});
    }
  }

  async setCameraEnabled(enabled: boolean) {
    if (this.state.mode === "livekit") {
      if (this.cameraPub) await (enabled ? this.cameraPub.unmute() : this.cameraPub.mute()).catch(() => {});
    }
  }

  /** Re-publish when the context swaps its local stream (e.g. device change). */
  async replaceLocalStream(stream: MediaStream | null) {
    if (this.state.mode === "mesh") {
      if (stream) webRtcMeshService.setLocalStream(stream);
      return;
    }
    if (!this.room || !stream) return;
    const lp = this.room.localParticipant;
    const audio = stream.getAudioTracks()[0];
    const video = stream.getVideoTracks()[0];
    if (audio && this.micPub?.track?.mediaStreamTrack !== audio) {
      if (this.micPub?.track) await lp.unpublishTrack(this.micPub.track, false).catch(() => {});
      this.micPub = await lp.publishTrack(audio, { source: Track.Source.Microphone, dtx: true, red: true }).catch(() => null);
    }
    if (video && this.cameraPub?.track?.mediaStreamTrack !== video) {
      if (this.cameraPub?.track) await lp.unpublishTrack(this.cameraPub.track, false).catch(() => {});
      this.cameraPub = await lp
        .publishTrack(video, {
          source: Track.Source.Camera,
          simulcast: true,
          videoEncoding: VideoPresets.h720.encoding,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        })
        .catch(() => null);
    }
  }

  async publishScreen(track: MediaStreamTrack | null) {
    if (this.state.mode !== "livekit" || !this.room) return;
    const lp = this.room.localParticipant;
    if (this.screenTrack) {
      await lp.unpublishTrack(this.screenTrack, false).catch(() => {});
      this.screenTrack = null;
    }
    if (track) {
      // Text and slides stay sharp: favour resolution over frame rate
      try {
        (track as any).contentHint = "detail";
      } catch {}
      await lp
        .publishTrack(track, {
          source: Track.Source.ScreenShare,
          simulcast: false,
          videoEncoding: ScreenSharePresets.h1080fps15.encoding,
          degradationPreference: "maintain-resolution",
        })
        .catch((err) => console.warn("[Transport] screen publish failed", err));
      this.screenTrack = track;
    }
  }

  // ---------------------------------------------------------------- data
  sendData(topic: DataTopic, payload: unknown, opts: { reliable?: boolean; to?: string[] } = {}) {
    const message = { topic, payload, from: this.selfId };
    if (topic === "hand") this.handRaised.set(this.selfId, Boolean((payload as any)?.raised));
    if (this.state.mode === "livekit" && this.room) {
      this.room.localParticipant
        .publishData(encoder.encode(JSON.stringify(message)), {
          reliable: opts.reliable ?? true,
          topic,
          destinationIdentities: opts.to,
        })
        .catch(() => {});
      return;
    }
    // Mesh fallback: relay through our own realtime server
    realtimeSocket.send("ROOM_DATA", { roomId: this.roomSlug, message });
  }

  // ---------------------------------------------------------------- LiveKit
  private async joinLivekit(cfg: { token: string; url: string }, params: JoinParams) {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: true,
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        videoEncoding: VideoPresets.h720.encoding,
        screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
        dtx: true,
        red: true,
        degradationPreference: "maintain-framerate",
      },
    });
    this.room = room;
    this.wireRoomEvents(room);
    room.prepareConnection(cfg.url, cfg.token);
    await room.connect(cfg.url, cfg.token, { autoSubscribe: true });
    this.rejoinAttempts = 0;
    this.setState({ mode: "livekit", status: "connected", audioBlocked: !room.canPlaybackAudio });

    if (params.user.role !== "auditor") {
      await this.replaceLocalStream(params.localStream || null);
      if (!params.audioEnabled) await this.setMicEnabled(false);
      if (!params.videoEnabled) await this.setCameraEnabled(false);
    }
    this.emitPeers();
  }

  private wireRoomEvents(room: Room) {
    const refresh = () => this.emitPeers();
    room
      .on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, (p) => {
        this.handRaised.delete(p.identity);
        refresh();
      })
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) this.attachAudio(track, participant.identity);
        refresh();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        refresh();
      })
      .on(RoomEvent.TrackMuted, refresh)
      .on(RoomEvent.TrackUnmuted, refresh)
      .on(RoomEvent.TrackPublished, refresh)
      .on(RoomEvent.TrackUnpublished, refresh)
      .on(RoomEvent.LocalTrackPublished, refresh)
      .on(RoomEvent.LocalTrackUnpublished, refresh)
      .on(RoomEvent.ActiveSpeakersChanged, refresh)
      .on(RoomEvent.ConnectionQualityChanged, refresh)
      .on(RoomEvent.ParticipantMetadataChanged, refresh)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => this.setState({ ...this.state, audioBlocked: !room.canPlaybackAudio }))
      .on(RoomEvent.Reconnecting, () => this.setState({ ...this.state, status: "reconnecting" }))
      .on(RoomEvent.SignalReconnecting, () => this.setState({ ...this.state, status: "reconnecting" }))
      .on(RoomEvent.Reconnected, () => this.setState({ ...this.state, status: "connected" }))
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (this.room !== room) return; // we left on purpose
        if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
          // Same account joined from another tab/device; let the user choose where to continue
          this.setState({ ...this.state, status: "disconnected", error: "duplicate_identity" });
          return;
        }
        // Network/server drop: rejoin automatically so the class carries on
        this.setState({ ...this.state, status: "reconnecting" });
        const delay = Math.min(1000 * 2 ** this.rejoinAttempts++, 15000);
        this.rejoinTimer = setTimeout(() => {
          if (this.lastParams) {
            this.roomSlug = "";
            this.join(this.lastParams).catch(() => {});
          }
        }, delay);
      })
      .on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const msg = JSON.parse(decoder.decode(payload));
          this.dispatchData(msg, participant?.identity || msg.from);
        } catch {}
      });
  }

  /** Remote audio lives outside React so layout changes, swipes and re-renders never interrupt it. */
  private attachAudio(track: RemoteTrack, identity: string) {
    if (!this.audioContainer) {
      this.audioContainer = document.createElement("div");
      this.audioContainer.id = "classroom-remote-audio";
      this.audioContainer.style.display = "none";
      document.body.appendChild(this.audioContainer);
    }
    const el = track.attach() as HTMLAudioElement;
    el.dataset.participant = identity;
    this.audioContainer.appendChild(el);
  }

  private livekitPeer(p: LkParticipant, isLocal: boolean): Participant {
    let meta: any = {};
    try {
      meta = p.metadata ? JSON.parse(p.metadata) : {};
    } catch {}
    const cam = p.getTrackPublication(Track.Source.Camera);
    const mic = p.getTrackPublication(Track.Source.Microphone);
    const screen = p.getTrackPublication(Track.Source.ScreenShare);
    const camTrack = cam?.track;
    const screenTrack = screen?.track;
    const attach = (t: typeof camTrack) =>
      t
        ? (el: HTMLVideoElement) => {
            t.attach(el);
            return () => {
              t.detach(el);
            };
          }
        : undefined;
    return {
      id: p.identity,
      name: p.name || p.identity,
      role: (meta.role || "student") as UserRole,
      avatarColor: meta.avatarColor || "#0082FF",
      isLocal,
      audioEnabled: Boolean(mic && !mic.isMuted),
      videoEnabled: Boolean(cam && !cam.isMuted && camTrack),
      screenSharing: Boolean(screen && screenTrack),
      handRaised: this.handRaised.get(p.identity) || false,
      breakoutRoomId: null,
      audioLevel: Math.round((p.audioLevel || 0) * 100),
      isSpeaking: p.isSpeaking,
      connectionQuality: QUALITY[p.connectionQuality] || "unknown",
      attendanceStatus: "present",
      joinedAt: p.joinedAt ? p.joinedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      xpPoints: 0,
      gradeLevel: meta.gradeLevel,
      attachVideo: isLocal ? undefined : attach(camTrack),
      attachScreen: attach(screenTrack),
    };
  }

  // ---------------------------------------------------------------- Mesh fallback
  private joinMesh(params: JoinParams) {
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
        if (data?.roomId === this.roomSlug && data.message?.from !== this.selfId) this.dispatchData(data.message, data.message.from);
      })
    );
    webRtcMeshService.joinRoom(params.roomSlug, local, params.localStream || undefined);
    this.setState({ mode: "mesh", status: "connected", audioBlocked: false });
  }

  // ---------------------------------------------------------------- helpers
  private dispatchData(msg: { topic: DataTopic; payload: any; from: string }, fromId: string) {
    if (!msg?.topic) return;
    if (msg.topic === "hand") {
      this.handRaised.set(fromId, Boolean(msg.payload?.raised));
      this.emitPeers();
    }
    this.dataListeners.get(msg.topic)?.forEach((cb) => {
      try {
        cb(msg.payload, fromId);
      } catch (err) {
        console.warn("[Transport] data listener error", err);
      }
    });
  }

  /** Remote peers only; the context owns the local participant. */
  private snapshotPeers(): Participant[] {
    if (this.state.mode === "livekit" && this.room) {
      return Array.from(this.room.remoteParticipants.values()).map((p) => this.livekitPeer(p, false));
    }
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
    const lp = this.room?.localParticipant;
    return lp ? { isSpeaking: lp.isSpeaking, connectionQuality: QUALITY[lp.connectionQuality] || "unknown" } : {};
  }

  /** Peer-to-peer fallback: play each peer's audio through a hidden element, like the LiveKit path. */
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
    this.state = next;
    this.stateListeners.forEach((cb) => cb(next));
  }
}

export const classroomTransport = new ClassroomTransport();
