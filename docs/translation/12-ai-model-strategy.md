# 12 - AI Model Strategy

- **Order of preference** (`AI_PROVIDERS`, default `gemini,local`): Google Gemini first, the school's own
  servers as fallback. A provider that fails, times out or hits its quota is skipped for 2 minutes.
- **Speech-to-text**: Gemini Live (streaming) → local Whisper (`WHISPER_URL`, e.g. whisper.cpp
  `ggml-base` for testing, `small`/`medium` for production quality).
- **Translation**: on-device semantic dictionary and cache first; Gemini on the server for anything else.
- **Notes and answers** (not translation, but same providers): Gemini → Ollama (`OLLAMA_MODEL`, e.g.
  `qwen2.5:7b`; `3b` fits an 8 GB machine) → extractive.
- `local,gemini` or `local` keeps all speech and text on the school's servers.
