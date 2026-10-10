# Features & Functionality Guide
## Dronacharya: What Each Role Can Do, and How It Works

**Document version:** 4.0
**Platform:** 21K School Dronacharya and 21K Learning Floww

Status key: **Live** = real data and real behaviour. **Sample** = a working screen on illustrative data
(marked in the app with a "Sample" notice).

---

### 1. Roles, sign-in and navigation (Live)
- **Sign-in**: Google Workspace SSO for staff, email one-time codes, signed class invite links for learners
  (no password). Test accounts appear only with `AUTH_DEV_LOGIN=1`.
- **One list of pages** (`src/routing/viewRegistry.ts`) drives the sidebar, the phone tab bar (four tabs per
  role plus More), the command palette (Ctrl/Cmd+K: pages, then actions) and role access. Every page has one
  name everywhere; the classroom is "Observe live class" for auditors.
- **Home page per role**: learners and teachers → Live class; parents → My children; admissions → Admissions
  hub; auditors → Class analytics. A class link or a page URL always wins.

### 2. Live class (Live)
- LiveKit video; peer-to-peer fallback when LiveKit isn't configured.
- **Server-run sessions**: only the host starts or ends; the start also starts the recording; restarts and
  crashes recover by checking LiveKit.
- Waiting room with admit/admit all; mute, stop video, remove; polls (server-counted); whiteboard; 5-minute
  breaks; low-bandwidth mode (audio and slides only).
- Auditors join hidden, without camera or microphone, and see the observer panel (§10).

### 3. Recording, transcript and notes (Live)
- Automatic recording of every class; video with LiveKit Egress (custom layout leaves out learners without
  recording consent), otherwise transcript-only. Files on local disk or Supabase Storage.
- **Notes** after class: summary, key points, homework, grounded in the transcript. Gemini → local model
  (Ollama) → extractive. Long classes are summarised in parts.
- **Ask about this class**: answers quote the transcript.
- **Recordings** page: playback with transcript; auditors and admins also see the engagement timeline.

### 4. Captions and translation (Live)
- Captions from the browser's speech recognition, or the server's (Gemini Live, falling back mid-class to a
  local Whisper server). Each viewer reads captions in their own language. See `docs/translation/`.
- Simulated "test phrase" buttons exist only in development builds.

### 5. Parents (Live)
- **My children**: each child's classes, attendance, teacher remarks and class notes.
- **Consent**: recording and engagement analytics, with history. Withdrawing engagement consent clears that
  learner's past attention values.

### 6. Device access (Live)
- **Rules & requests**: which device types may join each room; learners can ask to join on another device;
  staff approve or deny.
- **Access report**: join attempts and blocks, joins allowed after a request, pending requests, median
  decision time, device-type mismatches, blocked share by device, rooms turning devices away, who decided
  requests. Access log CSV.
- **Capture attempts** (auditors and admins): screenshot, recording and print attempts by room and person.

### 7. Protecting class content (Live)
- On class-content pages (live class, recordings, notes, library, parent portal): forensic watermark, no
  copy, drag, context menu or print; capture attempts flash the watermark and are logged.
- Analytics and admin pages are not class content and print normally.
- The desktop app blocks screen recording at the OS level.

### 8. Class analytics (Live; auditors and admins only)

**Header**: period (7, 30, 90 days, year to date, custom), timezone for time slots and days, filters as chips
(teacher, session type, course, subject, cohort, grade, class size, room, programme, language, learner
country, learner timezone, learner device), saved views, CSV export, "How we measure", and a freshness line.
Admins also get **Targets & weights**.

**KPI tiles**: sessions held, class quality, teacher quality, occupancy, attendance, class duration,
counselling length, on-time starts. Each shows on/below target, the change against the previous period of
the same length, and a trend line.

**Tabs**
| Tab | What it shows |
| :--- | :--- |
| Overview | Quality and occupancy over time with targets; needs attention; scheduled classes delivered (funnel); families who enrolled after counselling; sessions by type; how classes scored |
| Breakdown | Group by any of 19 dimensions, rank by any measure against the school average and target; every measure in a sortable table; tick two rows to compare them |
| Teachers | Leaderboard: teacher quality with likely range, trend, classes, hours, on-time starts, attendance, occupancy, engagement, questions, auditor reviews; opens a teacher drawer |
| Schedule | Weekday × hour heatmap (sessions, quality or occupancy); how late classes start; actual vs scheduled length; occupancy by 30-minute slot |
| Learners & geography | How learners joined (on time, late, left early, absent); attendance by country, learner timezone and grade; engagement by device |
| Counselling | Sessions, average conversation, no-shows, enrolled within 30 days; conversation length by counsellor; no-shows by weekday; trend |
| Sessions | Search, sort and page every session; suggested for review; opens the session drawer |
| Live engagement | Real-time engagement of consenting learners per room |

