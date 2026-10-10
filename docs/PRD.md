# Product Requirements Document (PRD)
## Dronacharya: Live Classes, Admissions and Class Analytics for 21K School

**Document version:** 4.0 (class analytics and design-system release)
**Status:** Implemented
**System:** Dronacharya (21K School and 21K Learning Floww)

---

### 1. Summary
Dronacharya is 21K School's live classroom. A class is booked with the best-matched teacher, learners join on
approved devices, the teacher starts it once for everyone, and it is recorded, transcribed, captioned and
summarised into notes. Parents follow their children in a portal. Auditors and admins see how every class
went in **Class analytics** and can observe live classes and review them.

---

### 2. Personas

| Persona | Goals | What the product gives them |
| :--- | :--- | :--- |
| **Learner** | Join class easily, follow along in their language, revise | Device check and waiting room, captions and translation, whiteboard, polls, class notes |
| **Teacher** | Teach, not operate software | One "Start class" for everyone, admit/mute/remove, polls, automatic recording and notes, attendance |
| **Parent** | Know how their child is doing; control their data | Attendance, remarks, notes, recording and analytics consent |
| **Counsellor (admissions)** | Run counselling and demo sessions that lead to enrolment | Booking with matching, invite links, pitch rooms (sample), their session recordings |
| **Auditor** | Know where teaching is strong or weak, fairly | Class analytics, hidden observation with a saved review, attendance, recordings, capture log |
| **Admin** | Run the school | Everything, plus analytics targets and weights |

---

### 3. Functional requirements

#### 3.1 Sign-in and access
- **FR-AUTH-1**: Server-side sessions (signed cookie). Google Workspace SSO for staff, email one-time codes,
  signed class invite links for learners. Dummy accounts only when `AUTH_DEV_LOGIN=1` (never in production).
- **FR-AUTH-2**: One view registry decides each role's pages, names, navigation and phone tabs. A role can't
  open, or be offered, a page it isn't allowed. Each role lands on its own home page (auditors: Class analytics).
- **FR-AUTH-3**: Role URLs name the role, country, language and page; learners' and parents' names never
  appear in URLs.

#### 3.2 Live class
- **FR-LIVE-1**: LiveKit media; the server issues tokens after the device-access check. Auditors join hidden,
  without publishing.
- **FR-LIVE-2**: Only the host can start or end the class; concurrent starts make one session and one recording.
- **FR-LIVE-3**: Waiting room and admit; mute, stop video, remove; polls run by the server; whiteboard; breaks;
  low-bandwidth mode.
- **FR-LIVE-4**: Captions from browser speech recognition or the server (Gemini Live, then local Whisper),
  translated into each viewer's language.

#### 3.3 Recording and notes
- **FR-REC-1**: Every class records automatically (video with Egress, otherwise transcript). Learners without
  recording consent are excluded from the video layout.
- **FR-REC-2**: After class, AI notes (summary, key points, homework) and "ask about this class", grounded in
  the transcript; providers Gemini → Ollama → extractive.

#### 3.4 Parent portal
- **FR-PAR-1**: Per child: classes, attendance, remarks, notes; recording and engagement consent with history.
- **FR-PAR-2**: Withdrawing engagement consent clears that learner's past attention values and recomputes
  the affected classes.

#### 3.5 Device access and content protection
- **FR-DEV-1**: Per-room device rules, learner requests to join on another device, staff approval, access log
  and an access report (joins by device, rooms turning devices away, decision times).
- **FR-SEC-1**: Watermark and copy/print blocking on class-content pages only (analytics and admin pages print
  normally); capture attempts logged and shown to auditors and admins.

#### 3.6 Class analytics (auditors and admins only)
- **FR-AN-1 Dimensions**: room; 30-minute time slot; weekday; week; teacher; teacher timezone; teacher
  country; course; subject; cohort (named batch, else programme and grade); grade; class size by the most
  learners in class at once (1:1 … 1:24, 1:25+, "No learners", "Unknown"); session type; programme;
  language; learner country, timezone, grade and device (learner-level). Time-based groups use a timezone
  the viewer picks.
