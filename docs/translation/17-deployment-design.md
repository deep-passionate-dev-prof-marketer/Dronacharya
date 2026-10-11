# 17 - Deployment Design

- Production: the Node server (`server.ts`) in Docker / Render / Railway / Fly, with Supabase Postgres.
  The `/stt` WebSocket needs a long-lived server process, so serverless platforms can't host it.
- Optional local AI host: `docker-compose.ai.yml` (Ollama + whisper.cpp), reached with `OLLAMA_URL` and
  `WHISPER_URL`.
- Development: `npm run ai:models`, `npm run ai:ollama`, `npm run ai:whisper`.
