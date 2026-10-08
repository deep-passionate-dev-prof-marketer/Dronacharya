# Low-Level Model Document (LMD)
## Dronacharya: Data Models, Schemas, State Machines & WebSocket Wire Protocol

**Document Version:** 2.4.0  
**Target Runtime:** Node.js 22 LTS / Express / TypeScript 5.7+ / ws 8.x / React 19

---

### 1. WebSocket Protocol Wire Format

All WebSocket communications follow an envelope format with standard JSON serialization:

```typescript
export interface WsEnvelope<T = unknown> {
  type: string;
  senderId: string;
  senderRole: "instructor" | "student" | "ta" | "admin" | "auditor" | "sales_rep";
  roomId: string;
  timestamp: string;
  payload: T;
}
```

#### 1.1 Core Message Types & Payloads

```
Client -> Server:
--------------------------------------------------------------------------------------
AUTH_JOIN              | { user: Participant, token: string }
LEAVE_ROOM             | { userId: string, roomId: string }
CHAT_MESSAGE           | { messageId: string, text: string, recipientId?: string }
WHITEBOARD_DRAW        | { strokeId: string, tool: string, color: string, points: [x,y][] }
POLL_CREATE            | { poll: Poll }
POLL_VOTE              | { pollId: string, optionId: string, voterId: string }
HAND_RAISE             | { raised: boolean }
REMOTE_ACCESS_REQUEST  | { targetUserId: string, deviceType: DeviceType, accessLevel: RemoteAccessLevel }
REMOTE_ACCESS_RESPONSE | { sessionId: string, accepted: boolean, accessLevel: RemoteAccessLevel }
REMOTE_INPUT_EVENT     | { sessionId: string, event: RemoteInputEvent }
REMOTE_ANNOTATE        | { sessionId: string, annotation: { x: number, y: number, color: string, size: number } }
REMOTE_WORKSHEET_EDIT  | { sessionId: string, fieldId: string, value: string }
TERMINAL_COMMAND_EXEC  | { sessionId: string, command: string }
ROOM_BOMBER_TRIGGER    | { targetRatio: "1:1" | "1:2", salesRepIds: string[], roomPrefix: string }
ROOM_BOMBER_RESET      | { returnToRoomId: string }
PITCH_STAGE_UPDATE     | { roomId: string, stageNumber: number, stageName: string, notes: string }
PITCH_OFFER_APPLY      | { roomId: string, discountPercent: number, finalTuition: number, contractSigned: boolean }

Server -> Client:
--------------------------------------------------------------------------------------
ROOM_STATE_SYNC        | { room: RoomState, participants: Participant[], chat: ChatMessage[], polls: Poll[] }
PARTICIPANT_JOINED     | { participant: Participant }
PARTICIPANT_LEFT       | { participantId: string, reason: string }
CHAT_BROADCAST         | { message: ChatMessage }
WHITEBOARD_BROADCAST   | { stroke: WhiteboardStroke }
POLL_SYNC              | { poll: Poll }
REMOTE_SESSION_UPDATED | { session: RemoteAccessSession }
REMOTE_EVENT_RELAY     | { event: RemoteInputEvent }
ROOM_BOMBED_DISPATCH   | { targetRoomId: string, roomName: string, role: string, partner: Participant, isPitchHUDActive: boolean }
ROOM_BOMBER_GRID_SYNC  | { activePitchRooms: PitchRoomStatus[] }
```

---

### 2. Core Data Entities

#### 2.1 Remote Access Session State
```typescript
export interface RemoteAccessSession {
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
```

#### 2.2 Room Bomber Data Models
```typescript
export interface PitchRoomStatus {
  roomId: string;
  roomName: string;
  salesRep: Participant;
  student: Participant;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  currentStage: 1 | 2 | 3 | 4 | 5;
  stageName: "Diagnostic" | "Curriculum Showcase" | "Pedagogy & Rigor" | "Tuition & Scholarship" | "Enrollment Close";
  parentEngagementScore: number; // 0 - 100
  scholarshipGrantedPercent: number; // e.g. 25
  tuitionTotal: number;
  discountedTuition: number;
  contractStatus: "pending" | "signed" | "declined";
  startedAt: string;
  durationSeconds: number;
}

export interface RoomBomberConfiguration {
  active: boolean;
  totalRooms: number;
  salesRepPool: Participant[];
  studentProspectPool: Participant[];
  ratio: "1:1" | "1:2";
  scholarshipCapPercent: number; // default 25%
}
```

---

### 3. State Transition Machines

#### 3.1 Remote Access State Machine
```
   [IDLE]
     |
     +--- Request Access ---> [REQUESTED] -- Reject --> [DENIED] -> [IDLE]
     |                              |
     |                           Approve
     |                              v
     +--- Offer Access ----> [OFFERED] ---- Approve --> [ACTIVE]
                                    |                      |
                                 Reject                    +--- Pause ---> [PAUSED]
                                    |                      |                 |
                                    v                      +--- Resume <-----+
                                 [DENIED]                  |
                                    |                      +--- Revoke/End
                                    v                      v
                                  [IDLE]                [ENDED] -> [IDLE]
```

#### 3.2 Room Bomber Execution State Machine
```
   [MAIN_HALL_AGGREGATE]
           |
   (Admin / Sales Lead triggers "Execute Room Bomb")
           |
           v
   [PARTITIONING_CALCULATION] (Calculates N rooms for N students)
           |
           v
   [DISPATCH_ASSIGNMENT] (Dispatches targetRoomId via WebSocket)
           |
           +-------------------------+
           |                         |
           v                         v
   [SALES_REP: PITCH_HUD]   [STUDENT_PARENT: 1:1 ROOM]
           |                         |
           +---- Synchronized Pitch -+
           |
      Step 1: Diagnostic Inquiry
      Step 2: Interactive Demo (3D/Remote)
      Step 3: Accreditation Framing
      Step 4: Scholarship Calculation (e.g. 25%)
      Step 5: Digital Contract Sign
           |
           v
   [CONTRACT_SIGNED / COMPLETED]
           |
   (Optional: "Recall All to Main Hall")
           |
           v
   [MAIN_HALL_RECONVENED]
```
