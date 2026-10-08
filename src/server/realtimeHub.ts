import http from "http";
import fs from "fs";
import path from "path";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { setupDeviceAccessRoutes, upsertRoomPolicy } from "./deviceAccessHub";

export interface ConnectedClient {
  ws: WebSocket;
  id: string;
  userId: string;
  name: string;
  role: "instructor" | "student" | "ta" | "admin" | "auditor" | "sales_rep";
  roomId: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  gradeLevel?: number;
  deviceType?: "phone" | "tablet" | "laptop" | "desktop";
  academicGoals?: string;
  joinedAt: string;
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

  constructor() {
    // Initialize standard primary classroom
    this.rooms.set("default-room", {
      id: "default-room",
      name: "Main STEM Hall · Dr. Vance",
      topic: "Quantum Mechanics & Superconducting Circuits",
      participants: new Set(),
    });

    // Seed default remote session for Sophia Chen's tablet
    this.remoteSessions.set("ras-tablet-sophia", {
      id: "ras-tablet-sophia",
      studentId: "stu-1",
      studentName: "Sophia Chen",
      requesterId: "host-1",
      requesterName: "Dr. Evelyn Vance",
      deviceType: "tablet",
      deviceModel: 'Apple iPad Pro 13" (M4)',
      osName: "iPadOS 18.2",
      accessLevel: "full_control",
      status: "active",
      cursorPosition: { x: 0.46, y: 0.38 },
      activeAnnotationTool: "pen",
      annotations: [
        { x: 0.36, y: 0.32, color: "#00C2E0", size: 4 },
        { x: 0.62, y: 0.52, color: "#FFBB00", size: 6 },
      ],
      worksheetContent:
        "Exercise 4.2: Calculate the density matrix trace for a 2-qubit entangled Bell State |Φ+⟩ = 1/√2 (|00⟩ + |11⟩).\n\nStep 1: Write state vector\nStep 2: Compute outer product ρ = |Φ+⟩⟨Φ+|\nStep 3: Verification: Tr(ρ) = 1/2 + 1/2 = 1.0 (Q.E.D.)",
      screenResolution: { width: 2064, height: 2752 },
      fps: 60,
      latencyMs: 9.8,
      isMutedControl: false,
      interactiveContent: {
        activeApp: "worksheet",
        codeEditorText: `# Superconducting Transmon Hamiltonian Simulation
import numpy as np

def calculate_transmon_levels(Ej, Ec, n_states=5):
    """Computes Josephson junction qubit eigenenergies"""
    matrix = np.zeros((n_states, n_states))
    for n in range(n_states):
        matrix[n, n] = 4 * Ec * (n**2)
        if n < n_states - 1:
            matrix[n, n + 1] = -0.5 * Ej
            matrix[n + 1, n] = -0.5 * Ej
    energies, _ = np.linalg.eigh(matrix)
    return energies

Ej_val, Ec_val = 20.0, 0.25 # GHz
eigenvalues = calculate_transmon_levels(Ej_val, Ec_val)
print("Qubit Transition Frequency f01:", round(eigenvalues[1] - eigenvalues[0], 3), "GHz")
`,
        terminalLogs: [
          "[system] 21K Remote Kernel v2.4 connected via BOM-1 PoP (11.4ms)",
          "[stdout] Qubit Transition Frequency f01: 4.891 GHz",
          "[stdout] Anharmonicity alpha: -248.4 MHz",
          "[system] Remote interactive session authorized (Full Control).",
        ],
        worksheetAnswers: {
          q1: "Tr(ρ) = 1.0",
          q2: "Hadamard H gate maps |0⟩ -> (|0⟩+|1⟩)/√2",
          q3: "Decoherence T2 phase drift along z-axis pole",
        },
        notesText: "Student Sophia Chen requested assistance on boundary matrix derivation for problem 4.2.",
      },
      actionLog: [
        { timestamp: "09:02 AM", actor: "Dr. Evelyn Vance", description: "Granted Full Remote Control on iPad Pro (M4)" },
        { timestamp: "09:05 AM", actor: "Dr. Evelyn Vance", description: "Executed remote python test in terminal" },
      ],
      requestedAt: "09:00 AM",
    });
  }

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
  const wss = new WebSocketServer({ server: httpServer });

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

