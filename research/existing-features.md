# Existing Features & Component Capabilities

## 1. Core Feature Inventory
1. **Interactive Live Classroom**: Multi-tile video grid with manual layout adjustments (speaker view, grid view, dock view, stage focus).
2. **Audio & Video Controls**: Mute, Camera toggle, Screen sharing, Hand raising, Breakout rooms.
3. **Live Subtitles & Captions**: Real-time dual-language subtitle overlay (`SubtitleOverlay.tsx`), persistent active listening badge, 1-click test triggers.
4. **Live Transcript Feed**: Real-time searchable transcripts (`TranscriptFeed.tsx`), per-line audio playback (TTS), export to text file.
5. **Real-time Interpreter Studio**: Dedicated control center modal (`RealtimeInterpreterModal.tsx`), 50+ language selectors, dual audio mixing sliders (Original vs. Translated), benchmark simulation suite, latency observability gauges.
6. **Room Bomber & 1:1 Pitch Stage**: Dedicated sales role assignment, lead intelligence, audio audit and conversion telemetry.
7. **STEM 3D AR Visualizer**: Interactive Three.js 3D Bloch sphere for physics and quantum state visualization.
8. **Device Audit & Remote Console**: Automated hardware environment detection, camera/mic health audit, and remote support console.

## 2. Added since (v4.0)
- Server-run class sessions (only the host starts or ends), automatic recording, AI class notes and
  "ask about this class".
- Parent portal with consent; device-locked class links with requests and an access report.
- Content protection (watermark, capture deterrence, desktop app).
- **Class analytics** for auditors and admins (quality, occupancy, duration, counselling length,
  punctuality, attendance by 19 dimensions; targets, needs attention, reviews, CSV).
- Attendance by session; "Observe live class" for auditors.
- Design system (tokens, primitives, charts) and a single view registry for navigation and access.
- Screens still on illustrative data carry a "Sample" notice (see `docs/FEATURES_AND_FUNCTIONALITY.md` §13).
