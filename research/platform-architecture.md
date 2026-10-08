# Platform Architecture Analysis

## 1. Executive Summary
This document provides the foundational architecture mapping for the Dronacharya online live-classroom platform. The platform is designed for ultra-low latency, multi-role interaction (Instructor, Student, TA, Admin, Auditor, Sales Representative) with zero external commercial AI/API lock-in.

## 2. Technology Stack Discovery
- **Frontend Framework**: React 19.0.1 with TypeScript 7.0.2, Vite 8.3.0, Tailwind CSS 4.3.3, Lucide React icons, Framer Motion (`motion` 12.23.24), Three.js 0.186.1 (for 3D STEM/Bloch sphere simulations).
- **Backend Framework**: Node.js with Express 4.21.2 (`tsx` execution runtime in development and production), standalone HTTP server with WebSocket server integration (`ws` 8.22.0).
- **Database / State Persistence**:
  - In-Memory High-Performance Realtime State Store in `src/server/realtimeHub.ts` handling active rooms, users, peer rosters, remote sessions, device audits, and telemetry.
  - Browser LocalStorage caching for participant preferences, device configurations, and audio settings.
  - Pluggable PostgreSQL / Redis schema architecture defined for scale-out deployments.
- **WebRTC & Real-Time Audio/Video**:
  - Dual-mode mesh & SFU architecture (`src/services/webRtcMeshService.ts`).
  - Browser-native WebRTC `RTCPeerConnection` with STUN/TURN traversal (`stun:stun.l.google.com:19302`, `stun:stun.cloudflare.com:3478`).
  - WebSocket signaling hub (`src/server/realtimeHub.ts`) handling SDP offers, answers, ICE candidates, and room state sync.
  - Local cross-tab signaling via `BroadcastChannel('dronacharya_webrtc_mesh_bus')`.
- **Audio Capture & Pipeline**:
  - `navigator.mediaDevices.getUserMedia` with hardware echo cancellation (`echoCancellation: true`), noise suppression (`noiseSuppression: true`), and auto gain control (`autoGainControl: true`).
  - Web Audio API (`AudioContext`, `AnalyserNode`) for real-time RMS Voice Activity Detection (VAD) and audio level telemetry.
- **Speech & Audio Synthesis (STT / TTS)**:
  - Browser-native `webkitSpeechRecognition` / `SpeechRecognition` API with dynamic BCP-47 locale switching.
  - Browser-native `window.speechSynthesis` with multi-voice auto-detection, ducking, and keepalive timer.
- **Deployment & Hosting**:
  - Containerizable via Node.js / Docker.
  - Vercel Serverless Edge deployment with SPA fallback and dedicated edge microservice (`api/ai/live-translate-stream.ts`).
  - Express static bundle serving in standalone production server mode (`server.ts`).

## 3. Repository Structure Map
```text
/
├── api/                           # Vercel Serverless edge functions
│   └── ai/live-translate-stream.ts # Self-hosted Edge Translation Microservice
├── docs/translation/              # Engineering specifications & design documents
├── research/                      # Architecture discovery & research reports
├── src/
│   ├── components/
│   │   ├── admin/                 # Administrator dashboards & flow builders
│   │   ├── audit/                 # Hardware & device audit console
│   │   ├── auth/                  # Role-based authentication screens
│   │   ├── bomber/                # 1:1 Sales pitch room & lead conversion stage
│   │   ├── classroom/             # Live classroom video grid, subtitles, controls
│   │   ├── translation/           # Realtime Interpreter Studio & audio controls
│   │   └── ...
│   ├── context/
│   │   └── ClassroomContext.tsx   # Master application state & peer bus coordinator
│   ├── server/
│   │   └── realtimeHub.ts         # Standalone WebSocket server & signaling hub
│   ├── services/
│   │   ├── translation/           # Core Translation & Speech Engine Layer
│   │   ├── webRtcMeshService.ts   # Peer-to-peer WebRTC audio/video mesh
│   │   └── realtimeSocket.ts      # WebSocket client with BroadcastChannel fallback
│   ├── types/                     # TypeScript contracts & data models
│   ├── App.tsx                    # Top-level view switcher & role gate
│   └── main.tsx                   # React root entry point
├── server.ts                      # Standalone Express + Vite HTTP & WebSocket server
├── package.json
└── vite.config.ts
```
