# 16 - Privacy Design

- Raw audio is processed in memory and not stored. Server STT streams are tied to a signed-in session and
  dropped when the class or the socket ends.
- All audio and text stay on the school's servers. The browser's speech recognition (which sends audio to
  the browser vendor) is never used, and only on-device text-to-speech voices are offered.
- Transcripts are class records (used for recordings, notes and analytics) and follow the class's access
  rules: teachers of the class, learners in it, auditors and admins.
- Recordings are transcripts. Learners without recording consent still see live captions.
