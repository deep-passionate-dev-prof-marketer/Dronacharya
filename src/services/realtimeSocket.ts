import { Participant, RemoteAccessSession, PitchRoomStatus, UserRole } from "../types";

export type RealtimeEventHandler = (data: any) => void;

class RealtimeSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private isConnected = false;
  private reconnectTimer: any = null;
  private currentRoomId = "default-room";
  private currentUser: any = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        this.broadcastChannel = new BroadcastChannel("dronacharya_realtime_mesh_bus");
        this.broadcastChannel.onmessage = (event) => {
          try {
            const data = event.data;
            if (data && data.type) {
              this.emitLocal(data.type, data.payload || data);
            }
          } catch {}
        };
      } catch {}
    }
  }

  public connect(user?: any, roomId: string = "default-room") {
    if (user) this.currentUser = user;
    if (roomId) this.currentRoomId = roomId;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emitLocal("connection_status", { status: "connected" });

        // Auto join room with authenticated user identity
        if (this.currentUser) {
          this.authJoin();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type) {
            this.emitLocal(message.type, message);
          }
        } catch (e) {
          console.error("[RealtimeSocket] Error parsing message:", e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emitLocal("connection_status", { status: "disconnected" });
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn("[RealtimeSocket] WebSocket error:", err);
      };
    } catch (e) {
      console.error("[RealtimeSocket] Connection initiation error:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
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
      handlers.forEach((handler) => handler(data));
    }
  }

  public send(type: string, payload: any) {
    const message = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    // 1. Send over WebSocket if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch {}
    }

    // 2. Broadcast across all browser tabs and windows in real-time
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {}
    }
  }

  // Helper actions
  public joinRoom(user: any, roomId: string) {
    this.currentUser = user;
    this.currentRoomId = roomId;
    if (this.isConnected) {
      this.authJoin();
    } else {
      this.connect(user, roomId);
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
