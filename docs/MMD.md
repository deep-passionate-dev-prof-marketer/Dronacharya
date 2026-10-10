# Mid-Level Model Document (MMD)
## Dronacharya: Modules, Contracts and Data Flow Between Them

**Document version:** 4.0 (class analytics release)

---

### 1. Module map

```
src/
  App.tsx                     shell; role access & home page from the view registry; lazy pages
  routing/
    viewRegistry.ts           every page: label, icon, group, roles, phone tab, class-content flag
    appRoutes.ts              role URLs (/auditor/GBR/en-GB/<id>/<name>/analytics), ISO-2 ↔ ISO-3
  context/ClassroomContext    live-class state (transport, participants, captions, session status)
  components/
    ui/                       design-system primitives (Button, Card, Drawer, Tabs, DataTable, …)
    charts/                   SVG charts (LineChart, ColumnChart, BarList, StackedBar, Heatmap, Sparkline)
    analytics/                Class analytics page, filters, KPI row, tabs, drawers, review form
    attendance/               Attendance page
    classroom/                stage, control bar, dock, ObserverPanel (auditors)
    audit/                    Device access page (rules, access report, capture attempts)
  server/
    auth/                     sessions, SSO, OTP, invites, requireAuth
    classSessionHub.ts        class sessions, transcript, recordings, notes, webhook, reconcile
    livekitHub.ts             tokens (device check, hidden auditors), timezone capture
    matchingHub.ts            booking, matcher, cohorts, learner geography
    deviceAccessHub.ts        device rules, requests, access log and report
    engagementHub.ts          consent, engagement samples, live engagement rollups
    analytics/
      facts.ts                raw records → session_facts + session_learners
      quality.ts              components, weights, class and teacher quality, reasons
      aggregate.ts            pure aggregation: dimensions, metrics, trend, heatmap, needs attention
      routes.ts               /api/analytics/*, /api/reviews*
      attendanceRoutes.ts     /api/attendance/*
      demo.ts, geo.ts         demo isolation; timezone validation and capture
scripts/
  seed-analytics-demo.ts      demo history (development only)
  api-smoke.mjs               API regression suite
  ui-debt.mjs                 design-system ratchet
```

---

### 2. Analytics modules

#### 2.1 `facts.ts`: the facts pipeline
- **`computeSessionFacts(recordingId)`** → the fact row, or `null` if the recording hasn't ended.
  - **Inputs:** recording, class and enrolments, attendance events (start − 60 min … end), engagement samples
    (consenting learners; samples with presence < 0.5 skipped), transcript lines, polls and votes, room-control /
    security / device-access audit events, submitted reviews, notes.
  - **Per learner:** status from `computeAttendance`. Under `min(5 min, 25% of the class)` counts as absent.
    Also records device and timezone (latest join evaluation), minutes present and attention.
  - **Per session:** duration and contact minutes (host and learners together). Also: start delay (only within
    ±120 min of the slot), peak concurrent learners, enrolled/attended, late and left-early counts, attention
    (mean of learners), teacher talk share, learner questions, polls/votes, moderation, capture attempts, device
    blocks, `attendanceTracked`, `aborted` (< 3 min), quality components, `demo`.
  - **Write:** facts and learner rows in one transaction, then the "facts written" listeners clear the analytics
    cache.
- **`scheduleFacts(id)`** runs at +20 s and +10 min. **`backfillFacts(n)`** handles missing facts or an old
  `FACTS_VERSION`; recordings that can't produce facts are skipped. **`forgetLearnerAttention(id)`** runs on
  consent withdrawal.

#### 2.2 `quality.ts`: the scoring model
- `computeComponents(measures)` → `{attendance, punctuality, engagement, engagementN, interaction, adherence, review}`
  (each 0–1 or `null`).
- `qualityScore(components, weights, schoolAttention)` → `{score | null, signals, breakdown}`. Engagement is
  shrunk toward the school mean: `(n·raw + 2·μ)/(n + 2)`. A score needs at least 3 signals.
- `DEFAULT_PROFILES` (teaching, conversation), `profileFor(kind)`, `sanitizeWeights` (non-negative, engagement ≤ 25).
- `teacherQuality(scores, schoolMean, k=5, minClasses=5, hours)` → `{score, raw, n, ranked, spread, interval}`.
- `qualityReasons(measures, components)` → plain-language reasons, worst first.

#### 2.3 `aggregate.ts`: pure aggregation (unit-tested)
- `scoreFacts`: drops aborted sessions; sessions nobody joined get no quality score.
- `sessionMetrics`: pooled ratios. `learnerMetrics`: learner-level rates.
- `breakdown(facts, learners, dim, tz, targets, labels)`: 15 session dimensions and 4 learner dimensions.
  Learner groups under 3 are folded into "Other", and hidden entirely if the fold is still under 3. The device
  view only covers learners who joined. The teacher dimension adds teacher quality.
- `trend` (daily up to 21 days, otherwise weekly; empty periods kept), `heatmap`, `qualityDistribution`,
  `kindMix`, `needsAttention`, `sessionSummary`, `sessionTitle`, `sizeOf`, `nobodyCame`.
- Time bucketing uses `Intl.DateTimeFormat` in the viewer's chosen timezone (including half-hour offsets).

#### 2.4 `routes.ts`: the API
- **Query:** `from`, `to`, `tz`, `includeDemo`, and filters `kind, course, subject, teacher, grade, cohort, size,
  room, language, program, country, device, timezone` (comma lists). Learner filters keep sessions with a
  matching learner.
