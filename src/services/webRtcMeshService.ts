import { realtimeSocket } from "./realtimeSocket";
import { Participant, UserRole } from "../types";

export interface RemotePeerInfo {
  peerId: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  stream?: MediaStream;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  audioLevel: number;
}

export type PeerStreamCallback = (peer: RemotePeerInfo) => void;
export type PeerLeftCallback = (peerId: string) => void;

interface SignalPayload {
  type: "join" | "leave" | "offer" | "answer" | "ice-candidate" | "state-update" | "heartbeat" | "class-status";
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatarColor?: string;
  targetId?: string;
  roomId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isAudioMuted?: boolean;
  isVideoOff?: boolean;
  classStatus?: "waiting" | "in_progress" | "paused" | "ended";
  timestamp: number;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

class WebRtcMeshService {
  private localStream: MediaStream | null = null;
  private localUser: Participant | null = null;
  private currentRoomId: string = "default-room";

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remotePeers: Map<string, RemotePeerInfo> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private isMakingOffer: Map<string, boolean> = new Map();

  private broadcastChannel: BroadcastChannel | null = null;
  private wsRelayUnbind: (() => void) | null = null;
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private heartbeatTimer: any = null;

  private onPeerStreamListeners: Set<PeerStreamCallback> = new Set();
  private onPeerLeftListeners: Set<PeerLeftCallback> = new Set();
  private onPeerStateChangeListeners: Set<(peers: RemotePeerInfo[]) => void> = new Set();
  private onClassStatusChangedListeners: Set<(status: "waiting" | "in_progress" | "paused" | "ended") => void> = new Set();

  private isConnected: boolean = false;
  private audioAnalyserContext: AudioContext | null = null;

  constructor() {
    this.setupStorageListener();
  }

  public async startLocalMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
      this.localStream = stream;
      this.startLocalAudioAnalysis(stream);
      return stream;
    } catch (err) {
      console.warn("[WebRTC] Direct user media failed, creating blank audio/video canvas fallback:", err);
      // Fallback synthetic stream so user can still connect even if camera is disabled/blocked
      const fallback = this.createSyntheticStream();
      this.localStream = fallback;
      return fallback;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public async setLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    this.startLocalAudioAnalysis(stream);

    // Replace or add tracks on all active peer connections
    for (const [remoteId, pc] of this.peerConnections) {
      let renegotiationNeeded = false;
      const senders = pc.getSenders();

      for (const newTrack of stream.getTracks()) {
        const sender = senders.find((s) => {
          if (s.track && s.track.kind === newTrack.kind) return true;
          const transceiver = pc.getTransceivers().find((t) => t.sender === s);
          return transceiver?.receiver?.track?.kind === newTrack.kind;
        });

        if (sender) {
          try {
            await sender.replaceTrack(newTrack);
            const transceiver = pc.getTransceivers().find((t) => t.sender === sender);
            if (transceiver && transceiver.direction !== "sendrecv") {
              transceiver.direction = "sendrecv";
              renegotiationNeeded = true;
            }
          } catch (e) {
            console.warn("[WebRTC] Error replacing track:", e);
          }
        } else {
          pc.addTrack(newTrack, stream);
          renegotiationNeeded = true;
        }
      }

      if (renegotiationNeeded && pc.signalingState === "stable") {
        await this.negotiate(remoteId, pc);
      }
    }
  }

  public async joinRoom(roomId: string, user: Participant, localStream?: MediaStream): Promise<void> {
    this.currentRoomId = roomId;
    this.localUser = user;
    if (localStream) {
      this.localStream = localStream;
    }

    this.initSignaling(roomId);
    this.isConnected = true;

    if (!this.localStream) {
      this.startLocalMedia().catch(console.warn);
    }

    // Broadcast join event to mesh
    this.broadcastSignal({
      type: "join",
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      senderAvatarColor: user.avatarColor,
      roomId,
      isAudioMuted: !user.audioEnabled,
      isVideoOff: !user.videoEnabled,
      timestamp: Date.now(),
    });
  }

  public leaveRoom(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.localUser && this.isConnected) {
      this.broadcastSignal({
        type: "leave",
        senderId: this.localUser.id,
        senderName: this.localUser.name,
        senderRole: this.localUser.role,
        roomId: this.currentRoomId,
        timestamp: Date.now(),
      });
    }

