# Dronacharya · 21K School

The live online classroom for 21K School: live classes with recording, captions and AI class notes, a
parent portal, device-locked class links, protection against copying class content, and class
analytics for auditors.

---

## Who uses it and what they see

| Role | Lands on | What they can do |
| :--- | :--- | :--- |
| **Learner** | Live class | Join their class (after a device check and the waiting room), captions in their language, whiteboard, polls, class notes, library, campus feed, certificates |
| **Teacher** | Live class | Start and end the class (it records automatically), admit learners, mute or remove, polls, breaks, recordings and AI notes of their own classes, attendance for their classes, teaching schedule, device access |
| **Parent** | My children | Each child's classes, attendance, teacher remarks and class notes; recording and engagement-analytics consent |
| **Admissions (counsellor)** | Admissions hub | Counselling and admission sessions, demo bookings, pitch rooms, CRM sync, recordings of their own sessions |
| **Auditor** | Class analytics | Class analytics, observing live classes (hidden, no camera or mic) with a saved review, attendance, all recordings, device access, capture-attempt log |
| **Admin** | Live class | Everything above, plus analytics targets and quality weights, automation and self-hosting |

Pages, names and access for every role come from one list: `src/routing/viewRegistry.ts`.

---

## What's in it

**Live classes**
- Video and audio through **our own media server** (an SFU built on mediasoup, in the same Node process),
  with simulcast so each viewer gets the quality their screen and network need. Direct peer-to-peer video is
  the fallback when the media server is turned off.
- The class is **run by the server**: only the host can start or end it, and starting twice can't create two
  classes. Sessions are checked against the media server and survive server restarts.
- Waiting room (enforced by the server) and admit, mute, stop video, remove, polls, breaks, whiteboard,
  low-bandwidth mode.
- **Breakout rooms**, **shared slides** (PDF, the teacher turns the pages) and a **class notes pad** (the
  teacher writes, learners read live).
- **Help buttons**: a learner can ask their parent (a message in the parent portal) or ask for tech help (a
  ticket for the admins).
- Live **captions and translation** on the school's own Whisper and language-model servers. The browser's
  speech recognition is never used, because it sends audio to outside companies.
- **Device-locked links**: each room has rules about which devices may join (phone, tablet, laptop, desktop).
  Learners can ask to join on another device; staff approve or deny. Every decision is logged.

**After class**
- Every class is **recorded automatically** as a transcript, kept on the school's server.
- **AI class notes** (summary, key points, homework) and "ask about this class", grounded in the transcript.
  Written by the school's own language model (Ollama), or extractive notes when there's no AI server.
- **Library**: teachers share documents and images (PDF, Office, images; 50 MB each) with their classes.

**Parents**
- A portal per child: attendance, remarks, notes, and consent for recording and engagement analytics.
  Withdrawing engagement consent also clears that learner's past attention values.

**Protecting class content**
- Forensic watermark on class pages, copy and print blocked on class content, capture attempts flashed and
  logged. The desktop app blocks screen recording at the OS level.

**Class analytics** (auditors and admins only)
- Quality, occupancy, class duration, counselling (sales-conversation) length, punctuality, attendance,
  engagement and more.
- Sliced by teacher, room, 30-minute time slot, weekday, week, timezone (teacher's or learner's), course,
  subject, cohort, grade, class size (1:1 to 1:24), session type, programme, language, learner country and
  device.
- Average **class quality** (a transparent, weighted score from six signals) and **teacher quality**
  (hours-weighted, adjusted for small samples, ranked from 5 classes).
- Admin-set **targets** with "needs attention" (weak classes, teachers trending down, rooms running empty), a
  delivery funnel, the counselling-to-enrolment rate, auditor reviews on an anchored 1–4 rubric, saved views
  and CSV export.
- Learner groups smaller than 3 are hidden. Teachers never see scores about themselves.

**Attendance**: who came on time, late, left early or missed each class, from the media server's join and leave records.
**Observe live class**: auditors watch hidden and see live numbers, engagement, the transcript and their review.