- **FR-AN-2 Measures**: sessions, hours, average/median class duration, average/median counselling
  conversation length, counselling no-shows, classes nobody joined, start delay and on-time starts, occupancy
  (pooled), attendance rate, time present, class size, learners reached, engagement (consenting learners),
  questions and polls per class, capture attempts and removals per 100 sessions, notes coverage, reviewed
  sessions, class quality, teacher quality, delivery funnel, counselling-to-enrolment rate.
- **FR-AN-3 Class quality**: weighted mean (0–100) of attendance, on-time start, engagement, interaction, ran
  to schedule and auditor review; separate weights for classes and counselling; signals a class doesn't have
  are left out; fewer than 3 signals, nobody joined, or a false start (under 3 min) means not scored.
- **FR-AN-4 Teacher quality**: hours-weighted class quality pulled toward the school mean (k = 5), ranked
  from 5 classes, with spread and an 80% range.
- **FR-AN-5 Targets and needs attention**: admin-set targets (quality, occupancy, attendance, start delay);
  KPI tiles show on/below target and change against the previous period; a list of weak classes, teachers
  trending down and rooms running empty.
- **FR-AN-6 Pages**: Overview, Breakdown (group by any dimension, any measure, all measures in a sortable
  table, compare two groups), Teachers, Schedule (weekday × hour heatmap, start delay, actual vs scheduled
  length, occupancy by slot), Learners & geography, Counselling, Sessions (search, sort, paging, session drawer
  with score breakdown and reasons), Live engagement.
- **FR-AN-7 Reviews**: anchored 1–4 rubrics (teaching, counselling), drafts and final submission, one per
  auditor per session, counted in the class's quality; a review queue of lowest-scored and random sessions.
- **FR-AN-8 Usability**: filters as chips, all state in the address bar, saved views (this browser), CSV
  export (logged), "How we measure", freshness line, demo-data banner and toggle.
- **FR-AN-9 Privacy**: learner groups under 3 hidden; teachers can't open analytics; demo data isolated.

#### 3.7 Attendance
- **FR-ATT-1**: Live roster for the class in progress; per-session history (on time, late, left early, absent,
  minutes) for the last 7/14/30 days; guardian email for follow-up; CSV export. Teachers see their own classes.

#### 3.8 Observe live class (auditors)
- **FR-OBS-1**: Real class video (hidden observer), live numbers (status, start delay, learners here, waiting,
  late joiners, learner questions, teacher talk time, cameras on, hands raised), live engagement, transcript,
  and a review form saved to the session; link to the class's history in analytics.

#### 3.9 Booking
- **FR-BOOK-1**: The scheduler books through the matcher (teacher eligibility, availability, language,
  grade), saves the learner's country and timezone, and assigns a cohort (typed, inherited from an open
  section, or generated as "Programme G10 · Mon 16:00 · 2026").

---

### 4. Non-functional requirements
- **Accessibility**: AA text contrast, nothing under 11px, visible keyboard focus, 44px touch targets, ARIA
  tabs/menus/dialogs, "View as table" on every chart, reduced motion respected.
- **Responsiveness**: no horizontal page scroll at 375, 768 and 1366 px on every page (checked automatically).
- **Performance**: analytics aggregation in memory over the range with a 60 s cache cleared when new facts
  arrive; analytics and charts load on demand.
- **Reliability**: facts computed 20 s and 10 min after each class, plus a background backfill; webhook
  retries deduplicated by event id.
- **Security**: role checks on every endpoint; CSV cells neutralised against spreadsheet formulas; exports
  and settings changes logged.

---

### 5. Success metrics
Tracked in Class analytics, against admin-set targets: class quality, teacher quality, occupancy, attendance,
on-time starts, delivery rate, counselling-to-enrolment rate, counselling no-shows, capture attempts.

### 6. Out of scope (this release)
Persisting room-bomber pitch rooms; a real CRM connection; certificate issuing; uploading library materials;
email alerts for "needs attention" (shown in-app only).
