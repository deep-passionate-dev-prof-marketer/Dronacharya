# Integration Analysis for Self-Hosted Real-Time Translation

## 1. What Exists
- Fully functional multi-participant video classroom with in-house WebRTC mesh and WebSocket signaling.
- Decoupled audio processing pipeline tapping the microphone for VAD and STT.
- Unified STT engine (`src/services/translation/speechTranslationEngine.ts`) using Web Speech API with BCP-47 locale support.
- Multilingual Speech Synthesis (TTS) with target-voice auto-detection, ducking, and keepalive management.
- Multi-student language router (`src/services/translation/translationRouter.ts`) deduplicating translation requests across 50+ participants.
- Educational Terminology Protector (`src/services/translation/terminologyProtector.ts`) preserving math, science, and coding terms.
- Frontend UI components: Subtitle overlay (`SubtitleOverlay.tsx`), Live transcript feed (`TranscriptFeed.tsx`), Interpreter modal (`RealtimeInterpreterModal.tsx`).

## 2. What Must Be Modified (Zero Third-Party Dependency Purge)
- **Purge External Translation Endpoint in `src/services/translation/translationEngine.ts`**: Remove `https://api.mymemory.translated.net/get` and replace with pure self-hosted offline translation engine.
- **Purge External Translation Endpoint in `api/ai/live-translate-stream.ts`**: Remove `https://api.mymemory.translated.net/get` from edge microservice and replace with pure self-hosted offline translation engine.
- **Remove External Fallback in `src/services/geminiService.ts`**: Ensure all translation requests delegate to the self-hosted engine without relying on external Gemini or MyMemory endpoints.

## 3. What Must Be Added
- **Self-Hosted Comprehensive Vocabulary & Grammar Engine (`src/services/translation/selfHostedDictionary.ts`)**:
  - Offline multilingual dictionary mapping 1,500+ high-frequency classroom words, verbs, adjectives, question words, and numbers across 20+ languages.
  - Token-level translation algorithms with phrase n-gram matching (1-gram, 2-gram, 3-gram).
  - Morphological stemmers and grammatical converters for English, Hindi, Spanish, French, German, Arabic.
  - Spontaneous conversation phrase resolvers (questions, hesitations, self-corrections, numbers, units, code tokens).
- **Self-Hosted Grammar & Syntax Rules Engine (`src/services/translation/grammarRules.ts`)**:
  - Sentence structure reordering (e.g. Hindi SOV $\leftrightarrow$ Spanish/English SVO).
  - Tense, negation, and question word inversion.
  - Spontaneous utterance cleaners preserving conversational nuances ("wait, no", "I think I made a mistake", "can you repeat?").
- **Verification Test Suite**:
  - Test harness validating spontaneous human conversation translation (Hindi $\leftrightarrow$ Spanish, English $\leftrightarrow$ Spanish, Hindi $\leftrightarrow$ English) with zero network calls.

## 4. What Must NOT Be Modified
- The WebRTC media transport in `src/services/webRtcMeshService.ts`.
- The video stage rendering and participant grid logic.
- The classroom layout, controls, and session state architecture.

## 5. Why This Integration Point is Correct
By implementing the self-hosted translation engine directly inside the decoupled `translationEngine.ts` and `api/ai/live-translate-stream.ts`, both the browser client and serverless edge functions operate completely offline with 0ms external API roundtrip latency, 0 external data leaks, and zero cost.