  function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
    const serialized = JSON.stringify(message);
    for (const [ws, client] of realtimeStore.clients.entries()) {
      if (ws !== excludeWs && client.roomId === roomId && ws.readyState === WebSocket.OPEN) {
        ws.send(serialized);
      }
    }
  }

  // Device access policies, exception requests & audit trail
  setupDeviceAccessRoutes(app, broadcast);

  // Active WebSocket Connection Listener
  wss.on("connection", (ws: WebSocket) => {
    let currentClient: ConnectedClient | null = null;

    // Send initial ACK
    ws.send(
      JSON.stringify({
        type: "CONNECTED_ACK",
        timestamp: new Date().toISOString(),
        serverNode: "BOM-1 (Mumbai Local Cluster)",
        latencyMs: 11.4,
      })
    );

    ws.on("message", (raw: string) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type, payload } = data;

        switch (type) {
          // Client Authenticates & Joins a Room
          case "AUTH_JOIN": {
            const user = payload.user || {};
            const roomId = payload.roomId || "default-room";

            currentClient = {
              ws,
              id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              userId: user.id || `usr-${Date.now()}`,
              name: user.name || "Participant",
              role: user.role || "student",
              roomId,
              parentName: user.parentName || (user.role === "student" ? `${user.name?.split(" ")[1] || "Student"} Guardian` : undefined),
              parentEmail: user.parentEmail || (user.role === "student" ? `${user.name?.toLowerCase().replace(/\s+/g, ".")}@family.21k.school` : undefined),
              parentPhone: user.parentPhone || "+1 (555) 019-2834",
              gradeLevel: user.gradeLevel || 10,
              deviceType: user.deviceType || "laptop",
              academicGoals: user.academicGoals || "Advanced STEM, AI & Robotics Track",
              joinedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            realtimeStore.clients.set(ws, currentClient);

            // Strict 1:1 Room Bomber Access Enforcement
            const pitchRoom = realtimeStore.pitchRooms.get(roomId);
            if (pitchRoom) {
              const isRep = currentClient.role === "sales_rep";
              const isLead = currentClient.role === "student";

              if (isRep && currentClient.userId !== pitchRoom.salesRepId && currentClient.role !== "admin") {
                ws.send(
                  JSON.stringify({
                    type: "ROOM_ACCESS_DENIED",
                    roomId,
                    reason: `1:1 Room Locked: Only assigned counselor ${pitchRoom.salesRepName} is cryptographically authorized to join.`,
                  })
                );
                break;
              }

              if (isLead && currentClient.userId !== pitchRoom.studentId && currentClient.role !== "admin") {
                ws.send(
                  JSON.stringify({
                    type: "ROOM_ACCESS_DENIED",
                    roomId,
                    reason: `1:1 Room Locked: Exclusively reserved for ${pitchRoom.studentName}.`,
                  })
                );
                break;
              }
            }

            // Ensure room exists
            if (!realtimeStore.rooms.has(roomId)) {
              realtimeStore.rooms.set(roomId, {
                id: roomId,
                name: roomId === "default-room" ? "Main STEM Hall" : `Breakout Room ${roomId}`,
                topic: "Interactive Real-Time STEM Session",
                participants: new Set(),
              });
            }
            realtimeStore.rooms.get(roomId)!.participants.add(currentClient.userId);

            // Notify user of room sync
            const roomParticipants = realtimeStore.getClientsInRoom(roomId).map((c) => ({
              id: c.userId,
              name: c.name,
              role: c.role,
              avatarColor: "#0082FF",
              audioEnabled: true,
              videoEnabled: true,
              screenSharing: false,
              handRaised: false,
              audioLevel: 25,
              attendanceStatus: "present",
              joinedAt: c.joinedAt,
              parentEmail: c.parentEmail,
              parentName: c.parentName,
              parentPhone: c.parentPhone,
              gradeLevel: c.gradeLevel,
              deviceType: c.deviceType,
              academicGoals: c.academicGoals,
              xpPoints: 1800,
            }));

            ws.send(
              JSON.stringify({
                type: "ROOM_STATE_SYNC",
                roomId,
                participants: roomParticipants,
                remoteSessions: Array.from(realtimeStore.remoteSessions.values()),
                pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
                isRoomBomberActive: realtimeStore.isRoomBomberActive,
                chatMessages: realtimeStore.chatMessages.get(roomId) || [],
              })
            );

            // Broadcast to other peers in room
            broadcastToRoom(
              roomId,
              {
                type: "PARTICIPANT_JOINED",
                participant: {
                  id: currentClient.userId,
                  name: currentClient.name,
                  role: currentClient.role,
                  parentName: currentClient.parentName,
                  parentEmail: currentClient.parentEmail,
                  gradeLevel: currentClient.gradeLevel,
                  deviceType: currentClient.deviceType,
                  joinedAt: currentClient.joinedAt,
                },
              },
              ws
            );
            break;
          }

          // Live Chat Message
          case "CHAT_MESSAGE": {
            if (!currentClient) return;
            const roomId = currentClient.roomId;
            const message = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              senderId: currentClient.userId,
              senderName: currentClient.name,
              role: currentClient.role,
              text: payload.text || "",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            if (!realtimeStore.chatMessages.has(roomId)) {
              realtimeStore.chatMessages.set(roomId, []);
            }
            realtimeStore.chatMessages.get(roomId)!.push(message);

            broadcastToRoom(roomId, {
              type: "CHAT_BROADCAST",
              message,
            });
            break;
          }

          // Collaborative Whiteboard Stroke
          case "WHITEBOARD_DRAW": {
            if (!currentClient) return;
            const roomId = currentClient.roomId;
            if (!realtimeStore.whiteboardStrokes.has(roomId)) {
              realtimeStore.whiteboardStrokes.set(roomId, []);
            }
            realtimeStore.whiteboardStrokes.get(roomId)!.push(payload.stroke);

            broadcastToRoom(
              roomId,
              {
                type: "WHITEBOARD_BROADCAST",
                stroke: payload.stroke,
              },
              ws
            );
            break;
          }

          case "WHITEBOARD_CLEAR": {
            if (!currentClient) return;
            const roomId = currentClient.roomId;
            realtimeStore.whiteboardStrokes.set(roomId, []);
            broadcastToRoom(roomId, { type: "WHITEBOARD_CLEARED" });
            break;
          }

          // Hand Raise
          case "HAND_RAISE": {
            if (!currentClient) return;
            broadcastToRoom(currentClient.roomId, {
              type: "HAND_RAISE_SYNC",
              userId: currentClient.userId,
              raised: !!payload.raised,
            });
            break;
          }

          // Live Speech Recognition & Caption Broadcast
          case "SPEECH_CAPTION": {
            if (!currentClient) return;
            const roomId = currentClient.roomId;
            const caption = payload.caption;
            if (caption) {
              if (!realtimeStore.speechCaptions.has(roomId)) {
                realtimeStore.speechCaptions.set(roomId, []);
              }
              if (caption.isFinal) {
                const list = realtimeStore.speechCaptions.get(roomId)!;
                list.push(caption);
                if (list.length > 150) list.shift();
              }
              broadcastToRoom(roomId, {
                type: "SPEECH_CAPTION_BROADCAST",
                caption,
              });
            }
            break;
          }

          // Automatic Device Audit Telemetry Log
          case "DEVICE_AUDIT_LOG": {
            if (!currentClient) return;
            const record = payload.record;
            if (record) {
              realtimeStore.deviceAudits.set(record.userId || currentClient.userId, record);
              broadcastToRoom(currentClient.roomId, {
                type: "DEVICE_AUDIT_LOG_BROADCAST",
                record,
              });
            }
            break;
          }

          // Remote Access: Request / Offer / Approve / Deny
          case "REMOTE_ACCESS_REQUEST": {
            const { targetUserId, deviceType, accessLevel } = payload;
            broadcast(
              {
                type: "REMOTE_ACCESS_INCOMING",
                requesterId: currentClient?.userId,
                requesterName: currentClient?.name,
                targetUserId,
                deviceType,
                accessLevel,
              },
              (c) => c.userId === targetUserId
            );
            break;
          }

          case "REMOTE_ACCESS_RESPONSE": {
            const { sessionId, accepted, studentId, studentName, deviceType, accessLevel } = payload;
            if (accepted) {
              const session: RemoteSessionData = {
                id: sessionId || `ras-${Date.now()}`,
                studentId,
                studentName,
                requesterId: currentClient?.userId || "host-1",
                requesterName: currentClient?.name || "Dr. Evelyn Vance",
                deviceType: deviceType || "tablet",
                deviceModel: `${deviceType === "phone" ? "Samsung Galaxy S24" : deviceType === "tablet" ? "iPad Pro M4" : "ThinkPad X1"}`,
                osName: deviceType === "tablet" ? "iPadOS 18.2" : "Android 15 / Windows 11",
                accessLevel: accessLevel || "full_control",
                status: "active",
                cursorPosition: { x: 0.5, y: 0.5 },
                activeAnnotationTool: "pen",
                annotations: [],
                screenResolution: { width: 1920, height: 1080 },
                fps: 60,
                latencyMs: 11.2,
                isMutedControl: false,
                interactiveContent: {
                  activeApp: "worksheet",
                  codeEditorText: "# Live Synchronized Code Environment\nprint('Remote Control Active')",
                  terminalLogs: ["[system] Remote session synchronized."],
                  worksheetAnswers: {},
                  notesText: "Active collaborative session.",
                },
                actionLog: [{ timestamp: new Date().toLocaleTimeString(), actor: currentClient?.name || "User", description: "Accepted remote session" }],
                requestedAt: new Date().toLocaleTimeString(),
              };

              realtimeStore.remoteSessions.set(session.id, session);
              broadcast({
                type: "REMOTE_SESSION_UPDATED",
                session,
              });
            } else {
              broadcast(
                {
                  type: "REMOTE_ACCESS_DENIED",
                  studentId,
                },
                (c) => c.role === "instructor" || c.role === "admin"
              );
            }
            break;
          }

          // Remote Access: Live Input Relaying (Mouse, Touch, Keystrokes)
          case "REMOTE_INPUT_EVENT": {
            const { sessionId, event } = payload;
            const session = realtimeStore.remoteSessions.get(sessionId);
            if (session) {
              if (event.type === "move" && event.x !== undefined && event.y !== undefined) {
                session.cursorPosition = { x: event.x, y: event.y };
              }
              // Relay event to room participants
              broadcast({
                type: "REMOTE_EVENT_RELAY",
                sessionId,
                event,
              });
            }
            break;
          }

          // Remote Access: Real-Time Annotation Overlay
          case "REMOTE_ANNOTATE": {
            const { sessionId, annotation } = payload;
            const session = realtimeStore.remoteSessions.get(sessionId);
            if (session && annotation) {
              session.annotations.push(annotation);
              broadcast({
                type: "REMOTE_ANNOTATION_ADDED",
                sessionId,
                annotation,
              });
            }
            break;
          }

          case "REMOTE_CLEAR_ANNOTATIONS": {
            const { sessionId } = payload;
            const session = realtimeStore.remoteSessions.get(sessionId);
            if (session) {
              session.annotations = [];
              broadcast({
                type: "REMOTE_ANNOTATIONS_CLEARED",
                sessionId,
              });
            }
            break;
          }

          // Remote Access: Worksheet and Terminal Edits
          case "REMOTE_WORKSHEET_EDIT": {
            const { sessionId, fieldId, value } = payload;
            const session = realtimeStore.remoteSessions.get(sessionId);
            if (session) {
              session.interactiveContent.worksheetAnswers[fieldId] = value;
              broadcast({
                type: "REMOTE_WORKSHEET_SYNC",
                sessionId,
                fieldId,
                value,
              });
            }
            break;
          }

          case "TERMINAL_COMMAND_EXEC": {
            const { sessionId, command } = payload;
            const session = realtimeStore.remoteSessions.get(sessionId);
            if (session) {
              session.interactiveContent.terminalLogs.push(`$ ${command}`);
              let output = `Executed: ${command}`;
              if (command.includes("ls") || command.includes("dir")) output = "quantum_lab_04.py  bloch_sim.ipynb  hamiltonian.cpp  README.md";
              if (command.includes("python")) output = "Running quantum simulation: Fidelity 99.84% (Q.E.D.)";
              session.interactiveContent.terminalLogs.push(output);

              broadcast({
                type: "TERMINAL_LOG_SYNC",
                sessionId,
                logs: session.interactiveContent.terminalLogs,
              });
            }
            break;
          }

          // -------------------------------------------------------------
          // ROOM BOMBER 1:1 SALES ENGINE (REAL WEBSOCKET IMPLEMENTATION)
          // -------------------------------------------------------------
          case "ROOM_BOMBER_TRIGGER": {
            // Partition all available students into 1:1 rooms with sales reps
            executeRoomBomberPartition(payload);
            break;
          }

          case "ROOM_BOMBER_RESET": {
            // Recall all participants back to the main hall
            resetRoomBomberToMainHall();
            break;
          }

          case "PITCH_STAGE_UPDATE": {
            const { roomId, currentStage, stageName, notes } = payload;
            const pitchRoom = realtimeStore.pitchRooms.get(roomId);
            if (pitchRoom) {
              pitchRoom.currentStage = currentStage;
              pitchRoom.stageName = stageName;
              if (notes) pitchRoom.notes = notes;

              // Increase parent engagement score dynamically as script progresses
              pitchRoom.parentEngagementScore = Math.min(98, 70 + currentStage * 6);

              broadcast({
                type: "PITCH_STAGE_SYNC",
                pitchRoom,
              });
            }
            break;
          }

          case "PITCH_OFFER_APPLY": {
            const { roomId, discountPercent, contractSigned } = payload;
            const pitchRoom = realtimeStore.pitchRooms.get(roomId);
            if (pitchRoom) {
              pitchRoom.scholarshipGrantedPercent = discountPercent || 25;
              pitchRoom.discountedTuition = Math.round(pitchRoom.tuitionTotal * (1 - pitchRoom.scholarshipGrantedPercent / 100));
              if (contractSigned) pitchRoom.contractStatus = "signed";

              broadcast({
                type: "PITCH_OFFER_SYNC",
                pitchRoom,
              });
            }
            break;
          }

          // Sales Lead Assignment & Dispatch Broadcast
          case "SALES_LEAD_ASSIGN": {
            const { lead, rep } = payload;
            broadcast({
              type: "SALES_LEAD_ASSIGN_BROADCAST",
              lead,
              rep,
              timestamp: new Date().toLocaleTimeString(),
            });
            break;
          }

          // Real-Time & Post-Call AI Pitch Audit Persistence
          case "PITCH_CALL_AUDIT_SAVE": {
            const { roomId, auditReport } = payload;
            const pRoom = realtimeStore.pitchRooms.get(roomId);
            if (pRoom) {
              pRoom.postCallAudit = auditReport;
              broadcast({
                type: "PITCH_CALL_AUDIT_SAVED",
                roomId,
                auditReport,
              });
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("[Realtime WS] Message processing error:", err);
      }
    });

    ws.on("close", () => {
      if (currentClient) {
        const roomId = currentClient.roomId;
        realtimeStore.clients.delete(ws);
        if (realtimeStore.rooms.has(roomId)) {
          realtimeStore.rooms.get(roomId)!.participants.delete(currentClient.userId);
        }
        broadcastToRoom(roomId, {
          type: "PARTICIPANT_LEFT",
          userId: currentClient.userId,
        });
      }
    });
  });

  // -------------------------------------------------------------
  // Room Bomber Partitioning Algorithm
  // -------------------------------------------------------------
  function executeRoomBomberPartition(config: any = {}) {
    realtimeStore.isRoomBomberActive = true;
    realtimeStore.pitchRooms.clear();

    // 1. Gather all connected student clients
    const studentClients = Array.from(realtimeStore.clients.values()).filter((c) => c.role === "student");
    const salesRepClients = Array.from(realtimeStore.clients.values()).filter((c) => c.role === "sales_rep" || c.role === "instructor");

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
          parentName: c.parentName || `Guardian of ${c.name}`,
          parentEmail: c.parentEmail || `${c.name.toLowerCase().replace(/\s+/g, ".")}@parent.com`,
          parentPhone: c.parentPhone || "+1 (555) 019-2834",
          gradeLevel: c.gradeLevel || 10,
          academicGoals: c.academicGoals || "Global Cambridge / IB Curriculum Excellence",
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

    // Broadcast master grid update to all clients (especially Admin and Auditors)
    broadcast({
      type: "ROOM_BOMBER_GRID_SYNC",
      active: true,
      pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
    });
  }

  function resetRoomBomberToMainHall() {
    realtimeStore.isRoomBomberActive = false;
    for (const client of realtimeStore.clients.values()) {
      client.roomId = "default-room";
    }

    broadcast({
      type: "ROOM_BOMBER_RESET_NOTIFY",
      targetRoomId: "default-room",
      message: "Room Bomber pitch completed. All participants recalled to Main Hall.",
    });
  }

  // -------------------------------------------------------------
  // REST API Endpoints for State & Documentation
  // -------------------------------------------------------------

  // 1. Room Bomber REST Endpoints
  app.get("/api/room-bomber/status", (_req, res) => {
    res.json({
      active: realtimeStore.isRoomBomberActive,
      totalRooms: realtimeStore.pitchRooms.size,
      pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
    });
  });

  app.post("/api/room-bomber/trigger", (req, res) => {
    executeRoomBomberPartition(req.body);
    res.json({
      success: true,
      message: "Room Bomber successfully partitioned students into 1:1 pitch rooms.",
      pitchRooms: Array.from(realtimeStore.pitchRooms.values()),
    });
  });

  app.post("/api/room-bomber/reset", (_req, res) => {
    resetRoomBomberToMainHall();
    res.json({ success: true, message: "All participants recalled to main hall." });
  });

  app.post("/api/room-bomber/stage", (req, res) => {
    const { roomId, currentStage, stageName, notes } = req.body;
    const room = realtimeStore.pitchRooms.get(roomId);
    if (!room) return res.status(404).json({ error: "Pitch room not found" });

    room.currentStage = currentStage;
    room.stageName = stageName;
    if (notes) room.notes = notes;
    room.parentEngagementScore = Math.min(98, 70 + currentStage * 6);

    broadcast({ type: "PITCH_STAGE_SYNC", pitchRoom: room });
    res.json({ success: true, pitchRoom: room });
  });

  app.post("/api/room-bomber/offer", (req, res) => {
    const { roomId, discountPercent, contractSigned } = req.body;
    const room = realtimeStore.pitchRooms.get(roomId);
    if (!room) return res.status(404).json({ error: "Pitch room not found" });

    room.scholarshipGrantedPercent = discountPercent || 25;
    room.discountedTuition = Math.round(room.tuitionTotal * (1 - room.scholarshipGrantedPercent / 100));
    if (contractSigned) room.contractStatus = "signed";

    broadcast({ type: "PITCH_OFFER_SYNC", pitchRoom: room });
    res.json({ success: true, pitchRoom: room });
  });

  // 2. Standalone Documentation Reader REST Endpoints
  app.get("/api/docs/list", (_req, res) => {
    res.json([
      { id: "PRD", title: "Product Requirements Document", file: "PRD.md" },
      { id: "BRD", title: "Business Requirements Document", file: "BRD.md" },
      { id: "LMD", title: "Low-Level Model Document", file: "LMD.md" },
      { id: "MMD", title: "Mid-Level Architecture Document", file: "MMD.md" },
      { id: "HMD", title: "High-Level Edge Infrastructure Document", file: "HMD.md" },
      { id: "FEATURES", title: "Features & Functionality Matrix", file: "FEATURES_AND_FUNCTIONALITY.md" },
      { id: "FLOWS", title: "Architecture & Wire Sequences", file: "ARCHITECTURE_AND_FLOWS.md" },
    ]);
  });

  app.get("/api/docs/:id", (req, res) => {
    const docMap: Record<string, string> = {
      PRD: "PRD.md",
      BRD: "BRD.md",
      LMD: "LMD.md",
      MMD: "MMD.md",
      HMD: "HMD.md",
      FEATURES: "FEATURES_AND_FUNCTIONALITY.md",
      FLOWS: "ARCHITECTURE_AND_FLOWS.md",
    };

    const fileName = docMap[req.params.id.toUpperCase()] || `${req.params.id}.md`;
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
  app.post("/api/auth/login", (req, res) => {
    const {
      role,
      username,
      email,
      password,
      gradeLevel,
      parentName,
      parentPhone,
      auditorLicense,
      adminKey,
      department,
      deviceType,
      deviceModel,
      osName,
      deviceAudit,
    } = req.body;

    const detectedDevType = deviceType || (role === "student" ? "tablet" : "laptop");
    const detectedDevModel = deviceModel || (detectedDevType === "tablet" ? "Apple iPad Pro 13\" (M4)" : "ThinkPad X1 Carbon Gen 12");
    const detectedOs = osName || (detectedDevType === "tablet" ? "iPadOS 18.2" : "Windows 11 / macOS");

    const roleCredentials: Record<string, any> = {
      instructor: {
        id: "host-1",
        name: username || "Dr. Evelyn Vance",
        email: email || "e.vance@faculty.21k.school",
        role: "instructor",
        avatarColor: "#003872",
        department: department || "STEM & Quantum Physics",
        section: "Grade 10 - Honors",
        deviceType: detectedDevType,
        deviceModel: detectedDevModel,
        osName: detectedOs,
        deviceAudit: deviceAudit || null,
        joinedAt: "08:45 AM",
      },
      student: {
        id: "stu-1",
        name: username || "Sophia Chen",
        email: email || "chen.sophia@student.21k.school",
        role: "student",
        avatarColor: "#0082FF",
        gradeLevel: gradeLevel || 10,
        parentName: parentName || "Mrs. Linda Chen",
        parentEmail: "linda.chen@family.org",
        parentPhone: parentPhone || "+1 (555) 234-8901",
        deviceType: detectedDevType,
        deviceModel: detectedDevModel,
        osName: detectedOs,
        deviceAudit: deviceAudit || null,
        academicGoals: "Quantum Computing & AP Physics Preparation",
        joinedAt: "08:55 AM",
      },
      auditor: {
        id: "audit-1",
        name: username || "Inspector Marcus Aurelius",
        email: email || "m.aurelius@compliance.21k.school",
        role: "auditor",
        avatarColor: "#7C3AED",
        auditorLicense: auditorLicense || "ISO-21001-NEASC-9824",
        department: "Global Academic Compliance & Quality Assurance",
        deviceType: detectedDevType,
        deviceModel: detectedDevModel,
        osName: detectedOs,
        deviceAudit: deviceAudit || null,
        joinedAt: "08:50 AM",
      },
      admin: {
        id: "admin-1",
        name: username || "Director Vikram Malhotra",
        email: email || "v.malhotra@executive.21k.school",
        role: "admin",
        avatarColor: "#DC2626",
        salesCluster: "Global EdTech Admissions & Revenue Command",
        adminSecurityKey: adminKey || "21K-EXEC-CLUSTER-ALPHA",
        deviceType: detectedDevType,
        deviceModel: detectedDevModel,
        osName: detectedOs,
        deviceAudit: deviceAudit || null,
        joinedAt: "08:40 AM",
      },
      sales_rep: {
        id: "sales-1",
        name: username || "Rajesh Khanna",
        email: email || "r.khanna@admissions.21k.school",
        role: "sales_rep",
        avatarColor: "#059669",
        salesTerritory: "Middle East & South Asia (Tier 1)",
        repTier: "Senior Admissions Counselor",
        deviceType: detectedDevType,
        deviceModel: detectedDevModel,
        osName: detectedOs,
        deviceAudit: deviceAudit || null,
        joinedAt: "08:30 AM",
      },
    };

    const authenticatedUser = roleCredentials[role] || {
      id: `usr-${Date.now()}`,
      name: username || "Verified User",
      email: email || "user@21k.school",
      role: role || "student",
      avatarColor: "#0082FF",
      deviceType: detectedDevType,
      deviceModel: detectedDevModel,
      osName: detectedOs,
      deviceAudit: deviceAudit || null,
      joinedAt: new Date().toLocaleTimeString(),
    };

    if (deviceAudit) {
      realtimeStore.deviceAudits.set(authenticatedUser.id, deviceAudit);
    }

    res.json({
      success: true,
      token: `jwt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      user: authenticatedUser,
    });
  });

  // Device Audit & Compliance Endpoints
  app.get("/api/audit/devices", (_req, res) => {
    const devices = Array.from(realtimeStore.deviceAudits.values());
    res.json({ success: true, devices });
  });

  app.post("/api/audit/devices", (req, res) => {
    const record = req.body;
    if (record && record.userId) {
      realtimeStore.deviceAudits.set(record.userId, record);
    }
    res.json({ success: true });
  });

  // 4. Live System Rooms and Participants State
  app.get("/api/state/rooms", (_req, res) => {
    const list = Array.from(realtimeStore.rooms.values()).map((r) => ({
      ...r,
      participantsCount: r.participants.size,
    }));
    res.json(list);
  });

  app.get("/api/state/participants", (_req, res) => {
    const participants = Array.from(realtimeStore.clients.values()).map((c) => ({
      id: c.userId,
      name: c.name,
      role: c.role,
      roomId: c.roomId,
      gradeLevel: c.gradeLevel,
      parentName: c.parentName,
      deviceType: c.deviceType,
      joinedAt: c.joinedAt,
    }));
    res.json(participants);
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

  app.get("/api/links/all", (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const dynamicLinks = shortlinksDatabase.map((item) => ({
      ...item,
      fullUrl: `${origin}/room/${item.slug}`,
      shortUrl: `${origin}/s/${item.shortCode}`,
    }));
    res.json(dynamicLinks);
  });

  app.post("/api/links/shorten", (req, res) => {
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

  app.get("/api/facilitators/roster", (_req, res) => {
    res.json(candidateFaculty);
  });

  app.post("/api/facilitators/substitute-failover", (req, res) => {
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
  app.post("/api/crm/webhook", (req, res) => {
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

  app.get("/api/crm/sales-reps", (_req, res) => {
    res.json({ success: true, reps: salesCounselorRoster });
  });

  app.post("/api/crm/lead-assign", (req, res) => {
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

  // -------------------------------------------------------------
  // 8. Campus Social Media Feed & Safety Moderation Store
  // -------------------------------------------------------------
  const campusPostsDatabase = [
    {
      id: "post-1",
      authorId: "tch-vance",
      authorName: "Dr. Evelyn Vance",
      authorRole: "instructor",
      authorAvatar: "#003872",
      content:
        "Congratulations to Grade 10-A scholars for finishing Lab 04 on Two-Qubit Superconducting Entanglement! The live 3D Bloch sphere projections showed an astounding 99.8% fidelity. Problem sets are due Friday midnight.",
      category: "Academic Question",
      likes: 24,
      likedByMe: false,
      comments: [
        { id: "c-1", authorName: "Sophia Chen", text: "The z-axis dephasing visualization cleared up all my doubts, thank you Dr. Vance!", timestamp: "1 hour ago" },
        { id: "c-2", authorName: "Marcus Vance", text: "Calculated Hamiltonian eigenvalues match perfectly with the remote Python terminal.", timestamp: "45 mins ago" },
      ],
      safetyStatus: "approved",
      timestamp: "2 hours ago",
    },
    {
      id: "post-2",
      authorId: "stu-1",
      authorName: "Sophia Chen",
      authorRole: "student",
      authorAvatar: "#0082FF",
      content:
        "Excited to showcase my project for the 21K School Global Robotics Hackathon! Built an inverse kinematics closed-loop controller in Python with remote tablet stylus annotations.",
      category: "STEM Project",
      likes: 38,
      likedByMe: true,
      comments: [
        { id: "c-3", authorName: "Prof. Arjun Sharma", text: "Brilliant implementation Sophia, make sure to document the Jacobian boundary limits!", timestamp: "30 mins ago" },
      ],
      safetyStatus: "approved",
      timestamp: "3 hours ago",
    },
    {
      id: "post-3",
      authorId: "admin-1",
      authorName: "Director Vikram Malhotra",
      authorRole: "admin",
      authorAvatar: "#DC2626",
      content:
        "Admissions announcement: 1:1 Room Bomber counseling breakouts are now active for upcoming Cambridge IGCSE and IB Diploma cohorts. Check the upcoming schedule below and join your session.",
      category: "Campus Announcement",
      likes: 19,
      likedByMe: false,
      comments: [],
      safetyStatus: "approved",
      timestamp: "5 hours ago",
    },
  ];

  app.get("/api/social/posts", (_req, res) => {
    res.json(campusPostsDatabase);
  });

  app.post("/api/social/posts", (req, res) => {
    const { authorId, authorName, authorRole, authorAvatar, content, mediaUrl, category } = req.body;

    // Safety checks
    const lower = (content || "").toLowerCase();
    const adultRegex = /\b(nsfw|18\+|porn|xxx|nude|sex|erotic|escort|camgirl|onlyfans|stripper|fetish|lewd|cock|pussy|vagina|penis|boobs)\b/i;
    if (adultRegex.test(lower)) {
      return res.status(400).json({
        error: "Content rejected by Campus Safety Guard: Adult, NSFW or 18+ content is strictly prohibited.",
        safetyFlag: "adult_nsfw",
      });
    }

    const newPost = {
      id: `post-${Date.now()}`,
      authorId: authorId || "usr-current",
      authorName: authorName || "Campus Scholar",
      authorRole: authorRole || "student",
      authorAvatar: authorAvatar || "#0082FF",
      content: content || "",
      mediaUrl: mediaUrl || undefined,
      category: category || "STEM Project",
      likes: 0,
      likedByMe: false,
      comments: [],
      safetyStatus: "approved",
      timestamp: "Just now",
    };

    campusPostsDatabase.unshift(newPost);
    broadcast({ type: "NEW_CAMPUS_POST", post: newPost });
    res.json({ success: true, post: newPost });
  });

  app.post("/api/social/posts/:id/react", (req, res) => {
    const post = campusPostsDatabase.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.likedByMe = !post.likedByMe;
    post.likes += post.likedByMe ? 1 : -1;
    broadcast({ type: "POST_REACTED", postId: post.id, likes: post.likes });
    res.json({ success: true, likes: post.likes, likedByMe: post.likedByMe });
  });

  app.post("/api/social/posts/:id/comment", (req, res) => {
    const post = campusPostsDatabase.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const { authorName, text } = req.body;
    const newComment = {
      id: `c-${Date.now()}`,
      authorName: authorName || "Peer Scholar",
      text: text || "",
      timestamp: "Just now",
    };
    post.comments.push(newComment);
    broadcast({ type: "POST_COMMENT_ADDED", postId: post.id, comment: newComment });
    res.json({ success: true, comment: newComment });
  });
}
