# 01 - Repository Analysis

## Codebase Audit Findings
- **Stack**: React 19 + TypeScript + Vite 8 frontend; Express 4 + ws 8 backend; WebRTC mesh media layer.
- **AI Dependencies Currently Present**:
  - `src/services/translation/translationEngine.ts`: Lines 293-297 call `https://api.mymemory.translated.net/get` as Tier 4 fallback.
  - `api/ai/live-translate-stream.ts`: Lines 112-116 call `https://api.mymemory.translated.net/get`.
  - `server.ts`: Uses `@google/genai` for study digest with an offline fallback circuit breaker.
- **Action Plan**:
  1. Remove all calls to `api.mymemory.translated.net` completely.
  2. Implement an in-memory, self-hosted multilingual translation dictionary and grammar reordering engine.
  3. Ensure 100% self-hosted, offline operation for real-time speech translation and live captions.