    // Close all peer connections
    for (const [peerId, pc] of this.peerConnections) {
      pc.close();
      this.notifyPeerLeft(peerId);
    }
    this.peerConnections.clear();
    this.remotePeers.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.wsRelayUnbind?.();
    this.wsRelayUnbind = null;

    this.isConnected = false;
  }

  public broadcastClassStatus(status: "waiting" | "in_progress" | "paused" | "ended"): void {
    if (!this.localUser) return;
    this.broadcastSignal({
      type: "class-status",
      senderId: this.localUser.id,
      senderName: this.localUser.name,
      senderRole: this.localUser.role,
      roomId: this.currentRoomId,
      classStatus: status,
      timestamp: Date.now(),
    });
  }

  public onClassStatusChanged(cb: (status: "waiting" | "in_progress" | "paused" | "ended") => void): () => void {
    this.onClassStatusChangedListeners.add(cb);
    return () => this.onClassStatusChangedListeners.delete(cb);
  }

  public updateMediaState(isAudioMuted: boolean, isVideoOff: boolean): void {
    if (!this.localUser) return;
    this.broadcastSignal({
      type: "state-update",
      senderId: this.localUser.id,
      senderName: this.localUser.name,
      senderRole: this.localUser.role,
      roomId: this.currentRoomId,
      isAudioMuted,
      isVideoOff,
      timestamp: Date.now(),
    });
  }

  // -------------------------------------------------------------
  // WebRTC Peer Connection & Signaling Handlers
  // -------------------------------------------------------------
  private initSignaling(roomId: string) {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        if (this.broadcastChannel) this.broadcastChannel.close();
        this.broadcastChannel = new BroadcastChannel(`dronacharya_mesh_${roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleSignal(event.data);
        };
      } catch (e) {
        console.warn("[WebRTC] BroadcastChannel not supported in environment:", e);
      }
    }

    // Start 2-second heartbeat presence broadcast to self-heal multi-tab handshakes
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.localUser && this.isConnected) {
        this.broadcastSignal({
          type: "heartbeat",
          senderId: this.localUser.id,
          senderName: this.localUser.name,
          senderRole: this.localUser.role,
          senderAvatarColor: this.localUser.avatarColor,
          roomId: this.currentRoomId,
          isAudioMuted: !this.localUser.audioEnabled,
          isVideoOff: !this.localUser.videoEnabled,
          timestamp: Date.now(),
        });
      }
    }, 2000);

    // Public Internet WebSocket Signaling Relay (Cross-Device)
    this.connectWsRelay(roomId);
  }

  /**
   * Cross-device signaling goes through our own realtime server (it previously pointed at a
   * public echo server, which only echoes back to the sender, so devices never connected).
   */
  private connectWsRelay(roomId: string) {
    this.wsRelayUnbind?.();
    this.wsRelayUnbind = realtimeSocket.on("MESH_SIGNAL", (data: any) => {
      if (data?.roomId === roomId && data.signal) this.handleSignal(data.signal);
    });
  }

  private setupStorageListener() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === `dronacharya_sig_${this.currentRoomId}` && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleSignal(data);
          } catch {}
        }
      });
    }
  }

  private broadcastSignal(payload: SignalPayload) {
    // 1. BroadcastChannel (Same browser tab-to-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch {}
    }

    // 2. localStorage Event Bus (Fallback for cross-tab with unique nonce)
    try {
      localStorage.setItem(
        `dronacharya_sig_${this.currentRoomId}`,
        JSON.stringify({ ...payload, _nonce: `${Date.now()}_${Math.random().toString(36).slice(2)}` })
      );
    } catch {}

    // 3. Our realtime server (cross-device)
    realtimeSocket.send("MESH_SIGNAL", { roomId: this.currentRoomId, signal: payload });
  }

  private async handleSignal(signal: SignalPayload) {
    if (!signal || !this.localUser || signal.senderId === this.localUser.id) {
      return;
    }
    if (signal.roomId !== this.currentRoomId) {
      return;
    }
    if (signal.targetId && signal.targetId !== this.localUser.id) {
      return;
    }

    const remoteId = signal.senderId;

    switch (signal.type) {
      case "join": {
        // A new peer joined the room:
        // 1. Immediately register peer in local map so UI updates instantly
        const initialPeer: RemotePeerInfo = {
          peerId: remoteId,
          name: signal.senderName,
          role: signal.senderRole,
          avatarColor: signal.senderAvatarColor || "#0082FF",
          isAudioMuted: !!signal.isAudioMuted,
          isVideoOff: !!signal.isVideoOff,
          audioLevel: 50,
        };
        if (!this.remotePeers.has(remoteId)) {
          this.remotePeers.set(remoteId, initialPeer);
          this.notifyPeerStream(initialPeer);
        }

        // 2. Announce own presence back so the joining peer immediately knows we are here
        if (this.localUser) {
          this.broadcastSignal({
            type: "state-update",
            senderId: this.localUser.id,
            senderName: this.localUser.name,
            senderRole: this.localUser.role,
            roomId: this.currentRoomId,
            isAudioMuted: !this.localUser.audioEnabled,
            isVideoOff: !this.localUser.videoEnabled,
            timestamp: Date.now(),
          });
        }

        // 3. Create RTCPeerConnection and initiate WebRTC offer
        await this.createPeerConnection(remoteId, signal.senderName, signal.senderRole, signal.senderAvatarColor || "#0082FF", true);
        break;
      }
      case "offer": {
        if (!signal.sdp) return;
        const initialPeer: RemotePeerInfo = {
          peerId: remoteId,
          name: signal.senderName,
          role: signal.senderRole,
          avatarColor: signal.senderAvatarColor || "#0082FF",
          isAudioMuted: !!signal.isAudioMuted,
          isVideoOff: !!signal.isVideoOff,
          audioLevel: 50,
        };
        if (!this.remotePeers.has(remoteId)) {
          this.remotePeers.set(remoteId, initialPeer);
          this.notifyPeerStream(initialPeer);
        }

        const pc = await this.createPeerConnection(
          remoteId,
          signal.senderName,
          signal.senderRole,
          signal.senderAvatarColor || "#0082FF",
          false
        );

        // Perfect Negotiation: polite peer yields if glare collision occurs
        const isPolite = this.localUser ? this.localUser.id > remoteId : false;
        const offerCollision = this.isMakingOffer.get(remoteId) || pc.signalingState !== "stable";
        if (offerCollision) {
          if (!isPolite) {
            console.log(`[WebRTC] Glare collision: impolite peer ignoring offer from ${remoteId}`);
            return;
          }
          try {
            await pc.setLocalDescription({ type: "rollback" });
          } catch {}
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.drainPendingCandidates(remoteId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.broadcastSignal({
          type: "answer",
          senderId: this.localUser.id,
          senderName: this.localUser.name,
          senderRole: this.localUser.role,
          targetId: remoteId,
          roomId: this.currentRoomId,
          sdp: answer,
          timestamp: Date.now(),
        });
        break;
      }
      case "answer": {
        if (!signal.sdp) return;
        const pc = this.peerConnections.get(remoteId);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await this.drainPendingCandidates(remoteId, pc);
        }
        break;
      }
      case "ice-candidate": {
        if (!signal.candidate) return;
        const pc = this.peerConnections.get(remoteId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn("[WebRTC] Could not add ICE candidate:", e);
          }
        } else {
          if (!this.pendingCandidates.has(remoteId)) {
            this.pendingCandidates.set(remoteId, []);
          }
          this.pendingCandidates.get(remoteId)!.push(signal.candidate);
        }
        break;
      }
      case "state-update": {
        const peer = this.remotePeers.get(remoteId);
        if (peer) {
          peer.isAudioMuted = !!signal.isAudioMuted;
          peer.isVideoOff = !!signal.isVideoOff;
          this.notifyStateChanged();
        } else {
          // If we haven't seen this peer yet, register them
          const newPeer: RemotePeerInfo = {
            peerId: remoteId,
            name: signal.senderName,
            role: signal.senderRole,
            avatarColor: signal.senderAvatarColor || "#0082FF",
            isAudioMuted: !!signal.isAudioMuted,
            isVideoOff: !!signal.isVideoOff,
            audioLevel: 50,
          };
          this.remotePeers.set(remoteId, newPeer);
          this.notifyPeerStream(newPeer);
        }
        break;
      }
      case "heartbeat": {
        const existing = this.remotePeers.get(remoteId);
        if (existing) {
          existing.isAudioMuted = !!signal.isAudioMuted;
          existing.isVideoOff = !!signal.isVideoOff;
          this.notifyStateChanged();
        } else {
          const initialPeer: RemotePeerInfo = {
            peerId: remoteId,
            name: signal.senderName,
            role: signal.senderRole,
            avatarColor: signal.senderAvatarColor || "#0082FF",
            isAudioMuted: !!signal.isAudioMuted,
            isVideoOff: !!signal.isVideoOff,
            audioLevel: 50,
          };
          this.remotePeers.set(remoteId, initialPeer);
          this.notifyPeerStream(initialPeer);
        }

        // Auto-heal WebRTC connection if missing: peer with lexicographically lower ID initiates
        if (!this.peerConnections.has(remoteId) && this.localUser) {
          const shouldInitiate = this.localUser.id < remoteId;
          if (shouldInitiate) {
            await this.createPeerConnection(remoteId, signal.senderName, signal.senderRole, signal.senderAvatarColor || "#0082FF", true);
          }
        }
        break;
      }
      case "class-status": {
        if (signal.classStatus) {
          this.notifyClassStatusChanged(signal.classStatus);
        }
        break;
      }
      case "leave": {
        const pc = this.peerConnections.get(remoteId);
        if (pc) {
          pc.close();
          this.peerConnections.delete(remoteId);
        }
        this.remotePeers.delete(remoteId);
        this.notifyPeerLeft(remoteId);
        break;
      }
    }
  }

  private async drainPendingCandidates(remoteId: string, pc: RTCPeerConnection): Promise<void> {
    const list = this.pendingCandidates.get(remoteId);
    if (!list || list.length === 0) return;
    this.pendingCandidates.delete(remoteId);
    for (const cand of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn("[WebRTC] Error draining pending ICE candidate:", err);
      }
    }
  }

  private async negotiate(remoteId: string, pc: RTCPeerConnection): Promise<void> {
    if (!this.localUser || pc.signalingState !== "stable") return;
    try {
      this.isMakingOffer.set(remoteId, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);

      this.broadcastSignal({
        type: "offer",
        senderId: this.localUser.id,
        senderName: this.localUser.name,
        senderRole: this.localUser.role,
        targetId: remoteId,
        roomId: this.currentRoomId,
        sdp: offer,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn("[WebRTC] Error during negotiation offer:", err);
    } finally {
      this.isMakingOffer.set(remoteId, false);
    }
  }

  private async createPeerConnection(
    remoteId: string,
    remoteName: string,
    remoteRole: UserRole,
    remoteAvatarColor: string,
    isInitiator: boolean
  ): Promise<RTCPeerConnection> {
    // Immediately register peer info if not yet in map
    const initialPeer: RemotePeerInfo = {
      peerId: remoteId,
      name: remoteName,
      role: remoteRole,
      avatarColor: remoteAvatarColor,
      isAudioMuted: false,
      isVideoOff: false,
      audioLevel: 50,
    };
    if (!this.remotePeers.has(remoteId)) {
      this.remotePeers.set(remoteId, initialPeer);
      this.notifyPeerStream(initialPeer);
    }

    if (this.peerConnections.has(remoteId)) {
      return this.peerConnections.get(remoteId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(remoteId, pc);

    // 1. Add local tracks to peer connection if localStream is already available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // 2. Add sendrecv transceivers for audio/video if not already present
    const senders = pc.getSenders();
    const hasAudio = senders.some((s) => s.track?.kind === "audio");
    const hasVideo = senders.some((s) => s.track?.kind === "video");
    if (!hasAudio) {
      try { pc.addTransceiver("audio", { direction: "sendrecv" }); } catch {}
    }
    if (!hasVideo) {
      try { pc.addTransceiver("video", { direction: "sendrecv" }); } catch {}
    }

    // 3. Handle remote tracks (accumulate tracks into single media stream)
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote ${event.track.kind} track from ${remoteId}`);
      let stream = this.remotePeers.get(remoteId)?.stream;
      if (!stream) {
        stream = event.streams[0] || new MediaStream();
      }
      if (!stream.getTracks().some((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      const existing = this.remotePeers.get(remoteId);
      const peerInfo: RemotePeerInfo = {
        peerId: remoteId,
        name: remoteName,
        role: remoteRole,
        avatarColor: remoteAvatarColor,
        stream,
        isAudioMuted: existing?.isAudioMuted ?? false,
        isVideoOff: existing?.isVideoOff ?? false,
        audioLevel: 50,
      };

      this.remotePeers.set(remoteId, peerInfo);
      this.notifyPeerStream(peerInfo);
      this.notifyStateChanged();

      event.track.onunmute = () => {
        this.notifyPeerStream(peerInfo);
        this.notifyStateChanged();
      };
      event.track.onended = () => {
        this.notifyStateChanged();
      };
    };

    // 4. Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.localUser) {
        this.broadcastSignal({
          type: "ice-candidate",
          senderId: this.localUser.id,
          senderName: this.localUser.name,
          senderRole: this.localUser.role,
          targetId: remoteId,
          roomId: this.currentRoomId,
          candidate: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    // 5. Automatic renegotiation listener
    pc.onnegotiationneeded = async () => {
      await this.negotiate(remoteId, pc);
    };

    const dropPeer = () => {
      this.disconnectTimers.delete(remoteId);
      if (this.peerConnections.get(remoteId) !== pc) return;
      pc.close();
      this.remotePeers.delete(remoteId);
      this.peerConnections.delete(remoteId);
      this.notifyPeerLeft(remoteId);
    };

    pc.onconnectionstatechange = () => {
      const pending = this.disconnectTimers.get(remoteId);
      if (pc.connectionState === "connected" && pending) {
        clearTimeout(pending);
        this.disconnectTimers.delete(remoteId);
      } else if (pc.connectionState === "disconnected") {
        if (!pending) this.disconnectTimers.set(remoteId, setTimeout(dropPeer, 10000));
        try {
          pc.restartIce();
        } catch {}
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (pending) clearTimeout(pending);
        dropPeer();
      }
    };

    // 6. If initiator, generate offer
    if (isInitiator && this.localUser) {
      await this.negotiate(remoteId, pc);
    }

    return pc;
  }

  // -------------------------------------------------------------
  // Audio Analysis & Synthetic Fallbacks
  // -------------------------------------------------------------
  private startLocalAudioAnalysis(stream: MediaStream) {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioAnalyserContext = new AudioCtx();
      const source = this.audioAnalyserContext.createMediaStreamSource(stream);
      const analyser = this.audioAnalyserContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
    } catch {}
  }

  private createSyntheticStream(): MediaStream {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Dronacharya WebRTC Node", canvas.width / 2, canvas.height / 2);
    }
    const canvasStream = canvas.captureStream ? canvas.captureStream(15) : new MediaStream();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        const gain = ctx.createGain();
        gain.gain.value = 0; // Silent audio track
        osc.connect(gain);
        gain.connect(dst);
        osc.start();
        dst.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      }
    } catch {}

    return canvasStream;
  }

  // -------------------------------------------------------------
  // Listeners & Subscriptions
  // -------------------------------------------------------------
  public onPeerStream(callback: PeerStreamCallback): () => void {
    this.onPeerStreamListeners.add(callback);
    // Immediately emit existing peers
    for (const [, peer] of this.remotePeers) {
      callback(peer);
    }
    return () => this.onPeerStreamListeners.delete(callback);
  }

  public onPeerLeft(callback: PeerLeftCallback): () => void {
    this.onPeerLeftListeners.add(callback);
    return () => this.onPeerLeftListeners.delete(callback);
  }

  public onPeersChanged(callback: (peers: RemotePeerInfo[]) => void): () => void {
    this.onPeerStateChangeListeners.add(callback);
    callback(Array.from(this.remotePeers.values()));
    return () => this.onPeerStateChangeListeners.delete(callback);
  }

  public getRemotePeers(): RemotePeerInfo[] {
    return Array.from(this.remotePeers.values());
  }

  private notifyPeerStream(peer: RemotePeerInfo) {
    this.onPeerStreamListeners.forEach((cb) => cb(peer));
    this.notifyStateChanged();
  }

  private notifyPeerLeft(peerId: string) {
    this.onPeerLeftListeners.forEach((cb) => cb(peerId));
    this.notifyStateChanged();
  }

  private notifyClassStatusChanged(status: "waiting" | "in_progress" | "paused" | "ended") {
    this.onClassStatusChangedListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn("[WebRTC] class status listener error:", err);
      }
    });
  }

  private notifyStateChanged() {
    const list = Array.from(this.remotePeers.values());
    this.onPeerStateChangeListeners.forEach((cb) => cb(list));
  }
}

export const webRtcMeshService = new WebRtcMeshService();
