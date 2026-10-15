# High-Level Model Document (HMD)
## Dronacharya: Infrastructure, Scaling, Security and Privacy

**Document version:** 5.0 (self-hosted release)

> Earlier versions described a multi-region edge mesh with Redis and "measured" latencies. That was a design
> vision, not the deployed system. This version describes what actually runs.

---

### 1. Deployment

Everything runs on the school's own server, from `docker-compose.yml`. No outside service is used at run
time: no video cloud, no sign-in provider, no AI service, no web fonts or analytics.

```
                      Users (browsers, desktop app)
                         │ HTTPS + WSS (443)              │ UDP/TCP 40000–40003 (class video and audio)
             ┌───────────▼───────────────┐                │
             │ Caddy (HTTPS)             │                │
             └───────────┬───────────────┘                │
             ┌───────────▼────────────────────────────────▼──────┐
             │ app container: one Node process                    │
             │ API + WebSockets + SPA + media server (mediasoup) │──────▶ ai profile (optional):
             └──────┬───────────────────────────┬─────────────────┘        Ollama + Whisper containers
       ┌────────────▼───┐               ┌───────▼───────────────┐
       │ db container   │               │ app-data volume       │
       │ Postgres 16    │               │ recordings, library   │
       └────────────────┘               └───────────────────────┘
```

- **App**: `Dockerfile`. `node --import tsx server.ts`: REST API, room WebSocket, `/media` and `/stt`
  WebSockets, the media server's workers (one UDP + TCP port each, announced as `MEDIA_ANNOUNCED_IP`) and the
  built SPA. Database migrations run on start.
- **Development**: the same process with PGlite (embedded Postgres in `data/pglite`), the media server on
  this machine's LAN address, and optional local AI (`npm run ai:ollama`, `npm run ai:whisper`).
- **Setup guide**: `docs/DEPLOY.md`.

---

### 2. Scaling and resilience

- **Single instance by design (today)**: some hubs keep a hot in-memory copy (device rules, room state,
  admitted learners, class sessions) and write through to Postgres. To run several instances, move those reads
  to the database per request (or a shared cache) and pin WebSocket rooms.
- **Restarts**: class sessions, admitted learners and device decisions are reloaded from Postgres; sessions are
  reconciled against the media server's rooms (a session is ended only after two misses five minutes apart); notes for classes
  that ended during downtime are generated on start; analytics facts are backfilled in batches.
- **AI outages**: a stopped or overloaded AI server is skipped for 2 minutes. With no AI, notes are extractive
  and "ask" quotes the transcript; captions are off.
- **Media server**: a worker that dies is logged and its rooms close; browsers rejoin with backoff. If the
  browser's socket drops, it rejoins and restarts ICE. `MEDIA_DISABLED=1` falls back to direct video.
- **Capacity**: video is forwarded, not re-encoded. Plan network first: about 1.5 Mbit/s per learner per
  class, more for the teacher's outgoing video to everyone.
- **Analytics load**: one fact row per finished session; aggregation in memory over the selected period
  (thousands of rows), cached 60 s and cleared when facts are written.

---

### 3. Security

- **Sign-in**: passwords hashed with scrypt; accounts are created by admins with a temporary password that
  must be changed at first sign-in; 10+ characters, not common, not the person's name or email. Failed
  sign-ins are limited per account (8 per 15 minutes) and per network address (100); a wrong password and an
  unknown email get the same answer in the same time. Changing or resetting a password ends the person's
  other sessions. Optional one-time email codes (school's own mail server) with attempt limits. Test sign-in
  only with `AUTH_DEV_LOGIN=1` behind a passcode.
- **Sessions**: signed, HTTP-only, secure cookies (`SESSION_SECRET`) with an absolute lifetime.
- **Authorisation on every endpoint** (`requireAuth(role…)`): e.g. analytics for auditors and admins, settings
  for admins, attendance for teachers (own classes), auditors and admins.
- **Live class trust rules**: only the server sends class status and poll results; only hosts send stage and
  whiteboard sync; learners can clear only their own strokes; the room WebSocket stamps the sender and checks
  the Origin.
- **Media server door**: identity and role come from the session, never the request; parents can't join;
  learners must be on the class list, pass the device check and wait until admitted (enforced by the server,
  which only forwards video to and from admitted people); auditors are hidden; only hosts share screen audio.
  Data messages are stamped with the sender, size-capped and rate-limited.
- **Content protection**: watermark, capture deterrence and logging on class-content pages; OS-level blocking in
  the desktop app (attested with `DESKTOP_APP_KEY`).
- **Exports**: CSV cells starting with `= + - @` are neutralised; analytics exports and settings changes are
  logged to the `analytics_access` audit stream.

---

### 4. Privacy

- **Engagement analytics** run on the learner's device (MediaPipe) only with consent (learner or guardian);
  only summary signals are sent. Withdrawing consent clears past attention values.
- **Recording consent** per learner. Recordings are transcripts kept on the school's server.
- **No outside processors**: captions, translation and notes run on the school's own AI server, or not at all.
  The browser's speech recognition (which sends audio to outside companies) is never used.
- **Class analytics**: auditors and admins only; teachers never see scores about themselves; learner groups
  under 3 hidden; no individual learners in learner-level views.
- **URLs**: learners appear by student code, parents by id; no names of minors.
- **Device-access log** keeps device details for audit; legacy device telemetry is stored per signed-in sender
  and never broadcast to a room.

---

### 5. Service goals
These are goals to monitor, not measured figures.

| Area | Goal |
| :--- | :--- |
| Class start (host clicks Start → everyone sees it) | < 2 s |
| Notes after class (local model) | a few minutes on modest hardware; < 1 min with a GPU |
| Analytics page (90 days, ~600 sessions) | first load < 2 s, cached < 300 ms |
| Facts available after a class ends | ~20 s, refreshed at 10 min |
| Availability | 99.9% for the school's server (update outside class hours; nightly database backups) |
