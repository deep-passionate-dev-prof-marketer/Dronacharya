import http from "http";
import fs from "fs";
import path from "path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { getRoomPolicy, setupDeviceAccessRoutes, upsertRoomPolicy } from "./deviceAccessHub";
import { setupMediaRoutes } from "./media/mediaRoutes";
import { handleMediaUpgrade, startMediaServer } from "./media/mediaServer";
import { setupMatchingRoutes } from "./matchingHub";
import { requireAuth, SessionUser, userFromCookieHeader, userFromToken } from "./auth/session";
import crypto from "crypto";

/** CRM webhooks: shared-secret header when CRM_WEBHOOK_SECRET is set, otherwise staff sessions only. */
const crmWebhookAuth: express.RequestHandler = (req, res, next) => {
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (secret) {
    const got = Buffer.from(String(req.headers["x-webhook-secret"] || ""));
    const want = Buffer.from(secret);
    if (got.length === want.length && crypto.timingSafeEqual(got, want)) return next();
    return res.status(401).json({ error: "Invalid webhook secret" });
  }
  return requireAuth("admin", "sales_rep")(req, res, next);
};
import { setupEngagementRoutes } from "./engagementHub";
import { setupClassRoutes } from "./classesHub";
import { setupSecurityRoutes } from "./securityHub";
import { admittedByRoom, admittedLoaded, presenceProbes, roomListeners, setupRoomControlRoutes } from "./roomControlHub";
import { canAccessRoom, canHost, parentRoom } from "./roomAccess";
import { demoFeatures, demoOnly } from "./features";
import { createLimiter } from "./rateLimit";
import { setupClassSessionRoutes } from "./classSessionHub";
import { setupParentRoutes } from "./parentHub";
import { createSttServer, providerChainTranscriber, sameOrigin, setupSttRoutes } from "./sttHub";
import { setupAnalyticsRoutes } from "./analytics/routes";
import { setupAttendanceRoutes } from "./analytics/attendanceRoutes";
import { setupPeopleRoutes } from "./peopleHub";
import { setupSocialRoutes } from "./socialHub";
import { setupNotificationRoutes } from "./notifyHub";
import { setupHelpRoutes } from "./helpHub";
import { setupMaterialsRoutes } from "./materialsHub";
import { setupSlidesRoutes } from "./slidesHub";
import { setupBreakoutRoutes } from "./breakoutHub";

export interface ConnectedClient {
  ws: WebSocket;
  id: string;
  userId: string;
  name: string;
  role: "instructor" | "student" | "ta" | "admin" | "auditor" | "sales_rep" | "parent";
  roomId: string;
  /** Can host this room (decided once when the socket joins) */
  isHost: boolean;
  joinedAt: string;
  joinedAtMs: number;
}

export interface PitchRoomData {
  roomId: string;
  roomName: string;
  salesRepId: string;
  salesRepName: string;
  assignedRepEmail?: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  gradeLevel: number;
  academicGoals: string;
  currentSchool?: string;
  curriculumTrack?: string;
  leadQualityScore?: number;
  conversionProbability?: number;
  preCallSummary?: string;
  keyInsights?: string[];
  keySellingPoints?: string[];
  keyObjections?: Array<{ objection: string; winningResponse: string; category: string }>;
  currentStage: 1 | 2 | 3 | 4 | 5;
  stageName: "Diagnostic" | "Curriculum Showcase" | "Pedagogy & Rigor" | "Tuition & Scholarship" | "Enrollment Close";
  parentEngagementScore: number;
  scholarshipGrantedPercent: number;
  tuitionTotal: number;
  discountedTuition: number;
  contractStatus: "pending" | "signed" | "declined";
  startedAt: string;
  notes: string;
  postCallAudit?: any;
}

export interface RemoteSessionData {
  id: string;
  studentId: string;
  studentName: string;
  requesterId: string;
  requesterName: string;
  deviceType: "phone" | "tablet" | "laptop" | "desktop";
  deviceModel: string;
  osName: string;
  accessLevel: "view_only" | "annotate" | "full_control";
  status: "idle" | "requested" | "offered" | "active" | "paused" | "denied" | "ended";
  cursorPosition: { x: number; y: number };
  activeAnnotationTool: "pointer" | "pen" | "highlighter";
  annotations: Array<{ x: number; y: number; color: string; size: number }>;
  worksheetContent?: string;
  screenResolution: { width: number; height: number };
  fps: number;
  latencyMs: number;
  isMutedControl: boolean;
  interactiveContent: {
    activeApp: "worksheet" | "ide" | "terminal" | "browser" | "calculator";
    codeEditorText: string;
    terminalLogs: string[];
    worksheetAnswers: Record<string, string>;
    notesText: string;
  };
  actionLog: Array<{ timestamp: string; actor: string; description: string }>;
  requestedAt: string;
}

// -------------------------------------------------------------
// Real-Time Server State Store
// -------------------------------------------------------------

class RealtimeStateStore {
  public clients = new Map<WebSocket, ConnectedClient>();
  public rooms = new Map<string, { id: string; name: string; topic: string; participants: Set<string> }>();
  public pitchRooms = new Map<string, PitchRoomData>();
  public remoteSessions = new Map<string, RemoteSessionData>();
  public chatMessages = new Map<string, Array<{ id: string; senderId: string; senderName: string; role: string; text: string; timestamp: string }>>();
  public whiteboardStrokes = new Map<string, Array<any>>();
  public polls = new Map<string, any>();
  public speechCaptions = new Map<string, Array<any>>();
  public deviceAudits = new Map<string, any>();
  public isRoomBomberActive = false;

  public getClientsInRoom(roomId: string): ConnectedClient[] {
    const result: ConnectedClient[] = [];
    for (const client of this.clients.values()) {
      if (client.roomId === roomId) {
        result.push(client);
      }
    }
    return result;
  }
}

export const realtimeStore = new RealtimeStateStore();

// -------------------------------------------------------------
// WebSocket Protocol & Hub Setup
// -------------------------------------------------------------