- **`dataset(query, withPrevious)`:** loads facts with a live class join, plus learners. Scores every session
  with one attention anchor, then filters.
- Settings live in kv `analytics_settings` and are sanitised on write.
- Exports and settings changes go to the `analytics_access` audit stream.

#### 2.5 Client
- **`analyticsClient.ts`:**
  - typed responses;
  - the query in the address bar (filters under `f.*` so they can't clash with app parameters such as
    `?room=`);
  - the period;
  - `useApi` (cached, abortable);
  - saved views (localStorage), formatting.
- **`metrics.ts`:** label, format, which direction is better, definition and target for every measure; the
  dimension and filter lists; fixed colours per session type.
- **`AnalyticsContext`:** query, `setQuery`, meta, `addFilter` (drill-down), `openSession`, `openTeacher`.
- **Tabs** read their own endpoints. Drawers (session, teacher, settings, definitions) are shared.

---

### 3. Shell and design-system modules

- **View registry contract:** `viewsFor(role)`, `canOpen(role, id)`, `homeView(role)`, `navSections(role)`,
  `phoneTabs(role)` (at most 4), `viewLabel(id, role)`, `isClassContent(id)`. Tested so that every role lands on
  a page it can open, and navigation offers only openable pages.
- **Primitives** take tokens only (no hex). `Drawer` is a side panel at md and up, a bottom sheet below, with
  a focus trap and focus restore. `DataTable` sorts with nulls last, has a sticky header and first column, and
  supports row keyboard activation.
- **Charts** size with `ResizeObserver` and use one y-axis. Tooltips work with hover, touch and keyboard.
  `ChartFrame` provides title, description, legend and "View as table". `BarList` stacks label/value over the
  bar in narrow containers (container queries).

---

### 4. Data flow between modules

```
LiveKit webhook ─▶ classSessionHub ─▶ attendance_events ─┐
captions/stt ───▶ transcript_lines ──────────────────────┤
engagement panel ▶ engagement_samples (consent) ─────────┤
roomControl/security/deviceAccess ▶ audit_events ────────┼─▶ facts.ts ─▶ session_facts / session_learners
reviews (routes.ts) ▶ class_reviews ─────────────────────┤                         │
notes ───────────▶ lecture_notes ────────────────────────┘                         ▼
                                              routes.ts (dataset → quality.ts → aggregate.ts) ─▶ UI
```

---

### 5. Demo modules (sample data)
The contracts below belong to interactive demos that run on illustrative data in this release.

#### A. Room Bomber Partitioning Engine
- **Module ID**: `RoomBomberPartitionService`
- **Location**: `server.ts` & `src/services/roomBomberService.ts`
- **Signature**:
  ```typescript
  function partitionClassroomForSales(
    students: Participant[],
    salesReps: Participant[],
    ratio: "1:1" | "1:2"
  ): PartitionResult;
  ```
- **Algorithm Details**:
  1. Filter all connected participants whose role is `student`.
  2. Filter all connected participants designated as `sales_rep` or available faculty.
  3. Determine required room count:
     $$\text{Rooms} = \lceil \frac{\text{Students}}{\text{Ratio}} \rceil$$
  4. If $\text{Available Reps} < \text{Rooms}$, dynamically adjust ratio or allocate senior sales lead to secondary rooms with alert flag.
  5. Instantiate $N$ isolated room records in the room registry with unique IDs (`bomber-room-1`, `bomber-room-2`, etc.).
  6. Pair each sales rep with exactly one student (and their registered parent profile).
  7. Construct and broadcast target room assignments across active WebSocket channels.

#### B. Remote Input Relay & Annotation Hub
- **Module ID**: `RemoteEventBus`
- **Responsibilities**:
  - Validates session permissions (`view_only` vs `annotate` vs `full_control`) before relaying input events.
  - Rate-limits cursor movement events to 60 FPS using timestamp interpolation.
  - Normalizes coordinate systems across mismatched aspect ratios:
    $$(x_{\text{normalized}}, y_{\text{normalized}}) \in [0.0, 1.0] \times [0.0, 1.0]$$
    Ensures that a pointer click on a 9:16 phone viewport maps accurately to the corresponding relative canvas coordinate on a 16:9 desktop controller.

#### C. Dedicated Role Authentication Broker
- **Module ID**: `AuthRoleBroker`
- **Responsibilities**:
  - Handles login workflows for `/login/teacher`, `/login/student`, `/login/auditor`, `/login/admin`.
  - Injects contextual user profiles (e.g., student grade level, parent phone, auditor license).
  - Emits `AUTH_LOGIN_SUCCESS` and commits state to browser `localStorage`.
  - Dispatches `AUTH_JOIN` over the active WebSocket channel immediately upon connection.

---

#### D. Synchronization & Conflict Resolution Topology

```
+-----------------------------------------------------------------------------+
| Client A (Teacher)             Server (Authority)       Client B (Student)  |
|        |                              |                        |            |
|        |-- Click(0.42, 0.81) -------->|                        |            |
|        |                              |-- Relay Click -------->|            |
|        |                              |                        |-- Execute -|
|        |                              |                        |-- Updated -|
|        |<-- ACK State ----------------|                        |            |
|        |                              |<-- Worksheet Sync -----|            |
|        |<-- Worksheet Sync -----------|                        |            |
+-----------------------------------------------------------------------------+
```

- **Conflict Policy**: Last-Write-Wins (LWW) with server-assigned monotonic sequence IDs.
- **Zero-Latency Speculative Updates**: Local UI updates annotations immediately; if server rejects permission, changes are rolled back within one frame.
