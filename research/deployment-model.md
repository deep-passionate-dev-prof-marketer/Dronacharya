# Deployment Model Architecture

## 1. Topologies
1. **Local & On-Premise Docker Deployment**:
   - Node.js runtime with Express HTTP server and WebSocket hub (`server.ts`).
   - Self-hosted Vite production bundle serving (`dist/`).
   - Fully offline capable: zero external runtime dependencies.
2. **Edge / Serverless Deployment (Vercel / Cloud Run)**:
   - Client bundle hosted on edge CDN.
   - Serverless translation microservice in `api/ai/live-translate-stream.ts`.
   - WebRTC mesh communication with `BroadcastChannel` and WebSocket signaling.
3. **Hardware Profiles & Resource Allocation**:
   - CPU Mode: In-browser Web Speech API + Web SpeechSynthesis + In-memory token/semantic translation engine (0MB GPU VRAM, minimal CPU overhead < 2%).
   - GPU Mode: Compatible with self-hosted Faster-Whisper, NLLB/CTranslate2, and Piper TTS containers.

## 2. Status in v4.0
- **Production**: the Node server (`server.ts`) in Docker / Render / Railway / Fly, with Supabase Postgres and
  Storage, LiveKit Cloud, Gemini, and optionally a local AI host (Ollama + whisper.cpp). Serverless functions
  can't host the WebSockets, sessions, webhooks and database the app needs.
- **Note**: a `vercel.json` and `api/` stand-ins exist in the repository for UI-only previews on Vercel. They
  don't provide real sign-in, data or class analytics and must not be used as the production deployment.
