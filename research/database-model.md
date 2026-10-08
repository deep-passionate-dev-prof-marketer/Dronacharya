# Database & State Model Architecture

## 1. Entities
- **Users**: `id`, `name`, `role`, `email`, `avatarColor`.
- **Rooms**: `id`, `title`, `topic`, `teacherId`, `defaultLanguage`, `isTranslationEnabled`.
- **Participants**: `userId`, `roomId`, `role`, `joinedAt`, `isAudioMuted`, `isVideoOff`.
- **UserLanguagePreferences**: `userId`, `mySpokenLanguage`, `targetTranslationLanguage`, `isAudioTranslationEnabled`, `captionMode`, `originalAudioVolume`, `translatedAudioVolume`, `subjectContext`.
- **TranslationChunks / Transcripts**: `id`, `roomId`, `speakerId`, `speakerName`, `sourceLanguage`, `targetLanguage`, `sourceText`, `translatedText`, `isFinal`, `timestamp`, `latencyMs`.
- **TranslationMetrics**: `totalTranslations`, `cacheHits`, `averageLatencyMs`, `p50LatencyMs`, `p95LatencyMs`, `recentLatencies`.

## 2. In-Memory Real-Time State
- Synchronized across clients via `src/server/realtimeHub.ts` and `src/services/realtimeSocket.ts`.
- Sub-millisecond lookup and update complexity $O(1)$.