**Accounts**: admins add people on the **People** page. Each person gets a temporary password and chooses
their own at first sign-in.

Illustrative demo screens (pitch rooms, remote devices, certificates, automation, CRM simulator,
self-hosting, peer notes) are hidden in production; `SHOW_DEMO_FEATURES=1` shows them.

---

## Tech stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4 (design tokens in `src/index.css`), Vite 8, lucide icons;
  dependency-free SVG charts (`src/components/charts`) and UI primitives (`src/components/ui`).
- **Server**: Express + WebSockets (`ws`) in one Node process (`server.ts`, run with tsx).
- **Database**: Postgres through Drizzle ORM. PGlite (embedded, `data/pglite`) in development, Postgres in
  production. Migrations in `src/server/db/migrations` run on start.
- **Live video**: our own media server, `mediasoup` on the server and `mediasoup-client` in the browser
  (`src/server/media`, `src/services/media/classroomTransport.ts`).
- **Sign-in**: passwords (scrypt), optional email codes through the school's own mail server.
- **AI**: the school's own servers only: Ollama (notes, answers, translation) and Whisper (captions).
- **No outside services**: fonts are bundled, and the browser talks only to this server.
- **On-device engagement**: MediaPipe face landmarks (only for learners who agree).

---

## Run it locally

```bash
npm install
cp .env.example .env        # then fill in what you need (everything has a sensible default)
npm run dev                 # http://localhost:3000
```

Sign in with the test accounts on the sign-in screen (`AUTH_DEV_LOGIN=1`; **must be 0 in production**).

Optional services:

The media server starts with the app (UDP and TCP ports 40000 and up). `MEDIA_DISABLED=1` turns it off.

```bash
npm run ai:models           # download the local Whisper model and pull the Ollama model
npm run ai:ollama           # local language model (notes, answers)
npm run ai:whisper          # local speech-to-text (captions, transcripts)
```

Demo history for class analytics (development only, ~90 days and ~600 sessions, all marked `demo-`):

```bash
npm run demo:analytics                # stop the dev server first when using the embedded database
npm run demo:analytics -- --remove    # take it all out again
```

The dashboard shows a "Demo data" banner with a toggle while it's there. Demo rows never appear in teachers'
classes, recordings, notes, attendance, the parent portal or the security log.

---

## Tests

```bash
npm run lint        # TypeScript, plus the design-system ratchet (no hard-coded colours, nothing under 11px)
npm test            # unit tests (vitest): quality model, facts, aggregation, routing, attendance, captions…
npm run test:api    # API regression suite against a running server (142 checks: access rules, passwords, media server door…)
node scripts/e2e-class.mjs    # two headless browsers run a whole class: lobby, admit, video both ways, slides, breakouts…
node scripts/ui-crawl.mjs     # signs in as every role and clicks every button on every page
npm run build       # production bundle (analytics and charts load on demand)
```

---

## Deploy

Everything runs on the school's own server with `docker compose up -d --build`:

- **App** (`Dockerfile`): web app, API, sockets and the media server in one Node process.
- **Database**: Postgres in its own container.
- **HTTPS**: Caddy, with the school's certificate (or an automatic one).
- **AI** (optional, `--profile ai`): Ollama and Whisper.

Open ports 80 and 443 (TCP), and 40000–40003 (UDP and TCP) for class video. Step by step: `docs/DEPLOY.md`.
Every setting is in `.env.example`.

---

## Documentation

- `docs/PRD.md`: product requirements
- `docs/BRD.md`: business requirements
- `docs/FEATURES_AND_FUNCTIONALITY.md`: feature guide
- `docs/ARCHITECTURE_AND_FLOWS.md`: architecture and sequence flows
- `docs/HMD.md`, `docs/MMD.md`, `docs/LMD.md`: high-, mid- and low-level design (infrastructure, modules, data)
- `docs/translation/`: the live translation and captions subsystem
- `research/`: background analysis of the codebase

---

## License
Proprietary and confidential: 21K School.
