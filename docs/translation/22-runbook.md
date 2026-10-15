# 22 - Runbook

- **Captions stopped for everyone**: check `GET /api/stt/status` and that the Whisper server is up
  (`docker compose ps whisper`, and `WHISPER_URL` reachable from the app).
- **Local Whisper slow**: use a smaller model or more threads (`-t`), or move it to a GPU host.
- **Wrong caption language**: the speaker's language comes from their account (`languageTag`) or browser;
  fix it in the account.
- **Restart**: restarting the app service ends live STT streams; clients reconnect and continue.
