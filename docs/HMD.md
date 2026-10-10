# High-Level Model Document (HMD)
## Dronacharya: Infrastructure, Scaling, Security and Privacy

**Document version:** 4.0 (class analytics release)

> Earlier versions described a multi-region edge mesh with Redis and "measured" latencies. That was a design
> vision, not the deployed system. This version describes what actually runs.

---

### 1. Deployment

```
                      Users (browsers, desktop app)
                         │ HTTPS + WSS                    │ WebRTC
             ┌───────────▼───────────────┐      ┌─────────▼───────────────────┐
             │ Dronacharya app service   │◀────▶│ LiveKit Cloud (SFU, Egress) │
             │ one Node process          │ API, │ region nearest the class    │
             │ (Docker / Render / Fly /  │ hooks└─────────────────────────────┘
             │  Railway)                 │
             │ API + WebSockets + SPA    │──────▶ Google Gemini (notes, ask, live STT)
             └──────┬───────────┬────────┘──────▶ optional AI host: Ollama + whisper.cpp
                    │           │                  (docker-compose.ai.yml)
       ┌────────────▼───┐   ┌───▼───────────────────┐
       │ Supabase       │   │ Supabase Storage      │
       │ Postgres (TLS, │   │ recordings (S3 API)   │
       │ CA-verified)   │   └───────────────────────┘
       └────────────────┘
```

- **App**: `Dockerfile` / `render.yaml`. `npm start` runs `server.ts` (tsx): REST API, room WebSocket, `/stt`
  WebSocket and the built SPA. Database migrations run on start.
- **Development**: the same process with PGlite (embedded Postgres in `data/pglite`), LiveKit in dev mode
  (`npm run livekit:dev`) and optional local AI (`npm run ai:ollama`, `npm run ai:whisper`).

---

### 2. Scaling and resilience

- **Single instance by design (today)**: some hubs keep a hot in-memory copy (device rules, room state,
  admitted learners, class sessions) and write through to Postgres. To run several instances, move those reads
  to the database per request (or a shared cache) and pin WebSocket rooms.
- **Restarts**: class sessions, admitted learners and device decisions are reloaded from Postgres; sessions are
  reconciled against LiveKit (a session is ended only after two misses five minutes apart); notes for classes
  that ended during downtime are generated on start; analytics facts are backfilled in batches.
- **AI outages**: providers are tried in `AI_PROVIDERS` order; a provider that fails, times out or hits its
  quota is skipped for 2 minutes (captions fail over mid-class). With no AI, notes are extractive.
- **Webhooks**: LiveKit retries are deduplicated by event id.
- **Analytics load**: one fact row per finished session; aggregation in memory over the selected period
  (thousands of rows), cached 60 s and cleared when facts are written.

---

### 3. Security

- **Sessions**: signed, HTTP-only cookies (`SESSION_SECRET`); Google Workspace SSO restricted to the school
  domain; one-time email codes with attempt limits; dummy sign-in only with `AUTH_DEV_LOGIN=1`.
- **Authorisation on every endpoint** (`requireAuth(role…)`): e.g. analytics for auditors and admins, settings
  for admins, attendance for teachers (own classes), auditors and admins.
- **Live class trust rules**: only the server sends class status and poll results; only hosts send stage and
  whiteboard sync; learners can clear only their own strokes; the room WebSocket stamps the sender and checks
  the Origin.
- **LiveKit tokens**: identity and role come from the session, never the request body; learners pass the device
  check; auditors are hidden and can't publish.
- **Content protection**: watermark, capture deterrence and logging on class-content pages; OS-level blocking in
  the desktop app (attested with `DESKTOP_APP_KEY`).
- **Exports**: CSV cells starting with `= + - @` are neutralised; analytics exports and settings changes are
  logged to the `analytics_access` audit stream.

---

### 4. Privacy

- **Engagement analytics** run on the learner's device (MediaPipe) only with consent (learner or guardian);
  only summary signals are sent. Withdrawing consent clears past attention values.
- **Recording consent** per learner; learners without it are left out of the video layout.
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
| Notes after class (Gemini) | < 2 min; local model a few minutes on modest hardware |
| Analytics page (90 days, ~600 sessions) | first load < 2 s, cached < 300 ms |
| Facts available after a class ends | ~20 s, refreshed at 10 min |
| Availability | 99.9% for the app service (LiveKit and Supabase have their own SLAs) |
