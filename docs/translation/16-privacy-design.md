# 16 - Privacy Design

- Raw audio is processed in memory and not stored. Server STT streams are tied to a signed-in session and
  dropped when the class or the socket ends.
- Browser speech recognition may send audio to the browser vendor (Google/Microsoft); set
  `STT_PREFER_SERVER=1` and `AI_PROVIDERS=local` to keep all audio on the school's servers.
- Transcripts are class records (used for recordings, notes and analytics) and follow the class's access
  rules: teachers of the class, learners in it, auditors and admins.
- Learners without recording consent are left out of the video recording; their captions still appear live.
