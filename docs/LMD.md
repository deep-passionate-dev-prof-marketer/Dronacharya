# Low-Level Model Document (LMD)
## Dronacharya: Database Schema, Analytics API, Formulas and State Machines

**Document version:** 4.0 (class analytics release)
**Runtime:** Node.js 22+, Express 4, ws 8, Drizzle ORM 0.45, Postgres (PGlite / Supabase), React 19

---

### 1. Database (Drizzle, `src/server/db/schema.ts`)

| Table | Purpose | Key columns |
| :--- | :--- | :--- |
| `users` | Everyone who signs in | id, email, name, role, studentCode, country (ISO-3), languageTag, gradeLevel, **timezone** (IANA), disabled |
| `identities` | External sign-ins | (provider, subject) → userId |
| `sessions` | Signed-in sessions | id, userId, provider, expiresAt, revokedAt |
| `otp_codes` | Email one-time codes | email, codeHash, expiresAt, attempts |
| `guardians` | Parent ↔ learner | (parentId, studentId), relation |
| `classes` | One scheduled meeting per room | id, roomSlug (unique), kind, subject, course, topic, gradeLevel, program, language, teacherId, scheduledStart, durationMin, classSize, **cohort** |
| `class_enrollments` | Learners in a class | (classId, studentKey) |
| `attendance_events` | LiveKit join/leave | roomSlug, userId, role, event, at, **eventId** (unique: webhook dedupe) |
| `kv_store` | Write-through state | (namespace, key) → jsonb (sessions, admitted, device rules, analytics_settings…) |
| `audit_events` | Append-only logs | stream (device_access, security, room_control, analytics_access), at, roomSlug, userId, type, data |
| `engagement_samples` | On-device engagement summaries | roomSlug, participantId, at, data.summary (presence, eyeContact, perclos, dominant…) |
| `consents` | Consent decisions with history | userId, kind (analytics/recording), granted, decidedBy, at |
| `transcript_lines` | What was said | roomSlug, at, speakerId, text, translated, lang |
| `recordings` | One per class session | id, roomSlug, mode, status, startedBy, excluded, startedAt, endedAt |
| `lecture_notes` | AI notes | recordingId, generator, data |
| `polls`, `poll_votes` | Server-run polls | question, options; (pollId, userId) → optionIndex |
| `remarks` | Teacher remarks for learners | studentId, teacherId, kind, stars, note |
| **`session_facts`** | One row per finished session | see §1.1 |
| **`session_learners`** | One row per learner per session | recordingId, learnerId, name, country, timezone, gradeLevel, deviceType, enrolled, status (present/late/left_early/absent), minutesPresent, attention, demo |
| **`class_reviews`** | Auditor reviews | recordingId, roomSlug, teacherId, auditorId, rubric (teaching_v1/counselling_v1), scores {criterion: 1–4}, total, note, status (draft/submitted), unique (recordingId, auditorId) |

#### 1.1 `session_facts` columns
- **Identity:** recordingId (PK), roomSlug, classId, kind (class kind or `adhoc`), subject, course, topic,
  gradeLevel, program, cohort, language.
- **People:** teacherId (class teacher), hostId (who ran it), teacherName, teacherCountry, teacherTimezone.
- **Time:** startedAt, endedAt, durationMin, contactMin (host and a learner together), aborted (< 3 min),
  scheduledStart, scheduledDurationMin, startDelayMin (only within ±120 min).
- **Seats and attendance:** plannedSize, attendanceTracked (any join/leave received), enrolled, attended,
  enrolledAttended, enrolledMinutes, peakLearners, lateCount, earlyLeaveCount, avgMinutesPresent.
- **Engagement and interaction:** attentionAvg, engagedLearners, states (share per dominant state),
  transcriptLines, teacherTalkShare, learnerQuestions, polls, pollVotes.
- **Moderation and integrity:** mutes, removals, captureAttempts, deviceBlocks.
- **Outputs:** notesGenerated, reviewScore (mean of submitted reviews, 1–4).
- **Scoring:** components (jsonb, 0–1 each), demo, factsVersion, computedAt.
- **Indexes:** startedAt; (teacherId, startedAt); roomSlug; classId.

Migration `0003_analytics.sql` is additive (new tables and nullable columns only).

---

### 2. Formulas