**Class quality (0–100)**: a weighted average of the signals a class has.

| Signal | Classes | Counselling | Measured as |
| :--- | ---: | ---: | :--- |
| Attendance | 25 | 30 | Learners who came ÷ enrolled (or ÷ seats); unknown without join data |
| On-time start | 15 | 20 | Full marks up to 5 min late, nothing from 20 min |
| Engagement | 20 | 10 | Attention of consenting learners, pulled toward the school average when few agreed (capped at 25) |
| Interaction | 15 | 20 | Learner questions per 10 learners, plus poll answers |
| Ran to schedule | 10 | 5 | Full marks at 85–110% of the planned length |
| Auditor review | 15 | 15 | The submitted 1–4 rubric score |

Not scored: fewer than 3 signals, nobody joined, or a false start under 3 minutes. Moderation never lowers a
score. Each session lists plain reasons ("Started 14 min late").

**Teacher quality**: hours-weighted class quality, pulled toward the school average with the weight of 5
classes, ranked from 5 classes, shown with spread and an 80% likely range.

**Reviews**: anchored 1–4 rubrics for teaching (explains clearly, pacing, involves learners, subject
accuracy, class management) and counselling (rapport, understands needs, explains the programme, accurate
information, agrees next steps). Drafts save; a submitted review is final and counts toward the score.

**Privacy**: learner groups under 3 are hidden; teachers can't open analytics; exports and settings
changes are logged.

**Demo history** (development): `npm run demo:analytics` writes ~90 days of raw records (marked `demo-`)
and runs the real pipeline over them; a banner and toggle show it; `-- --remove` deletes it.

### 9. Attendance (Live)
Live roster for the class in progress (on time or late), and every recent class with on time / late / left
early / absent counts, minutes in class, the guardian's email for follow-up, and CSV export. Teachers see
their own classes; auditors and admins see all.

### 10. Observe live class (Live; auditors)
The class video next to an observer panel: **Live** (status, start delay, learners here vs enrolled and seats,
waiting, joined late, learner questions, teacher talk time, cameras on, hands raised, who's in the room),
**Engagement**, **Transcript** and **Review** (saved to the session). "Class history" opens the room in
analytics.

### 11. Booking and cohorts (Live)
The scheduler books through the teacher matcher and creates the learner's account with their country and
timezone. Group classes get a **cohort** (named batch): typed in, inherited when a learner joins an open
section, or generated ("IGCSE G10 · Mon 16:00 · 2026").

### 12. Design system (Live)
- **Tokens** in `src/index.css` (`@theme`): brand colours, surfaces (canvas, sunken, surface, raised),
  ink levels, status colours, chart series and a sequential ramp, `text-2xs` (11 px minimum), Lato as the
  body font. `npm run lint` fails on hard-coded colour classes or text under 11 px.
- **Primitives** (`src/components/ui`): Button, IconButton, Card, PageHeader/Page, Badge, SampleNotice,
  EmptyState, ErrorState, Skeleton, Drawer (side panel / bottom sheet with focus trap), Tabs,
  SegmentedControl, Field, Select, Popover, DataTable (sortable, sticky header and first column),
  ScoreMeter.
- **Charts** (`src/components/charts`): LineChart, ColumnChart, BarList, StackedBar, Heatmap, Sparkline,
  each with tooltips, keyboard focus and "View as table". One axis per chart; a validated colour order.

### 13. Sample screens
| Screen | Status |
| :--- | :--- |
| Admissions hub (leads, pipeline) | Sample data; real counselling results are in Class analytics |
| Pitch rooms (1:1 breakout HUD) | Working demo; rooms and stats not saved |
| Automation | Illustrative rules; running one sends nothing |
| Certificates | Example certificates |
| Library | Example materials |
| Teaching schedule matrix | Example roster and room; real bookings use the matcher |
| CRM sync | Simulated CRM with example leads |
| Remote devices, 3D lab, notebook studio extras | Interactive demos |
