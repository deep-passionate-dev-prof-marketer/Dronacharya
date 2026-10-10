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
- Video through **LiveKit** (an SFU), with a peer-to-peer fallback when LiveKit isn't configured.
- The class is **run by the server**: only the host can start or end it, and starting twice can't create two
  classes. Sessions are checked against LiveKit and survive server restarts.
- Waiting room and admit, mute, stop video, remove, polls, breaks, whiteboard, low-bandwidth mode.
- Live **captions and translation**: the browser's speech recognition, or the server's (Gemini Live, falling
  back to a local Whisper server).
- **Device-locked links**: each room has rules about which devices may join (phone, tablet, laptop, desktop).
  Learners can ask to join on another device; staff approve or deny. Every decision is logged.

**After class**
- Every class is **recorded automatically**: video with LiveKit Egress, otherwise as a transcript. Learners
  without recording consent are left out of the video.
- **AI class notes** (summary, key points, homework) and "ask about this class", grounded in the transcript.
  Gemini first, then a local model (Ollama), then extractive notes when there's no AI at all.

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

**Attendance**: who came on time, late, left early or missed each class, from LiveKit join and leave records.
**Observe live class**: auditors watch hidden and see live numbers, engagement, the transcript and their review.

Screens that still run on illustrative data (admissions hub, pitch rooms, automation, certificates, library,
facilitator matrix, CRM view) carry a **Sample** notice.

---

## Tech stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4 (design tokens in `src/index.css`), Vite 8, lucide icons;
  dependency-free SVG charts (`src/components/charts`) and UI primitives (`src/components/ui`).
- **Server**: Express + WebSockets (`ws`) in one Node process (`server.ts`, run with tsx).
- **Database**: Postgres through Drizzle ORM. PGlite (embedded, `data/pglite`) in development, Supabase in
  production. Migrations in `src/server/db/migrations` run on start.
- **Live video**: LiveKit (`livekit-client`, `livekit-server-sdk`), Egress for video recording.
- **AI**: Google Gemini (`@google/genai`); local fallback with Ollama (notes, answers) and whisper.cpp
  (captions, transcripts).
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

```bash
npm run livekit:dev         # LiveKit for real video (otherwise peer-to-peer)
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
npm run test:api    # API regression suite against a running server (82 checks incl. analytics access rules)
npm run build       # production bundle (analytics and charts load on demand)
```

---

## Deploy

Production runs as one Node service plus Supabase:

- **App**: `Dockerfile` (or `render.yaml` for Render; Railway and Fly work the same way). `npm start` serves
  the API, WebSockets and the built app.
- **Database and storage**: Supabase Postgres (`DATABASE_URL`, `DATABASE_CA_CERT`) and Supabase Storage for
  recordings (`RECORDING_S3_*`).
- **Video**: LiveKit Cloud (`LIVEKIT_URL`, key, secret; webhook to `https://<domain>/api/livekit/webhook`;
  `LIVEKIT_EGRESS=1` for video recordings).
- **Sign-in**: Google Workspace SSO (`GOOGLE_*`), `SESSION_SECRET`, `AUTH_DEV_LOGIN=0`.
- **AI**: `GEMINI_API_KEY`, optionally a local AI host (`docker-compose.ai.yml`, `OLLAMA_URL`, `WHISPER_URL`).

See `.env.example` for every setting.

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
