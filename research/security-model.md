# Security & Threat Model

## 1. Authentication & Role-Based Access Control (RBAC)
- **Roles**: Instructor, Student, TA, Administrator, Auditor, Sales Representative.
- **Room Membership Isolation**: Every room has an isolated namespace. Messages and events are rejected unless the client has joined the corresponding `roomId`.
- **Cross-Room Data Leakage Prevention**: Audio, transcripts, captions, and translations are strictly tagged with `roomId` and `speakerId`. No cross-room event dissemination is permitted.

## 2. Threat Analysis & Mitigations
- **Spoken Prompt Injection**: Spoken text is treated purely as untrusted string data. The translation engine translates text verbatim and never executes commands or instructions contained in speech.
- **Audio Privacy**: Raw microphone audio is transient and never persisted to disk or external databases. Telemetry logs only metadata (latencies, token counts, error codes).
- **Zero Third-Party Data Transmission**: No classroom speech, text, or child data is sent to external AI providers (OpenAI, Google, Azure, AWS, Deepgram, ElevenLabs, MyMemory, etc.).
- **Transport Security**: TLS 1.3 / HTTPS for HTTP endpoints and WSS for WebSocket signaling. DTLS / SRTP for WebRTC peer tracks.

## 3. Status in v4.0
- Signed, HTTP-only session cookies; every API checks the role on the server (`requireAuth`). Identity in
  LiveKit tokens comes from the session, never the request.
- Class analytics: auditors and admins only; learner groups under 3 hidden; exports and settings logged.
- **Correction**: classroom text is sent to Google Gemini when `AI_PROVIDERS` includes `gemini` (the
  default) and browser speech recognition may use the browser vendor's service. Setting
  `AI_PROVIDERS=local` and `STT_PREFER_SERVER=1` keeps all speech and text on the school's servers.
- See `docs/HMD.md` §3–4 for the full security and privacy posture.

## Status in v5.0 (self-hosted)
- Passwords (scrypt) for everyone; identity at the media server's door comes from the session.
- The v4.0 correction no longer applies: Gemini and browser speech recognition are gone, so classroom speech
  and text stay on the school's servers. Fonts are bundled; the browser talks only to the school's server.
