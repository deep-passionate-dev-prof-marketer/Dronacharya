# System Architecture & Sequence Flows
## Dronacharya: Components, Data Flows and Sequences

**Document version:** 4.0 (class analytics release)

---

### 1. Architecture

```
                         ┌──────────────────────────── Browser (React 19 SPA) ───────────────────────────┐
                         │ Shell: view registry → sidebar / phone tabs / command palette / role access    │
                         │ Live class (LiveKit client, captions, whiteboard, polls)   Class analytics      │
                         │ Recordings & notes   Parent portal   Attendance   Device access   Observer     │
                         │ On-device engagement (MediaPipe, consenting learners only)                     │
                         └───────┬───────────────────────┬──────────────────────────┬────────────────────┘
                         HTTPS /api/*            WebSocket / (room events)      WebRTC media
                                 │               WebSocket /stt (audio)              │
┌────────────────────────────────▼───────────────────────▼──────────────┐   ┌────────▼─────────────────┐
│ Node server (server.ts, Express + ws)                                 │   │ LiveKit (SFU)            │
│  auth/        sessions, Google SSO, OTP, invite links                 │◀──│  webhooks: join/leave,   │
│  livekitHub   tokens after the device check                           │   │  room finished, egress   │
│  classSessionHub  start/end (host only, per-room lock), transcript,   │──▶│ Egress: video recordings │
│               recordings, notes, ask, webhook, reconcile              │   └──────────────────────────┘
│  roomControlHub  admit, mute, remove;  polls;  remarks                │
│  deviceAccessHub  device rules, requests, access log                  │   ┌──────────────────────────┐
│  securityHub  capture-attempt log      parentHub  portal, consent     │──▶│ AI: Gemini (notes, ask,  │
│  sttHub       server captions (Gemini Live → local Whisper)           │   │ live STT) → Ollama /     │
│  matchingHub  booking, matcher, cohorts                               │   │ whisper.cpp fallback     │
│  analytics/   facts · quality · aggregate · routes · attendance       │   └──────────────────────────┘
└───────────────┬───────────────────────────────────────────────────────┘
                │ Drizzle ORM (migrations on start)
       ┌────────▼─────────────────────────────┐      ┌─────────────────────────────────┐
       │ Postgres: PGlite (dev) / Supabase    │      │ Recording files: local disk or  │
       │ 21 tables incl. session_facts,       │      │ Supabase Storage (S3 API)       │
       │ session_learners, class_reviews      │      └─────────────────────────────────┘
       └──────────────────────────────────────┘
```

---

### 2. Joining a class

```
Learner                    Server                                   LiveKit
  │ open invite link ──────▶ verify signed invite → session cookie
  │ device snapshot ───────▶ device-access policy for the room
  │                          ├─ blocked → "request another device" (staff approve/deny, logged)
  │                          └─ allowed → token (waiting=true until admitted; auditors hidden, no publish)
  │ connect ─────────────────────────────────────────────────────────▶ join
  │                                                                     │ webhook participant_joined
  │                          ◀────────────────────────── attendance_events (deduplicated by event id)
  │ host admits ───────────▶ admitted list (kv, survives restarts) → updated token permissions
```

---

### 3. A class from start to analytics

```
Teacher "Start class"
  └─▶ POST /api/rooms/:slug/session/start  (host only, per-room lock: one session, one recording)
        ├─ recording starts (Egress video, or transcript-only)
        └─ class_status broadcast (only the server can send it)
During class: transcript lines (captions), polls, room-control and security audit events,
              engagement samples (consenting learners), join/leave webhooks
Teacher "End class" (or LiveKit room_finished)
  └─▶ endSession → stop recording
        ├─ notes: Gemini → Ollama → extractive (resumed after restarts)
        └─ scheduleFacts(recordingId): computeSessionFacts at +20 s and +10 min
             reads recording, class + enrolments, attendance events, engagement samples, transcript,
             polls/votes, audit events, submitted reviews, notes
             writes session_facts (one row) + session_learners (one row per learner) in one transaction
Background (every reconcile interval): backfillFacts(25) for finished classes without facts or with
             facts from an older FACTS_VERSION; stale sessions reconciled against LiveKit
```

---

### 4. Reading class analytics

```
Auditor/admin ─ GET /api/analytics/summary?from&to&tz&filters
  └─▶ requireAuth(auditor, admin) → 60 s cache (cleared when facts are written)
        ├─ load facts for the period + the previous period (classes joined live for cohort/course/grade)
        ├─ load session_learners for those sessions
        ├─ score each session (quality.ts, weights from kv, one attention anchor for the period)
        ├─ apply session filters, then learner filters (country, device, timezone)
        └─ aggregate.ts: KPIs (pooled ratios), trend, mix, distribution, needs attention,
           delivery funnel (classes table), conversion (learners seen in counselling → enrolled ≤ 30 days)
Breakdown: same pipeline, grouped by one dimension (learner dimensions fold groups under 3).
Export: CSV with formula-safe cells; logged to the analytics_access audit stream.
```

---

### 5. Auditor review

