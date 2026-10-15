# 09 - API Specification

All endpoints are served by the Node server (`server.ts`) and need a signed-in session.

`POST /api/ai/live-translate-stream`
- Body: `{ text: string, sourceLanguage?: string, targetLanguage: string, speaker?: string }`
- Response: `{ speaker, sourceLanguage, targetLanguage, englishText, translatedText, provider }`
- The school's language model (Ollama) when set up; otherwise `503 {unavailable: true}` and the client uses its
  on-device dictionary. A failing AI server is skipped for 2 minutes.

`GET /api/stt/status`
- Response: `{ enabled: boolean, providers: ("local")[], preferServer: boolean, serverOnly: true }`

`WS /stt?lang=<BCP-47>` (same origin only; signed in; parents refused)
- Client sends binary PCM16 16 kHz mono frames, and `{ "type": "stop" }` to finish.
- Server sends `{ "type": "ready" }`, then `{ "type": "interim", text }` and `{ "type": "final", text }`;
  `{ "type": "error", error }` if no provider can transcribe. Provider failover is invisible to the client.

`POST /api/rooms/:slug/transcript` (participants of the class)
- Body: `{ text }`; stored as a transcript line for recordings, notes and analytics.
