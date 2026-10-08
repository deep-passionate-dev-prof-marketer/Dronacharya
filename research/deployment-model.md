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
