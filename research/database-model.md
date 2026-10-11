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

## 3. Status in v4.0
State that matters now lives in **Postgres** through Drizzle ORM (PGlite in development, Supabase in
production), with migrations in `src/server/db/migrations`. 21 tables: users, identities, sessions,
otp_codes, guardians, classes, class_enrollments, attendance_events, kv_store, audit_events,
engagement_samples, consents, transcript_lines, recordings, lecture_notes, polls, poll_votes, remarks,
**session_facts**, **session_learners**, **class_reviews**. Some hubs keep a hot in-memory copy and write
through. Full column list: `docs/LMD.md` §1.
