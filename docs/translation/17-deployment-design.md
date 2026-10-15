# 17 - Deployment Design

- Production: the school's own server, from `docker-compose.yml` (app, Postgres, Caddy). The `/stt`
  WebSocket needs a long-lived server process. See `docs/DEPLOY.md`.
- AI: `docker compose --profile ai up -d` starts Ollama and Whisper next to the app, reached with
  `OLLAMA_URL=http://ollama:11434` and `WHISPER_URL=http://whisper:8000`.
- Development: `npm run ai:models`, `npm run ai:ollama`, `npm run ai:whisper`.