```
Auditor (session drawer or observer panel)
  ├─ POST /api/reviews {recordingId, rubric, scores 1–4, note}            → draft (editable)
  └─ POST /api/reviews {…, submit: true}  (every criterion scored)        → submitted (final, 409 after)
        └─ computeSessionFacts(recordingId) → reviewScore → class quality includes "Auditor review"
GET /api/reviews/queue → lowest-scored unreviewed teaching sessions + a random sample
```

---

### 6. Consent withdrawal (engagement analytics)

```
Parent or learner withdraws → consents row (history kept)
  └─ forgetLearnerAttention(learner): session_learners.attention = null for all their sessions
       └─ recompute those sessions' facts in the background (withdrawn learners' samples are ignored)
```

---

### 7. Server captions with fallback

```
Browser AudioWorklet (PCM16, 16 kHz) ──▶ WS /stt (same-origin, signed-in, not parents)
  └─ chainTranscriber: Gemini Live ── fails / quota / closes early ──▶ local Whisper (energy VAD segments)
       └─ captions → transcript lines → translation for each viewer
```

---

### 8. Demo features and earlier designs
A and B describe interactive demos that run on illustrative data in this release (they carry a "Sample"
notice in the app). C is the original subtitle design; the live pipeline is §7 and `docs/translation/`.

#### A. Room Bomber 1:1 Sales Breakout Sequence Flow

This sequence depicts the automated room bombing process from initial trigger in the main hall to private 1:1 closing:

```
Admin / Sales Lead               Express Server & WS Hub           Sales Rep Client             Student & Parent Client
       |                                   |                              |                                |
       | 1. Trigger "Execute Room Bomb"    |                              |                                |
       |    POST /api/room-bomber/trigger  |                              |                                |
       |---------------------------------->|                              |                                |
       |                                   |                              |                                |
       |                                   | 2. Calculate N Rooms for     |                                |
       |                                   |    N Student-Parent Pairs    |                                |
       |                                   |    Instantiate bomber-room-N |                                |
       |                                   |                              |                                |
       |                                   | 3. WS: ROOM_BOMBED_DISPATCH  | 3. WS: ROOM_BOMBED_DISPATCH    |
       |                                   |    (target: bomber-room-1)   |    (target: bomber-room-1)     |
       |                                   |----------------------------->|------------------------------->|
       |                                   |                              |                                |
       |                                   |                              | 4. Auto-route to 1:1 Pitch Room |
       |                                   |                              |    Mount Pitch HUD             |
       |                                   |                              |------------------------------->|
       |                                   |                              |    (Private 1:1 Video & Audio) |
       |                                   |                              |                                |
       |                                   | 5. WS: PITCH_STAGE_UPDATE    |                                |
       |                                   |    (Diagnostic -> Demo)      |                                |
       |                                   |<-----------------------------|                                |
       |                                   |                              |                                |
       |                                   | 6. WS: PITCH_OFFER_APPLY     | 6. WS: PITCH_OFFER_APPLY       |
       |                                   |    (25% Spot Scholarship)    |    (25% Spot Scholarship)      |
       |                                   |<-----------------------------|------------------------------->|
       |                                   |                              |                                |
       |                                   | 7. Digital Contract Signed   | 7. Digital Contract Signed     |
       |                                   |<-----------------------------|<-------------------------------|
       |                                   |                              |                                |
       | 8. Status Matrix Update (Live)    |                              |                                |
       |<----------------------------------|                              |                                |
```

---

#### B. Remote System Access & Normalized Coordinate Flow

```
Controller (Teacher)                 WebSocket Server                    Target Device (Student Tablet/PC)
        |                                   |                                           |
        | 1. Mouse Click at (x: 450, y: 320)|                                           |
        |    Canvas Size: 900 x 640         |                                           |
        |    Normalized: (x: 0.50, y: 0.50) |                                           |
        |---------------------------------->|                                           |
        |                                   | 2. Permission Check: "full_control"?      |
        |                                   |    Yes -> Forward packet                  |
        |                                   |------------------------------------------>|
        |                                   |                                           | 3. De-normalize to local:
        |                                   |                                           |    Tablet Size: 2064 x 2752
        |                                   |                                           |    Local Target: (1032, 1376)
        |                                   |                                           |    Execute synthetic tap/click
        |                                   |                                           |
        |                                   | 4. State Update (Worksheet Text Changed)  |
        |                                   |<------------------------------------------|
        | 5. Synchronize Updated State      |                                           |
        |<----------------------------------|                                           |
```

---

#### C. Multilingual Live Subtitle Translation Pipeline

```
Speaker Audio (Microphone)
       |
       v
Browser SpeechRecognition (Universal English)
       |
       v
Sentence Chunking & Silence Boundary Detection
       |
       v
POST /api/ai/live-translate-stream (Target: ES, HI, FR, DE, ZH, AR, JA)
       |
       +---> Fast Dictionary Exact Match (<1ms) --------+
       |                                                |
       +---> Google Gemini 2.5 / 3.0 Flash Stream ------>+
                                                        |
                                                        v
                                            Dual-Subtitles Displayed
                                    [Original English] + [Selected Language]
```
