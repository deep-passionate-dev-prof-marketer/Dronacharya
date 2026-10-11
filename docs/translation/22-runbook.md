# 22 - Runbook

- **Captions stopped for everyone**: check `GET /api/stt/status`; if Gemini hit its quota, the local Whisper
  server takes over automatically (check `WHISPER_URL` is reachable). Browser captions keep working meanwhile.
- **Local Whisper slow**: use a smaller model or more threads (`-t`), or move it to a GPU host.
- **Wrong caption language**: the speaker's language comes from their account (`languageTag`) or browser;
  fix it in the account.
- **Restart**: restarting the app service ends live STT streams; clients reconnect and continue.
