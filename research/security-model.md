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