```
attended learner      present ≥ min(5 min, 25% of the session)
occupancy             Σ attended ÷ Σ plannedSize                    (pooled over sessions with seats)
attendance rate       Σ min(enrolledAttended, enrolled) ÷ Σ enrolled
presence rate         Σ enrolledMinutes ÷ Σ (enrolled × durationMin)
on-time               startDelayMin ≤ target (default 5)
counselling length    contactMin if > 0, else durationMin           (counselling + admission)
class size bucket     peakLearners: 0 → "No learners", 1..24 → "1:N", > 24 → "1:25+"; no join data → "Unknown"

components (0–1, null when unknown)
  attendance   attended ÷ enrolled (or ÷ plannedSize); null if attendanceTracked = false
  punctuality  1 if delay ≤ 5; linear to 0 at 20 min; null if unscheduled
  engagement   attentionAvg; scored as (n·raw + 2·μ) ÷ (n + 2), μ = school attention for the period
  interaction  min(1, questions per 10 learners ÷ 3), blended 0.6/0.4 with poll participation when polls ran
  adherence    1 between 85% and 110% of the planned length, falling off outside
  review       (reviewScore − 1) ÷ 3

class quality = 100 × Σ wᵢ·cᵢ ÷ Σ wᵢ over available components; null if < 3 signals, nobody came, or aborted
weights       teaching:     attendance 25, punctuality 15, engagement 20, interaction 15, adherence 10, review 15
              conversation: attendance 30, punctuality 20, engagement 10, interaction 20, adherence 5,  review 15
              (admins may change them; engagement ≤ 25)

teacher quality = (Σ hᵢ·qᵢ + k·μ) ÷ (Σ hᵢ + k),  hᵢ = hours, k = 5 classes' weight, μ = school mean
                  ranked when n ≥ 5; interval = ± 1.28 × SE (80%)
needs attention   classes below target (worst 6); teachers whose last third of classes fell ≥ 8 points or is
                  below target − 10; rooms (≥ 3 sessions, > 1 seat) averaging occupancy below target − 20 pts
conversion        learners present in counselling/admission/demo → present in an enrolled class within 30 days
```

---

### 3. Analytics API (auditors and admins unless noted)

Common query: `from`, `to` (ISO), `tz` (IANA), `includeDemo=0`, filters `kind, course, subject, teacher, grade,
cohort, size, room, language, program, country, device, timezone` (comma lists).

| Method & path | Returns |
| :--- | :--- |
| `GET /api/analytics/meta` | filter options, dimensions, component labels, weights, targets, hasDemo, freshness |
| `GET /api/analytics/summary` | kpis {current, previous}, trend, mix, distribution, attention, delivery, conversion, learnerStatus, targets |
| `GET /api/analytics/breakdown?dim=` | rows [{key, label, detail?, n, lowConfidence, metrics, teacherQuality?}], overall |
| `GET /api/analytics/teachers` | teacher rows with components, spark, reviews, observedQuality; periods |
| `GET /api/analytics/heatmap` | cells (weekday × hour: sessions, avgQuality, avgOccupancy), startDelay bins, adherence bins |
| `GET /api/analytics/sessions?q&sort&page&pageSize` | paged session summaries with score breakdown and reasons |
| `GET /api/analytics/sessions/:id` | session summary, facts, learners, reviews |
| `GET /api/analytics/export.csv?view=sessions\|breakdown&dim=` | CSV (logged) |
| `PUT /api/analytics/settings` (admin) | {weights: {teaching, conversation}, targets} sanitised |
| `GET /api/reviews?recordingId=` | submitted reviews + the caller's draft, rubrics |
| `POST /api/reviews` | {recordingId, rubric, scores, note, submit}; 400 incomplete submit, 409 after submit |
| `GET /api/reviews/queue` | lowest-scored and random unreviewed teaching sessions |
| `GET /api/attendance/sessions?days=` (teachers: own) | recent sessions with present/late/left early/absent |
| `GET /api/attendance/sessions/:id` (teachers: own) | learners with status, minutes, guardians |

---

### 4. State machines

```
Class session    waiting ──start (host, room lock)──▶ in_progress ──end (host) / room_finished / reconcile──▶ ended
                   ended ──(30 min grace)──▶ waiting
Recording        recording ──stop──▶ processing ──egress ended──▶ ready | failed   (transcript_only: ready)
Facts            none ──+20 s──▶ v1 ──+10 min / review submitted / consent withdrawn──▶ v1 (recomputed)
                 FACTS_VERSION bump ──backfill──▶ recomputed
Review           (none) ──save──▶ draft ──save──▶ draft ──submit (all criteria)──▶ submitted (final)
Consent          granted ⇄ withdrawn (history rows; latest wins; withdrawal clears past attention)
Learner in room  waiting ──admit──▶ admitted (kv, survives restarts) ──class end──▶ cleared
```

---

### 5. Live-class data channel rules
- **Server only:** `class_status`, `poll`, `poll_results`.
- **Hosts only:** `stage`, `wb_sync`.
- **Whiteboard:** `wb_stroke` only for one's own strokes; `wb_clear` own strokes, or everything by a host.
- **Room WebSocket:** stamps the sender on `ROOM_DATA` and `MESH_SIGNAL`, and rejects other origins.

---

### 6. Demo-only models
The wire format and models below belong to interactive demos on illustrative data.

---

#### A. Room WebSocket envelope (legacy demo messages)

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

##### Core Message Types & Payloads

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

#### B. Demo data entities

##### Remote Access Session State
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

##### Room Bomber Data Models
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

#### C. Demo state machines

##### Remote Access State Machine
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

##### Room Bomber Execution State Machine
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
