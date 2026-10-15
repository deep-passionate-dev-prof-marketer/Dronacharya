import { Participant, RemoteAccessSession, PitchRoomStatus, UserRole } from "../types";

export type RealtimeEventHandler = (data: any) => void;

export interface RoomJoinState {
  roomId: string;
  status: "idle" | "joining" | "joined" | "denied" | "signed_out";
  isHost?: boolean;
  waiting?: boolean;
  reason?: string;
}

/**
 * The room WebSocket (chat, whiteboard, captions, peer-to-peer signalling, server class messages).
 * It joins only as the signed-in user (the server checks the session and the class list), re-joins
 * after reconnects and room changes, and stops retrying when the server refuses the room.
 */
class RealtimeSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private isConnected = false;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private currentRoomId = "";
  private currentUser: { id: string } | null = null;
  /** False after sign-out, a refused room, or disconnect(): no automatic reconnects */
  private wanted = false;
  private joinState: RoomJoinState = { roomId: "", status: "idle" };

  constructor() {
    this.on("ROOM_STATE_SYNC", (d) => {
      this.reconnectAttempts = 0;
      this.setJoinState({ roomId: d.roomId, status: "joined", isHost: Boolean(d.you?.isHost), waiting: Boolean(d.you?.waiting) });
    });
    this.on("ROOM_ACCESS_DENIED", (d) => {
      this.wanted = false;
      this.setJoinState({ roomId: d.roomId || this.currentRoomId, status: "denied", reason: d.reason });
    });
    this.on("AUTH_REQUIRED", () => {
      this.wanted = false;
      this.setJoinState({ roomId: this.currentRoomId, status: "signed_out" });
    });
    this.on("PARTICIPANT_UPDATED", (d) => {
      if (d.participant?.id && d.participant.id === this.currentUser?.id && this.joinState.status === "joined") {
        this.setJoinState({ ...this.joinState, waiting: Boolean(d.participant.waiting) });
      }
    });
  }

  private setJoinState(s: RoomJoinState) {
    this.joinState = s;
    this.emitLocal("join_state", s);
  }

  public getJoinState() {
    return this.joinState;
  }

  /** @deprecated use joinRoom(user, roomId): the socket only opens for a signed-in user */
  public connect(user?: any, roomId?: string) {
    if (user && roomId) this.joinRoom(user, roomId);
  }

  private open() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    try {
      const socket = new WebSocket(`${protocol}//${window.location.host}`);
      this.socket = socket;
      socket.onopen = () => {
        this.isConnected = true;
        this.emitLocal("connection_status", { status: "connected" });
        if (this.wanted && this.currentUser && this.currentRoomId) this.authJoin();
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message && typeof message.type === "string") this.emitLocal(message.type, message);
        } catch (e) {
          console.error("[RealtimeSocket] Error parsing message:", e);
        }
      };
      socket.onclose = (ev) => {
        if (this.socket !== socket) return;
        this.socket = null;
        this.isConnected = false;
        this.emitLocal("connection_status", { status: "disconnected" });
        // 4001: the server closed a socket that never joined (signed out or refused): don't loop
        if (ev.code === 4001) this.wanted = false;
        if (this.joinState.status === "joined" || this.joinState.status === "joining") this.setJoinState({ ...this.joinState, status: "joining" });
        this.scheduleReconnect();
      };
      socket.onerror = () => {};
    } catch (e) {
      console.error("[RealtimeSocket] Connection initiation error:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.wanted) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts++, 15000);
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  public disconnect() {
    this.wanted = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.isConnected = false;
    this.currentRoomId = "";
    this.setJoinState({ roomId: "", status: "idle" });
  }

  public on(eventType: string, handler: RealtimeEventHandler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => {
      this.off(eventType, handler);
    };
  }

  public off(eventType: string, handler: RealtimeEventHandler) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.delete(handler);
    }
  }

  private emitLocal(eventType: string, data: any) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.warn(`[RealtimeSocket] ${eventType} handler error`, err);
        }
      });
    }
  }

  public send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
      } catch {}
    }
  }

  /** Join (or switch to) a room as the signed-in user. Safe to call repeatedly. */
  public joinRoom(user: { id: string } | null | undefined, roomId: string) {
    if (!user?.id || !roomId) return;
    const sameRoom = this.currentRoomId === roomId && this.currentUser?.id === user.id;
    this.currentUser = user;
    this.currentRoomId = roomId;
    this.wanted = true;
    if (sameRoom && (this.joinState.status === "joined" || this.joinState.status === "joining") && this.socket) return;
    this.setJoinState({ roomId, status: "joining" });
    if (this.isConnected) this.authJoin();
    else this.open();
  }

  /** Ask again after the class list changed or the user signed in (clears a refusal). */
  public retryJoin() {
    if (this.currentUser && this.currentRoomId) {
      const room = this.currentRoomId;
      this.currentRoomId = "";
      this.joinRoom(this.currentUser, room);
    }
  }

  /**
   * Joins with a short-lived ticket from the signed-in HTTP session, so the server knows who this
   * socket belongs to even if it was opened before sign-in. The server ignores any claimed identity.
   */
  private async authJoin() {
    let ticket: string | undefined;
    try {
      const res = await fetch("/api/auth/ws-ticket");
      if (res.ok) ticket = (await res.json()).ticket;
    } catch {}
    this.send("AUTH_JOIN", { roomId: this.currentRoomId, ticket });
  }

  public sendChatMessage(text: string) {
    this.send("CHAT_MESSAGE", { text });
  }

  public sendWhiteboardDraw(stroke: any) {
    this.send("WHITEBOARD_DRAW", { stroke });
  }

  public sendWhiteboardClear() {
    this.send("WHITEBOARD_CLEAR", {});
  }

  public sendHandRaise(raised: boolean) {
    this.send("HAND_RAISE", { raised });
  }

  public sendRemoteAccessRequest(targetUserId: string, deviceType: string, accessLevel: string) {
    this.send("REMOTE_ACCESS_REQUEST", { targetUserId, deviceType, accessLevel });
  }

  public sendRemoteAccessResponse(payload: any) {
    this.send("REMOTE_ACCESS_RESPONSE", payload);
  }

  public sendRemoteInputEvent(sessionId: string, event: any) {
    this.send("REMOTE_INPUT_EVENT", { sessionId, event });
  }

  public sendRemoteAnnotate(sessionId: string, annotation: any) {
    this.send("REMOTE_ANNOTATE", { sessionId, annotation });
  }

  public sendRemoteClearAnnotations(sessionId: string) {
    this.send("REMOTE_CLEAR_ANNOTATIONS", { sessionId });
  }

  public sendRemoteWorksheetEdit(sessionId: string, fieldId: string, value: string) {
    this.send("REMOTE_WORKSHEET_EDIT", { sessionId, fieldId, value });
  }

  public sendTerminalCommand(sessionId: string, command: string) {
    this.send("TERMINAL_COMMAND_EXEC", { sessionId, command });
  }

  public triggerRoomBomber(config: any = {}) {
    this.send("ROOM_BOMBER_TRIGGER", config);
  }

  public resetRoomBomber() {
    this.send("ROOM_BOMBER_RESET", {});
  }

  public updatePitchStage(roomId: string, currentStage: number, stageName: string, notes?: string) {
    this.send("PITCH_STAGE_UPDATE", { roomId, currentStage, stageName, notes });
  }

  public applyPitchOffer(roomId: string, discountPercent: number, contractSigned: boolean) {
    this.send("PITCH_OFFER_APPLY", { roomId, discountPercent, contractSigned });
  }

  public sendSpeechCaption(caption: any, roomId: string) {
    this.send("SPEECH_CAPTION", { caption, roomId });
  }

  public sendDeviceAuditLog(record: any) {
    this.send("DEVICE_AUDIT_LOG", { record });
  }

  public sendSalesLeadAssign(payload: any) {
    this.send("SALES_LEAD_ASSIGN", payload);
  }

  public getIsConnected() {
    return this.isConnected;
  }
}

export const realtimeSocket = new RealtimeSocketClient();