export function setupRealtimeWebSocket(httpServer: http.Server, app: express.Express) {
  // One HTTP server, routed by path: /stt is server speech-to-text, everything else is the realtime room socket
  // 64 KB per message is plenty for signalling, strokes and captions
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  const socketLimiter = createLimiter(200, 1000);
  const stt = createSttServer(providerChainTranscriber);
  httpServer.on("upgrade", async (req, socket, head) => {
    try {
      if (await stt.handleUpgrade(req, socket, head)) return;
      if (!sameOrigin(req)) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      // The school's media server (class video and audio)
      if (handleMediaUpgrade(req, socket, head)) return;
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    } catch {
      socket.destroy();
    }
  });

  // Broadcast helper
  function broadcast(message: any, filterFn?: (client: ConnectedClient) => boolean) {
    const serialized = JSON.stringify(message);
    for (const [ws, client] of realtimeStore.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        if (!filterFn || filterFn(client)) {
          ws.send(serialized);
        }
      }
    }
  }

  /**
   * Learners wait in the lobby until a host admits them (same rule as the media server). While
   * waiting they get server messages (class status, "admitted") and nothing from the class itself.
   */
  const isWaiting = (c: Pick<ConnectedClient, "role" | "roomId" | "userId">) => c.role === "student" && !admittedByRoom.get(c.roomId)?.has(c.userId);

  /** Room messages from people in class go to people in class (never to or from the lobby). */
  function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket, opts: { includeWaiting?: boolean } = {}) {
    const serialized = JSON.stringify(message);
    for (const [ws, client] of realtimeStore.clients.entries()) {
      if (ws !== excludeWs && client.roomId === roomId && ws.readyState === WebSocket.OPEN && (opts.includeWaiting || !isWaiting(client))) {
        ws.send(serialized);
      }
    }
  }

  const publicParticipant = (c: ConnectedClient) => ({ id: c.userId, name: c.name, role: c.role, joinedAt: c.joinedAt, joinedAtMs: c.joinedAtMs, waiting: isWaiting(c) });

  // Device access policies, exception requests & audit trail
  setupDeviceAccessRoutes(app, broadcast);
  setupMediaRoutes(app);
  startMediaServer();
  setupMatchingRoutes(app);
  setupEngagementRoutes(app);
  setupClassRoutes(app);
  setupSecurityRoutes(app);
  setupRoomControlRoutes(app);
  setupClassSessionRoutes(app);
  setupParentRoutes(app);
  setupSttRoutes(app);
  setupAnalyticsRoutes(app);
  setupAttendanceRoutes(app);
  setupPeopleRoutes(app);
  setupSocialRoutes(app);
  setupNotificationRoutes(app);
  setupHelpRoutes(app);
  setupMaterialsRoutes(app);
  setupSlidesRoutes(app);
  setupBreakoutRoutes(app);

  // Server messages for a room (class status, polls, admissions…) also go out over this socket, so
  // they arrive even for people not on the media server (direct peer-to-peer mode) or who just reconnected
  roomListeners.add((roomSlug, topic, payload, toIdentities) => {
    const room = parentRoom(roomSlug);
    const serialized = JSON.stringify({ type: "SERVER_ROOM_DATA", roomId: room, message: { topic, payload, from: "server", fromRole: "server" } });
    for (const [sock, client] of realtimeStore.clients.entries()) {
      if (client.roomId !== room || sock.readyState !== WebSocket.OPEN) continue;
      if (toIdentities && !toIdentities.includes(client.userId)) continue;
      sock.send(serialized);
    }
    // Admitting or removing someone changes who's in the lobby: tell the room so lists stay right
    if (topic === "admitted" || topic === "removed") {
      const ids = topic === "admitted" ? ((payload as any)?.identities as string[]) || [] : [String((payload as any)?.identity || "")];
      for (const c of realtimeStore.getClientsInRoom(room)) {
        if (ids.includes(c.userId)) broadcastToRoom(room, { type: "PARTICIPANT_UPDATED", participant: publicParticipant(c) }, undefined, { includeWaiting: true });
      }
    }
  });
  presenceProbes.add((roomSlug) => realtimeStore.getClientsInRoom(parentRoom(roomSlug)).filter((c) => c.ws.readyState === WebSocket.OPEN).length);

  /** Staff who may see admissions (pitch room) data, which includes parents' contact details */
  const admissionsStaff = (c: ConnectedClient) => c.role === "admin" || c.role === "sales_rep";

  // Active WebSocket Connection Listener
  wss.on("connection", (ws: WebSocket, upgradeReq: http.IncomingMessage) => {
    let currentClient: ConnectedClient | null = null;
    let joining = false;
    // Identity for this socket comes from the signed session cookie sent with the upgrade request
    const sessionUser = userFromCookieHeader(upgradeReq.headers.cookie).then((r) => r?.user || null).catch(() => null);
    const connId = `conn-${crypto.randomUUID()}`;
    // A socket that hasn't joined a room within 15 s is closed
    const authTimer = setTimeout(() => {
      if (!currentClient) ws.close(4001, "authentication required");
    }, 15_000);
    authTimer.unref?.();

    ws.send(JSON.stringify({ type: "CONNECTED_ACK", timestamp: new Date().toISOString() }));

    ws.on("message", (raw: Buffer) => {
      // Per-socket flood protection (whiteboard strokes and WebRTC signalling are the busiest)
      if (!socketLimiter.hit(connId)) return;
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!data || typeof data !== "object" || typeof data.type !== "string") return;
      // Nothing but joining is accepted before the socket is signed in and in a room, and nothing
      // reaches the class from someone still waiting in the lobby
      if (data.type !== "AUTH_JOIN" && (!currentClient || isWaiting(currentClient))) return;
      handleMessage(data).catch((err) => console.error("[Realtime WS] Message processing error:", err?.message || err));
    });

    /** Puts this socket into a room after its user is verified and allowed in. */
    async function join(user: SessionUser, roomId: string) {
      // Joining another room: leave the current one first
      if (currentClient) leave();
      const isHost = await canHost(user, roomId);
      currentClient = {
        ws,
        id: connId,
        userId: user.id,
        name: user.name || "Participant",
        role: user.role as ConnectedClient["role"],
        roomId,
        isHost,
        joinedAtMs: Date.now(),
        joinedAt: new Date().toISOString(),
      };
      realtimeStore.clients.set(ws, currentClient);
      if (!realtimeStore.rooms.has(roomId)) realtimeStore.rooms.set(roomId, { id: roomId, name: roomId, topic: "", participants: new Set() });
      realtimeStore.rooms.get(roomId)!.participants.add(currentClient.userId);

      await admittedLoaded().catch(() => {});
      const waiting = isWaiting(currentClient);
      const participants = realtimeStore.getClientsInRoom(roomId).map(publicParticipant);
      ws.send(
        JSON.stringify({
          type: "ROOM_STATE_SYNC",
          roomId,
          you: { id: user.id, isHost, waiting },
          participants,
          // Admissions data (parents' contact details) only for admissions staff, and only when the demo is on
          pitchRooms: demoFeatures() && admissionsStaff(currentClient) ? Array.from(realtimeStore.pitchRooms.values()) : [],
          isRoomBomberActive: demoFeatures() ? realtimeStore.isRoomBomberActive : false,
          chatMessages: waiting ? [] : realtimeStore.chatMessages.get(roomId) || [],
        })
      );
      // Hosts see people arrive in the lobby too, so they can admit them
      broadcastToRoom(roomId, { type: "PARTICIPANT_JOINED", participant: publicParticipant(currentClient) }, ws, { includeWaiting: true });
    }

    function leave() {
      if (!currentClient) return;
      const { roomId, userId } = currentClient;
      realtimeStore.clients.delete(ws);
      const stillHere = realtimeStore.getClientsInRoom(roomId).some((c) => c.userId === userId);
      if (!stillHere) realtimeStore.rooms.get(roomId)?.participants.delete(userId);
      broadcastToRoom(roomId, { type: "PARTICIPANT_LEFT", userId }, undefined, { includeWaiting: true });
      currentClient = null;
    }

    async function handleMessage(data: any) {
      const { type } = data;
      const payload = data.payload && typeof data.payload === "object" ? data.payload : {};

      switch (type) {
        // Client authenticates & joins a room (identity from the signed session, never from the message)
        case "AUTH_JOIN": {
          if (joining) return;
          joining = true;
          try {
            const roomId = String(payload.roomId || "").slice(0, 120);
            if (!roomId) return;
            const fromTicket = payload.ticket ? await userFromToken(String(payload.ticket), "ws").then((r) => r?.user || null) : null;
            const user = fromTicket || (await sessionUser);
            if (!user) {
              ws.send(JSON.stringify({ type: "AUTH_REQUIRED" }));
              return;
            }
            const room = parentRoom(roomId);
            const pitchRoom = realtimeStore.pitchRooms.get(room);
            const allowed = pitchRoom
              ? user.role === "admin" || user.id === pitchRoom.salesRepId || user.id === pitchRoom.studentId
              : await canAccessRoom(user, room);
            if (!allowed || user.role === "parent") {
              ws.send(JSON.stringify({ type: "ROOM_ACCESS_DENIED", roomId: room, reason: "You're not on this class's list." }));
              return;
            }
            clearTimeout(authTimer);
            await join(user, room);
          } finally {
            joining = false;
          }
          break;
        }

        // Live chat (own room only; capped)
        case "CHAT_MESSAGE": {
          const c = currentClient!;
          const text = String(payload.text || "").trim().slice(0, 1000);
          if (!text) return;
          const message = { id: `msg-${crypto.randomUUID()}`, senderId: c.userId, senderName: c.name, role: c.role, text, timestamp: new Date().toISOString() };
          const list = realtimeStore.chatMessages.get(c.roomId) || [];
          list.push(message);
          if (list.length > 200) list.splice(0, list.length - 200);
          realtimeStore.chatMessages.set(c.roomId, list);
          broadcastToRoom(c.roomId, { type: "CHAT_BROADCAST", message });
          break;
        }

        // Peer-to-peer fallback: classroom data messages and WebRTC signalling relayed to the room.
        // The sender's id, name and role are always set here, never taken from the message.
        case "ROOM_DATA":
        case "MESH_SIGNAL": {
          const c = currentClient!;
          if (type === "ROOM_DATA") {
            const message = payload.message && typeof payload.message === "object" ? payload.message : null;
            if (!message || JSON.stringify(message).length > 32_000) return;
            broadcastToRoom(c.roomId, { type, roomId: c.roomId, message: { ...message, from: c.userId, fromRole: c.role, fromHost: c.isHost } }, ws);
          } else {
            const signal = payload.signal && typeof payload.signal === "object" ? payload.signal : null;
            if (!signal || JSON.stringify(signal).length > 32_000) return;
            const stamped = JSON.stringify({ type, roomId: c.roomId, signal: { ...signal, senderId: c.userId, senderName: c.name, senderRole: c.role } });
            // Offers, answers and ICE candidates (which carry network addresses) go only to their target
            const target = typeof signal.targetId === "string" ? signal.targetId : null;
            for (const [sock, other] of realtimeStore.clients.entries()) {
              if (sock === ws || other.roomId !== c.roomId || sock.readyState !== WebSocket.OPEN || isWaiting(other)) continue;
              if (target && other.userId !== target) continue;
              sock.send(stamped);
            }
          }
          break;
        }

        // Collaborative whiteboard (legacy socket path)
        case "WHITEBOARD_DRAW": {
          const c = currentClient!;
          const stroke = payload.stroke;
          if (!stroke || typeof stroke !== "object" || JSON.stringify(stroke).length > 16_000) return;
          const list = realtimeStore.whiteboardStrokes.get(c.roomId) || [];
          list.push({ ...stroke, by: c.userId });
          if (list.length > 3000) list.splice(0, list.length - 3000);
          realtimeStore.whiteboardStrokes.set(c.roomId, list);
          broadcastToRoom(c.roomId, { type: "WHITEBOARD_BROADCAST", stroke: { ...stroke, by: c.userId } }, ws);
          break;
        }

        case "WHITEBOARD_CLEAR": {
          const c = currentClient!;
          // Clearing everyone's drawing is for hosts only
          if (!c.isHost) return;
          realtimeStore.whiteboardStrokes.set(c.roomId, []);
          broadcastToRoom(c.roomId, { type: "WHITEBOARD_CLEARED" });
          break;
        }

        case "HAND_RAISE": {
          const c = currentClient!;
          broadcastToRoom(c.roomId, { type: "HAND_RAISE_SYNC", userId: c.userId, raised: !!payload.raised });
          break;
        }

        // Live captions: the speaker is always the sender
        case "SPEECH_CAPTION": {
          const c = currentClient!;
          const caption = payload.caption && typeof payload.caption === "object" ? payload.caption : null;
          if (!caption || JSON.stringify(caption).length > 8_000) return;
          const stamped = { ...caption, speakerId: c.userId, speakerName: c.name, speakerRole: c.role };
          if (stamped.isFinal) {
            const list = realtimeStore.speechCaptions.get(c.roomId) || [];
            list.push(stamped);
            if (list.length > 150) list.shift();
            realtimeStore.speechCaptions.set(c.roomId, list);
          }
          broadcastToRoom(c.roomId, { type: "SPEECH_CAPTION_BROADCAST", caption: stamped });
          break;
        }

        case "DEVICE_AUDIT_LOG": {
          const c = currentClient!;
          // Stored for staff only (GET /api/audit/devices); never broadcast to the room
          const record = payload.record;
          if (record && typeof record === "object" && JSON.stringify(record).length < 16_000) realtimeStore.deviceAudits.set(c.userId, { ...record, userId: c.userId });
          break;
        }

        // ---------------- demo: remote device control (illustrative; off in production) ----------------
        case "REMOTE_ACCESS_REQUEST":
        case "REMOTE_ACCESS_RESPONSE":
        case "REMOTE_INPUT_EVENT":
        case "REMOTE_ANNOTATE":
        case "REMOTE_CLEAR_ANNOTATIONS":
        case "REMOTE_WORKSHEET_EDIT":
        case "TERMINAL_COMMAND_EXEC": {
          if (!demoFeatures()) return;
          handleRemoteDemo(type, payload, currentClient!);
          break;
        }

        // ---------------- demo: admissions pitch rooms (off in production; admissions staff only) ----------------
        case "ROOM_BOMBER_TRIGGER":
        case "ROOM_BOMBER_RESET":
        case "PITCH_STAGE_UPDATE":
        case "PITCH_OFFER_APPLY":
        case "SALES_LEAD_ASSIGN":
        case "PITCH_CALL_AUDIT_SAVE": {
          const c = currentClient!;
          if (!demoFeatures() || !admissionsStaff(c)) return;
          handlePitchDemo(type, payload, c);
          break;
        }

        default:
          break;
      }
    }

    /** Remote device control demo: only within the sender's room; a session's events only from its two people. */
    function handleRemoteDemo(type: string, payload: any, c: ConnectedClient) {
      const inRoom = (fn: (x: ConnectedClient) => boolean) => (x: ConnectedClient) => x.roomId === c.roomId && fn(x);
      if (type === "REMOTE_ACCESS_REQUEST") {
        broadcast({ type: "REMOTE_ACCESS_INCOMING", requesterId: c.userId, requesterName: c.name, targetUserId: payload.targetUserId, deviceType: payload.deviceType, accessLevel: payload.accessLevel }, inRoom((x) => x.userId === payload.targetUserId));
        return;
      }
      if (type === "REMOTE_ACCESS_RESPONSE") {
        // Only the learner whose device it is can grant access
        if (!payload.accepted) {
          broadcast({ type: "REMOTE_ACCESS_DENIED", studentId: c.userId }, inRoom((x) => x.isHost));
          return;
        }
        const session: RemoteSessionData = {
          id: String(payload.sessionId || `ras-${Date.now()}`).slice(0, 60),
          studentId: c.userId,
          studentName: c.name,
          requesterId: String(payload.requesterId || ""),
          requesterName: String(payload.requesterName || "Teacher").slice(0, 80),
          deviceType: payload.deviceType || "laptop",
          deviceModel: "This device",
          osName: "",
          accessLevel: ["view_only", "annotate", "full_control"].includes(payload.accessLevel) ? payload.accessLevel : "view_only",
          status: "active",
          cursorPosition: { x: 0.5, y: 0.5 },
          activeAnnotationTool: "pen",
          annotations: [],
          screenResolution: { width: 1920, height: 1080 },
          fps: 0,
          latencyMs: 0,
          isMutedControl: false,
          interactiveContent: { activeApp: "worksheet", codeEditorText: "", terminalLogs: [], worksheetAnswers: {}, notesText: "" },
          actionLog: [{ timestamp: new Date().toISOString(), actor: c.name, description: "Accepted remote session" }],
          requestedAt: new Date().toISOString(),
        };
        realtimeStore.remoteSessions.set(session.id, session);
        broadcast({ type: "REMOTE_SESSION_UPDATED", session }, inRoom((x) => x.userId === session.studentId || x.userId === session.requesterId));
        return;
      }
      const session = realtimeStore.remoteSessions.get(String(payload.sessionId || ""));
      if (!session || (c.userId !== session.studentId && c.userId !== session.requesterId)) return;
      const toPair = inRoom((x) => x.userId === session.studentId || x.userId === session.requesterId);
      if (type === "REMOTE_INPUT_EVENT" && payload.event && typeof payload.event === "object") {
        if (payload.event.type === "move") session.cursorPosition = { x: Number(payload.event.x) || 0, y: Number(payload.event.y) || 0 };
        broadcast({ type: "REMOTE_EVENT_RELAY", sessionId: session.id, event: payload.event }, toPair);
      } else if (type === "REMOTE_ANNOTATE" && payload.annotation) {
        if (session.annotations.length < 2000) session.annotations.push(payload.annotation);
        broadcast({ type: "REMOTE_ANNOTATION_ADDED", sessionId: session.id, annotation: payload.annotation }, toPair);
      } else if (type === "REMOTE_CLEAR_ANNOTATIONS") {
        session.annotations = [];
        broadcast({ type: "REMOTE_ANNOTATIONS_CLEARED", sessionId: session.id }, toPair);
      } else if (type === "REMOTE_WORKSHEET_EDIT") {
        session.interactiveContent.worksheetAnswers[String(payload.fieldId).slice(0, 40)] = String(payload.value ?? "").slice(0, 2000);
        broadcast({ type: "REMOTE_WORKSHEET_SYNC", sessionId: session.id, fieldId: payload.fieldId, value: payload.value }, toPair);
      } else if (type === "TERMINAL_COMMAND_EXEC") {
        // Illustrative terminal: nothing is executed
        session.interactiveContent.terminalLogs.push(`$ ${String(payload.command || "").slice(0, 200)}`, "(demo terminal: commands aren't run)");
        broadcast({ type: "TERMINAL_LOG_SYNC", sessionId: session.id, logs: session.interactiveContent.terminalLogs.slice(-200) }, toPair);
      }
    }

    function handlePitchDemo(type: string, payload: any, c: ConnectedClient) {
      if (type === "ROOM_BOMBER_TRIGGER") return executeRoomBomberPartition(c.roomId);
      if (type === "ROOM_BOMBER_RESET") return resetRoomBomberToMainHall(c.roomId);
      const pitchRoom = realtimeStore.pitchRooms.get(String(payload.roomId || ""));
      if (type === "SALES_LEAD_ASSIGN") {
        broadcast({ type: "SALES_LEAD_ASSIGN_BROADCAST", lead: payload.lead, rep: payload.rep, timestamp: new Date().toISOString() }, admissionsStaff);
        return;
      }
      if (!pitchRoom || (c.role !== "admin" && c.userId !== pitchRoom.salesRepId)) return;
      if (type === "PITCH_STAGE_UPDATE") {
        const stage = Math.min(5, Math.max(1, Number(payload.currentStage) || 1)) as PitchRoomData["currentStage"];
        pitchRoom.currentStage = stage;
        pitchRoom.stageName = payload.stageName || pitchRoom.stageName;
        if (payload.notes) pitchRoom.notes = String(payload.notes).slice(0, 2000);
        broadcast({ type: "PITCH_STAGE_SYNC", pitchRoom }, admissionsStaff);
      } else if (type === "PITCH_OFFER_APPLY") {
        pitchRoom.scholarshipGrantedPercent = Math.min(50, Math.max(0, Number(payload.discountPercent) || 0));
        pitchRoom.discountedTuition = Math.round(pitchRoom.tuitionTotal * (1 - pitchRoom.scholarshipGrantedPercent / 100));
        broadcast({ type: "PITCH_OFFER_SYNC", pitchRoom }, admissionsStaff);
      } else if (type === "PITCH_CALL_AUDIT_SAVE") {
        pitchRoom.postCallAudit = payload.auditReport;
        broadcast({ type: "PITCH_CALL_AUDIT_SAVED", roomId: pitchRoom.roomId }, admissionsStaff);
      }
    }

    ws.on("close", () => {
      clearTimeout(authTimer);
      leave();
    });
  });

  // -------------------------------------------------------------
  // Room Bomber Partitioning Algorithm
  // -------------------------------------------------------------
  /** Demo: splits the learners in one room (never the whole platform) into 1:1 counselling rooms. */
  function executeRoomBomberPartition(fromRoom: string) {
    realtimeStore.isRoomBomberActive = true;
    realtimeStore.pitchRooms.clear();

    // 1. Learners and counsellors in the room it was started from
    const studentClients = realtimeStore.getClientsInRoom(fromRoom).filter((c) => c.role === "student");
    const salesRepClients = realtimeStore.getClientsInRoom(fromRoom).filter((c) => c.role === "sales_rep");

    // Standard pool of specialized admissions counselors
    const fallbackSalesReps = [
      { id: "sales-kabir", name: "Kabir Mehta", email: "k.mehta@admissions.21k.school" },
      { id: "sales-carlos", name: "Carlos Ruiz", email: "c.ruiz@admissions.21k.school" },
      { id: "sales-priya", name: "Priya Desai", email: "p.desai@admissions.21k.school" },
      { id: "sales-sarah", name: "Sarah Jenkins", email: "s.jenkins@admissions.21k.school" },
    ];

    // Standard pool of prospective students if only a few are connected
    const fallbackStudents = [
      { id: "prospect-1", name: "Lucas Hernandez", parentName: "Mateo Hernandez", parentEmail: "mateo.h@family.es", parentPhone: "+34 612 345 678", gradeLevel: 10, academicGoals: "Cambridge IGCSE + European Quantum Computing Track", currentSchool: "Colegio San Patricio (Madrid)", curriculumTrack: "Cambridge IGCSE" },
      { id: "prospect-2", name: "Aarav Sharma", parentName: "Rajesh & Meera Sharma", parentEmail: "rajesh.sharma@parent.in", parentPhone: "+91 98201 23456", gradeLevel: 11, academicGoals: "American High School Honors + AP Physics Prep", currentSchool: "Bombay Scottish Physical School", curriculumTrack: "American Diploma" },
      { id: "prospect-3", name: "Chloe Dupont", parentName: "Jean-Marc Dupont", parentEmail: "jm.dupont@paris.fr", parentPhone: "+33 6 12 34 56 78", gradeLevel: 4, academicGoals: "Robotics Floww + Primary Coding Foundations", currentSchool: "École Primaire Victor Hugo (Paris)", curriculumTrack: "Robotics Floww" },
      { id: "prospect-4", name: "Ethan Vance", parentName: "Caroline Vance", parentEmail: "c.vance@boston.us", parentPhone: "+1 (617) 555-0192", gradeLevel: 9, academicGoals: "Competitive STEM, Chess Master & AI Track", currentSchool: "Brookline High School (Boston)", curriculumTrack: "American High School Honors" },
    ];

    // Merge connected students with fallback prospects to ensure complete 1:1 demonstration
    const activeStudentList = studentClients.length >= 2
      ? studentClients.map((c, i) => ({
          id: c.userId,
          name: c.name,
          parentName: `Parent of ${c.name}`,
          parentEmail: "",
          parentPhone: "",
          gradeLevel: 0,
          academicGoals: "",
          currentSchool: "International Academy",
          curriculumTrack: "Cambridge IGCSE",
          clientWs: c.ws,
        }))
      : fallbackStudents.map((s, i) => ({
          ...s,
          clientWs: studentClients[i]?.ws || null,
        }));

    const roomNames = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Omega"];

    activeStudentList.forEach((student, index) => {
      const roomId = `bomber-room-${index + 1}`;
      const roomName = `Pitch Room #${index + 1} (${roomNames[index] || "Sales"})`;

      // Select sales rep
      const salesRep = salesRepClients[index]
        ? { id: salesRepClients[index].userId, name: salesRepClients[index].name, email: `${salesRepClients[index].name.toLowerCase().replace(/\s+/g, ".")}@admissions.21k.school`, clientWs: salesRepClients[index].ws }
        : { ...fallbackSalesReps[index % fallbackSalesReps.length], clientWs: null };

      const pitchRoom: PitchRoomData = {
        roomId,
        roomName,
        salesRepId: salesRep.id,
        salesRepName: salesRep.name,
        assignedRepEmail: salesRep.email,
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        parentPhone: student.parentPhone,
        gradeLevel: student.gradeLevel,
        academicGoals: student.academicGoals,
        currentSchool: student.currentSchool || "Traditional Physical School",
        curriculumTrack: student.curriculumTrack || "Cambridge IGCSE",
        leadQualityScore: 94 - index * 3,
        conversionProbability: 88 - index * 4,
        preCallSummary: `High-intent family looking for specialized pacing and individualized mentorship for ${student.name}. Seeking international accreditation without local commuting delays.`,
        keyInsights: [
          `Parent ${student.parentName} is analytical and values technical accreditation proof over emotional sales pitches.`,
          `Student ${student.name} thrives in 1:4 collaborative interactive cohorts.`,
          "Immediate enrollment decision window for upcoming semester.",
        ],
        keySellingPoints: [
          "1:4 Student-to-Teacher Ratio with Cambridge-certified mentors.",
          "PhET & WebXR 3D interactive laboratory simulations in classroom dock.",
          "Cognia & Cambridge Assessment International Education accreditation with Hague Apostille seal.",
        ],
        keyObjections: [
          {
            category: "Accreditation",
            objection: "Is online schooling recognized by European and US universities?",
            winningResponse: "Yes, 21K School issues official Cambridge and Cognia-accredited transcripts accepted by universities worldwide.",
          },
          {
            category: "Socialization",
            objection: "Will the student miss out on physical peer socialization?",
            winningResponse: "21K fosters deep connection through 40+ global clubs, student study groups, and regional campus meetups.",
          },
        ],
        currentStage: 1,
        stageName: "Diagnostic",
        parentEngagementScore: 82,
        scholarshipGrantedPercent: 0,
        tuitionTotal: 6500,
        discountedTuition: 6500,
        contractStatus: "pending",
        startedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        notes: `Focusing on ${student.academicGoals}. Parent receptive to Cambridge alignment.`,
      };

      realtimeStore.pitchRooms.set(roomId, pitchRoom);

      // Register the breakout room
      realtimeStore.rooms.set(roomId, {
        id: roomId,
        name: roomName,
        topic: `1:1 Private Enrollment Pitch · ${student.name} & ${student.parentName}`,
        participants: new Set([salesRep.id, student.id]),
      });

      // Send dispatch notification to specific clients if connected
      if (student.clientWs && student.clientWs.readyState === WebSocket.OPEN) {
        student.clientWs.send(
          JSON.stringify({
            type: "ROOM_BOMBED_DISPATCH",
            targetRoomId: roomId,
            roomName,
            partnerRole: "Sales Director & Counselor",
            partnerName: salesRep.name,
            isPitchHUD: false,
          })
        );
      }

      if (salesRep.clientWs && salesRep.clientWs.readyState === WebSocket.OPEN) {
        salesRep.clientWs.send(
          JSON.stringify({
            type: "ROOM_BOMBED_DISPATCH",
            targetRoomId: roomId,
            roomName,
            partnerRole: "Student & Parent",
            partnerName: `${student.name} & ${student.parentName}`,
            isPitchHUD: true,
            pitchRoom,
          })
        );
      }
    });

    // The grid (with parents' details) goes to admissions staff only
    broadcast(
      {
        type: "ROOM_BOMBER_GRID_SYNC",
        active: true,
        pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
      },
      (c) => c.role === "admin" || c.role === "sales_rep"
    );
  }

  /** Demo: sends everyone in the pitch rooms back to the room the demo started from. */
  function resetRoomBomberToMainHall(toRoom: string) {
    realtimeStore.isRoomBomberActive = false;
    const pitchIds = new Set(realtimeStore.pitchRooms.keys());
    broadcast(
      {
        type: "ROOM_BOMBER_RESET_NOTIFY",
        targetRoomId: toRoom,
        message: "Counselling rooms closed. Everyone is back in the main room.",
      },
      (c) => pitchIds.has(c.roomId) || c.roomId === toRoom
    );
    realtimeStore.pitchRooms.clear();
  }

  // -------------------------------------------------------------
  // REST API Endpoints for State & Documentation
  // -------------------------------------------------------------

  // 1. Room Bomber REST Endpoints
  app.get("/api/room-bomber/status", demoOnly, requireAuth("admin", "sales_rep"), (_req, res) => {
    res.json({
      active: realtimeStore.isRoomBomberActive,
      totalRooms: realtimeStore.pitchRooms.size,
      pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
    });
  });

  app.post("/api/room-bomber/trigger", demoOnly, requireAuth("admin", "sales_rep"), (req, res) => {
    executeRoomBomberPartition(String(req.body?.roomId || "").slice(0, 120));
    res.json({
      success: true,
      message: "Room Bomber successfully partitioned students into 1:1 pitch rooms.",
      pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
    });
  });

  app.post("/api/room-bomber/reset", demoOnly, requireAuth("admin", "sales_rep"), (req, res) => {
    resetRoomBomberToMainHall(String(req.body?.roomId || "").slice(0, 120));
    res.json({ success: true, message: "All participants recalled to main hall." });
  });

  app.post("/api/room-bomber/stage", demoOnly, requireAuth("admin", "sales_rep"), (req, res) => {
    const { roomId, currentStage, stageName, notes } = req.body;
    const room = realtimeStore.pitchRooms.get(roomId);
    if (!room || (req.user!.role !== "admin" && room.salesRepId !== req.user!.id)) return res.status(404).json({ error: "Pitch room not found" });

    room.currentStage = Math.min(5, Math.max(1, Number(currentStage) || 1)) as PitchRoomData["currentStage"];
    room.stageName = stageName;
    if (notes) room.notes = notes;
    room.parentEngagementScore = Math.min(98, 70 + currentStage * 6);

    broadcast({ type: "PITCH_STAGE_SYNC", pitchRoom: room }, (c) => c.role === "admin" || c.role === "sales_rep");
    res.json({ success: true, pitchRoom: room });
  });

  app.post("/api/room-bomber/offer", demoOnly, requireAuth("admin", "sales_rep"), (req, res) => {
    const { roomId, discountPercent } = req.body;
    const room = realtimeStore.pitchRooms.get(roomId);
    if (!room || (req.user!.role !== "admin" && room.salesRepId !== req.user!.id)) return res.status(404).json({ error: "Pitch room not found" });

    room.scholarshipGrantedPercent = Math.min(50, Math.max(0, Number(discountPercent) || 0));
    room.discountedTuition = Math.round(room.tuitionTotal * (1 - room.scholarshipGrantedPercent / 100));

    broadcast({ type: "PITCH_OFFER_SYNC", pitchRoom: room }, (c) => c.role === "admin" || c.role === "sales_rep");
    res.json({ success: true, pitchRoom: room });
  });

  // 2. Standalone Documentation Reader REST Endpoints
  // Platform documentation (architecture, security posture): staff only
  app.get("/api/docs/list", requireAuth("admin", "auditor", "instructor", "sales_rep"), (_req, res) => {
    res.json([
      { id: "PRD", title: "Product Requirements Document", file: "PRD.md" },
      { id: "BRD", title: "Business Requirements Document", file: "BRD.md" },
      { id: "LMD", title: "Low-Level Model Document", file: "LMD.md" },
      { id: "MMD", title: "Mid-Level Model Document", file: "MMD.md" },
      { id: "HMD", title: "High-Level Model Document", file: "HMD.md" },
      { id: "FEATURES", title: "Features & Functionality Guide", file: "FEATURES_AND_FUNCTIONALITY.md" },
      { id: "FLOWS", title: "Architecture & Sequence Flows", file: "ARCHITECTURE_AND_FLOWS.md" },
      { id: "DEPLOY", title: "Deploying on your own server", file: "DEPLOY.md" },
    ]);
  });

  app.get("/api/docs/:id", requireAuth("admin", "auditor", "instructor", "sales_rep"), (req, res) => {
    const docMap: Record<string, string> = {
      PRD: "PRD.md",
      BRD: "BRD.md",
      LMD: "LMD.md",
      MMD: "MMD.md",
      HMD: "HMD.md",
      FEATURES: "FEATURES_AND_FUNCTIONALITY.md",
      FLOWS: "ARCHITECTURE_AND_FLOWS.md",
      DEPLOY: "DEPLOY.md",
    };

    // Only the documents listed here: the id is never used to build a path (no ../ reads)
    const fileName = docMap[String(req.params.id).toUpperCase()];
    if (!fileName) return res.status(404).json({ error: "Document not found." });
    const fullPath = path.resolve(process.cwd(), "docs", fileName);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      res.json({ id: req.params.id, title: fileName, content });
    } else {
      res.status(404).json({ error: `Document ${req.params.id} not found.` });
    }
  });

  // 3. Authenticated Multi-Role Login Endpoint
  // 3. Authenticated Multi-Role Login Endpoint with Auto-Detected Device Audit
  // The old endpoint issued a fake token for any claimed role. Sign-in now lives in src/server/auth.
  app.post("/api/auth/login", (_req, res) => {
    res.status(410).json({ error: "Use /api/auth/password/login (or an email code or invite link)." });
  });

  // Device Audit & Compliance Endpoints
  app.get("/api/audit/devices", requireAuth("admin", "auditor"), (_req, res) => {
    const devices = Array.from(realtimeStore.deviceAudits.values());
    res.json({ success: true, devices });
  });

  app.post("/api/audit/devices", requireAuth(), (req, res) => {
    // A device record always belongs to the signed-in sender
    const record = req.body;
    if (!record || typeof record !== "object" || JSON.stringify(record).length > 8_000) return res.status(400).json({ error: "Invalid device record" });
    realtimeStore.deviceAudits.set(req.user!.id, { ...record, userId: req.user!.id });
    res.json({ success: true });
  });

  // 4. Live System Rooms and Participants State
  app.get("/api/state/rooms", requireAuth("admin", "auditor"), (_req, res) => {
    res.json(Array.from(realtimeStore.rooms.values()).map((r) => ({ id: r.id, participantsCount: r.participants.size })));
  });

  app.get("/api/state/participants", requireAuth("admin", "auditor"), (_req, res) => {
    res.json(Array.from(realtimeStore.clients.values()).map((c) => ({ id: c.userId, name: c.name, role: c.role, roomId: c.roomId, joinedAt: c.joinedAt })));
  });

  // -------------------------------------------------------------
  // 5. Standardized Link Nomenclature & Base62 Shortlinks
  // -------------------------------------------------------------
  const shortlinksDatabase: Array<{
    id: string;
    slug: string;
    shortCode: string;
    fullUrl: string;
    shortUrl: string;
    schoolBrand: string;
    countryCode: string;
    gradeLevel: number;
    subjectCode: string;
    createdAt: string;
    clicksCount: number;
  }> = [
    {
      id: "sl-1",
      slug: "in-21kos-gr10-bc-phy-vance",
      shortCode: "8xN2pQ",
      fullUrl: "/room/in-21kos-gr10-bc-phy-vance",
      shortUrl: "/s/8xN2pQ",
      schoolBrand: "21kos",
      countryCode: "in",
      gradeLevel: 10,
      subjectCode: "phy",
      createdAt: "Today 08:30 AM",
      clicksCount: 42,
    },
    {
      id: "sl-2",
      slug: "sg-21klf-gr8-rb-secA-sharma",
      shortCode: "3mK9sR",
      fullUrl: "/room/sg-21klf-gr8-rb-secA-sharma",
      shortUrl: "/s/3mK9sR",
      schoolBrand: "21klf",
      countryCode: "sg",
      gradeLevel: 8,
      subjectCode: "robotics",
      createdAt: "Today 08:45 AM",
      clicksCount: 29,
    },
    {
      id: "sl-3",
      slug: "ae-21kos-gr11-ib-math-iyer",
      shortCode: "9pL4wE",
      fullUrl: "/room/ae-21kos-gr11-ib-math-iyer",
      shortUrl: "/s/9pL4wE",
      schoolBrand: "21kos",
      countryCode: "ae",
      gradeLevel: 11,
      subjectCode: "math",
      createdAt: "Today 09:00 AM",
      clicksCount: 18,
    },
  ];

  app.get("/api/links/all", requireAuth("admin", "instructor", "sales_rep"), (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const dynamicLinks = shortlinksDatabase.map((item) => ({
      ...item,
      fullUrl: `${origin}/room/${item.slug}`,
      shortUrl: `${origin}/s/${item.shortCode}`,
      devicePolicy: getRoomPolicy(item.slug),
    }));
    res.json(dynamicLinks);
  });

  app.post("/api/links/shorten", requireAuth("admin", "instructor", "sales_rep"), (req, res) => {
    const { slug, schoolBrand, countryCode, gradeLevel, subjectCode, courseCode, sessionType, devicePolicy, actor } = req.body;
    const origin = `${req.protocol}://${req.get("host")}`;
    const base62 = Math.random().toString(36).substring(2, 8);
    const targetSlug = slug || "in-21kos-gr10-bc-stem";
    const newRecord = {
      id: `sl-${Date.now()}`,
      slug: targetSlug,
      shortCode: base62,
      fullUrl: `${origin}/room/${targetSlug}`,
      shortUrl: `${origin}/s/${base62}`,
      schoolBrand: schoolBrand || "21kos",
      countryCode: countryCode || "in",
      gradeLevel: gradeLevel || 10,
      subjectCode: subjectCode || "stem",
      createdAt: "Just now",
      clicksCount: 0,
    };
    shortlinksDatabase.unshift(newRecord);
    const policy = upsertRoomPolicy({
      roomSlug: targetSlug,
      context: { sessionType, schoolBrand: newRecord.schoolBrand, courseCode, subjectCode: newRecord.subjectCode, gradeLevel: newRecord.gradeLevel },
      mode: devicePolicy?.mode,
      allowedDeviceTypes: devicePolicy?.allowedDeviceTypes,
      allowRequestOverride: devicePolicy?.allowRequestOverride,
      linkShortCode: base62,
      actor,
      eventType: "link_generated",
    });
    res.json({ success: true, record: { ...newRecord, devicePolicy: policy } });
  });

  app.get("/api/links/resolve/:shortCode", (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const item = shortlinksDatabase.find((l) => l.shortCode.toLowerCase() === req.params.shortCode.toLowerCase());
    if (item) {
      item.clicksCount += 1;
      return res.json({
        found: true,
        record: {
          ...item,
          fullUrl: `${origin}/room/${item.slug}`,
          shortUrl: `${origin}/s/${item.shortCode}`,
        },
      });
    }
    res.status(404).json({ found: false, error: "Shortlink not found" });
  });

  app.get("/s/:shortCode", (req, res) => {
    const item = shortlinksDatabase.find((l) => l.shortCode.toLowerCase() === req.params.shortCode.toLowerCase());
    if (item) {
      item.clicksCount += 1;
      // Shortlinks are what gets shared with learners, so they open the student portal (device gate included)
      return res.redirect(`/?room=${encodeURIComponent(item.slug)}&role=student&lc=${encodeURIComponent(item.shortCode)}`);
    }
    res.redirect("/");
  });

  // -------------------------------------------------------------
  // 6. Multi-Criteria Facilitator Assignment Engine
  // -------------------------------------------------------------
  const candidateFaculty = [
    {
      id: "tch-vance",
      name: "Dr. Evelyn Vance",
      email: "e.vance@faculty.21k.school",
      country: "India",
      countryCode: "in",
      state: "Karnataka",
      city: "Bengaluru",
      languages: ["English", "Hindi", "French"],
      subjects: ["Quantum Physics", "Physics", "Linear Algebra"],
      qualityScore: 98,
      activeWeeklyHours: 16,
      maxWeeklyHours: 24,
      status: "in_class",
      isSubstituteEligible: true,
    },
    {
      id: "tch-sharma",
      name: "Prof. Arjun Sharma",
      email: "a.sharma@faculty.21k.school",
      country: "India",
      countryCode: "in",
      state: "Maharashtra",
      city: "Mumbai",
      languages: ["English", "Hindi", "German"],
      subjects: ["Robotics", "Coding", "Artificial Intelligence"],
      qualityScore: 95,
      activeWeeklyHours: 14,
      maxWeeklyHours: 22,
      status: "available",
      isSubstituteEligible: true,
    },
    {
      id: "tch-iyer",
      name: "Dr. Ananya Iyer",
      email: "a.iyer@faculty.21k.school",
      country: "United Arab Emirates",
      countryCode: "ae",
      state: "Dubai",
      city: "Dubai",
      languages: ["English", "Arabic", "Hindi"],
      subjects: ["Mathematics", "Data Science", "Bio-Sciences"],
      qualityScore: 96,
      activeWeeklyHours: 12,
      maxWeeklyHours: 22,
      status: "available",
      isSubstituteEligible: true,
    },
    {
      id: "tch-ray",
      name: "Kaelen Ray",
      email: "k.ray@faculty.21k.school",
      country: "Singapore",
      countryCode: "sg",
      state: "Central",
      city: "Singapore",
      languages: ["English", "Mandarin"],
      subjects: ["Applied STEM", "Coding", "Robotics"],
      qualityScore: 92,
      activeWeeklyHours: 10,
      maxWeeklyHours: 24,
      status: "available",
      isSubstituteEligible: true,
    },
  ];

  // Sample faculty roster (demo): staff only, and only when demos are on
  app.get("/api/facilitators/roster", demoOnly, requireAuth("admin", "instructor", "sales_rep", "auditor"), (_req, res) => {
    res.json(candidateFaculty);
  });

  app.post("/api/facilitators/substitute-failover", demoOnly, requireAuth("admin", "instructor", "sales_rep"), (req, res) => {
    const { roomCode, absentTeacherId, subject } = req.body;
    const substitute = candidateFaculty.find(
      (c) => c.id !== absentTeacherId && c.status === "available" && c.isSubstituteEligible
    ) || candidateFaculty[1];

    broadcast({
      type: "FACILITATOR_SUBSTITUTE_DISPATCHED",
      roomCode: roomCode || "in-21kos-gr10-bc-phy",
      originalTeacherId: absentTeacherId,
      substituteTeacher: substitute,
      reason: "Emergency Last-Minute Failover Protocol (<3s Automated Match)",
      timestamp: new Date().toLocaleTimeString(),
    });

    res.json({
      success: true,
      message: `Emergency substitute ${substitute.name} successfully auto-assigned in 1.4s.`,
      substitute,
    });
  });

  // -------------------------------------------------------------
  // 7. CRM Auto-Room Creation Webhook Simulation
  // -------------------------------------------------------------
  app.post("/api/crm/webhook", crmWebhookAuth, (req, res) => {
    const { crmSource, cohortName, schoolBrand, countryCode, gradeLevel, curriculum, subject, studentCount, primaryContactEmail } = req.body;

    const brand = (schoolBrand || "21kos").toLowerCase();
    const ctry = (countryCode || "in").toLowerCase();
    const gr = gradeLevel || 10;
    const curr = (curriculum || "bc").toLowerCase();
    const subj = (subject || "math").toLowerCase();
    const shortCode = Math.random().toString(36).substring(2, 8);
    const roomSlug = `${ctry}-${brand}-gr${gr}-${curr}-${subj}`;
    const origin = `${req.protocol}://${req.get("host")}`;
    const shortUrl = `${origin}/s/${shortCode}`;
    const fullUrl = `${origin}/room/${roomSlug}`;

    // Auto-match facilitator
    const assignedTeacher = candidateFaculty.find((f) => f.status === "available") || candidateFaculty[0];

    const crmProvisionedRoom = {
      id: `crm-${Date.now()}`,
      crmSource: crmSource || "Salesforce Enterprise",
      cohortName: cohortName || `Cohort Gr${gr}-${curr.toUpperCase()} (${subj.toUpperCase()})`,
      roomSlug,
      shortCode,
      shortUrl,
      assignedTeacher,
      studentCount: studentCount || 24,
      primaryContactEmail: primaryContactEmail || "lead.guardian@crm.in",
      status: "provisioned",
      provisionedAt: new Date().toLocaleTimeString(),
    };

    // Store in shortlinks
    shortlinksDatabase.unshift({
      id: `sl-${Date.now()}`,
      slug: roomSlug,
      shortCode,
      fullUrl,
      shortUrl,
      schoolBrand: brand,
      countryCode: ctry,
      gradeLevel: gr,
      subjectCode: subj,
      createdAt: "CRM Webhook Auto-Created",
      clicksCount: 0,
    });

    res.json({
      success: true,
      message: `Room ${roomSlug} auto-created via ${crmSource || "CRM Webhook"}.`,
      room: crmProvisionedRoom,
    });
  });

  // -------------------------------------------------------------
  // 7b. Inbound CRM Lead Assignment & Sales Rep Directory API
  // -------------------------------------------------------------
  const salesCounselorRoster = [
    {
      id: "rep-1",
      name: "Rajesh Khanna",
      email: "r.khanna@admissions.21k.school",
      languages: ["English", "Hindi", "Punjabi"],
      specializations: ["American High School", "Grade 9-12", "STEM Focus"],
      territory: "South Asia & GCC",
      status: "available",
      activePitchRoomsCount: 1,
      maxCapacity: 3,
      conversionRatePercent: 88,
      seniorityTier: "Senior Counselor",
    },
    {
      id: "rep-2",
      name: "Priya Sundaram",
      email: "p.sundaram@admissions.21k.school",
      languages: ["English", "Tamil", "Hindi"],
      specializations: ["British Cambridge IGCSE", "Grade 6-10"],
      territory: "India & Southeast Asia",
      status: "available",
      activePitchRoomsCount: 0,
      maxCapacity: 3,
      conversionRatePercent: 92,
      seniorityTier: "Principal Counselor",
    },
    {
      id: "rep-3",
      name: "Tariq Mansoor",
      email: "t.mansoor@admissions.21k.school",
      languages: ["English", "Arabic", "Urdu"],
      specializations: ["IB Diploma Programme", "Grade 11-12", "VIP Families"],
      territory: "Middle East & UAE",
      status: "available",
      activePitchRoomsCount: 1,
      maxCapacity: 2,
      conversionRatePercent: 95,
      seniorityTier: "Director of Admissions",
    },
  ];

  app.get("/api/crm/sales-reps", requireAuth("admin", "instructor", "sales_rep"), (_req, res) => {
    res.json({ success: true, reps: salesCounselorRoster });
  });

  app.post("/api/crm/lead-assign", requireAuth("admin", "instructor", "sales_rep"), (req, res) => {
    const { lead, preferredCounselorId } = req.body;
    const assignedRep = salesCounselorRoster.find((r) => r.id === preferredCounselorId) || salesCounselorRoster[0];

    broadcast({
      type: "SALES_LEAD_ASSIGN_BROADCAST",
      lead,
      rep: assignedRep,
      timestamp: new Date().toLocaleTimeString(),
    });

    res.json({
      success: true,
      message: `Lead ${lead?.studentName || "Prospect"} assigned to ${assignedRep.name} via CRM API webhook.`,
      lead,
      assignedRep,
    });
  });

}
