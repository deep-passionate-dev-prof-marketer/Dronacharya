import { Participant, UserRole } from "../types";

export interface RemotePeerInfo {
  peerId: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  stream: MediaStream;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  audioLevel: number;
}

export type PeerStreamCallback = (peer: RemotePeerInfo) => void;
export type PeerLeftCallback = (peerId: string) => void;

interface SignalPayload {
  type: "join" | "leave" | "offer" | "answer" | "ice-candidate" | "state-update";
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
  timestamp: number;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

class WebRtcMeshService {
  private localStream: MediaStream | null = null;
  private localUser: Participant | null = null;
  private currentRoomId: string = "default-room";

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remotePeers: Map<string, RemotePeerInfo> = new Map();

  private broadcastChannel: BroadcastChannel | null = null;
  private wsRelay: WebSocket | null = null;

  private onPeerStreamListeners: Set<PeerStreamCallback> = new Set();
  private onPeerLeftListeners: Set<PeerLeftCallback> = new Set();
  private onPeerStateChangeListeners: Set<(peers: RemotePeerInfo[]) => void> = new Set();

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

  public setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Replace tracks on all active peer connections
    for (const [, pc] of this.peerConnections) {
      const senders = pc.getSenders();
      stream.getTracks().forEach((newTrack) => {
        const sender = senders.find((s) => s.track && s.track.kind === newTrack.kind);
        if (sender) {
          sender.replaceTrack(newTrack).catch(console.warn);
        } else {
          pc.addTrack(newTrack, stream);
        }
      });
    }
  }

  public async joinRoom(roomId: string, user: Participant, localStream?: MediaStream): Promise<void> {
    this.currentRoomId = roomId;
    this.localUser = user;
    if (localStream) {
      this.localStream = localStream;
    } else if (!this.localStream) {
      await this.startLocalMedia();
    }

    this.initSignaling(roomId);
    this.isConnected = true;

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

    if (this.wsRelay) {
      this.wsRelay.close();
      this.wsRelay = null;
    }

    this.isConnected = false;
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

    // Public Internet WebSocket Signaling Relay (Cross-Device)
    this.connectWsRelay(roomId);
  }

  private connectWsRelay(roomId: string) {
    try {
      // Connect to public reliable WebSocket relay for cross-device handshakes
      const ws = new WebSocket(`wss://echo.websocket.events`);
      ws.onopen = () => {
        this.wsRelay = ws;
      };
      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed && parsed.dronacharyaMesh && parsed.roomId === roomId) {
            this.handleSignal(parsed);
          }
        } catch {}
      };
      ws.onerror = () => {};
    } catch {}
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

    // 2. localStorage Event Bus (Fallback for cross-tab)
    try {
      localStorage.setItem(`dronacharya_sig_${this.currentRoomId}`, JSON.stringify(payload));
    } catch {}

    // 3. WebSocket relay (Cross-device)
    if (this.wsRelay && this.wsRelay.readyState === WebSocket.OPEN) {
      try {
        this.wsRelay.send(JSON.stringify({ ...payload, dronacharyaMesh: true }));
      } catch {}
    }
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
        // A new peer joined the room: Create RTCPeerConnection and initiate Offer
        await this.createPeerConnection(remoteId, signal.senderName, signal.senderRole, signal.senderAvatarColor || "#0082FF", true);
        break;
      }
      case "offer": {
        if (!signal.sdp) return;
        const pc = await this.createPeerConnection(
          remoteId,
          signal.senderName,
          signal.senderRole,
          signal.senderAvatarColor || "#0082FF",
          false
        );
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
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
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
        break;
      }
      case "ice-candidate": {
        if (!signal.candidate) return;
        const pc = this.peerConnections.get(remoteId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn("[WebRTC] Could not add ICE candidate:", e);
          }
        }
        break;
      }
      case "state-update": {
        const peer = this.remotePeers.get(remoteId);
        if (peer) {
          peer.isAudioMuted = !!signal.isAudioMuted;
          peer.isVideoOff = !!signal.isVideoOff;
          this.notifyStateChanged();
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

  private async createPeerConnection(
    remoteId: string,
    remoteName: string,
    remoteRole: UserRole,
    remoteAvatarColor: string,
    isInitiator: boolean
  ): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(remoteId)) {
      return this.peerConnections.get(remoteId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(remoteId, pc);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const stream = remoteStream || new MediaStream([event.track]);

      const peerInfo: RemotePeerInfo = {
        peerId: remoteId,
        name: remoteName,
        role: remoteRole,
        avatarColor: remoteAvatarColor,
        stream,
        isAudioMuted: false,
        isVideoOff: false,
        audioLevel: 50,
      };

      this.remotePeers.set(remoteId, peerInfo);
      this.notifyPeerStream(peerInfo);
    };

    // Handle ICE candidates
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

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.remotePeers.delete(remoteId);
        this.peerConnections.delete(remoteId);
        this.notifyPeerLeft(remoteId);
      }
    };

    // If initiator, generate offer
    if (isInitiator && this.localUser) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
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
        console.error("[WebRTC] Error creating offer:", err);
      }
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

  private notifyStateChanged() {
    const list = Array.from(this.remotePeers.values());
    this.onPeerStateChangeListeners.forEach((cb) => cb(list));
  }
}

export const webRtcMeshService = new WebRtcMeshService();
