# 12 - AI Model Strategy

All AI runs on the school's own servers. Nothing is sent to an outside AI service.

- **Speech-to-text**: the school's Whisper server (`WHISPER_URL`; e.g. whisper.cpp `ggml-base` for testing,
  `small`/`medium` or speaches `Systran/faster-whisper-small` for production quality).
- **Translation**: on-device semantic dictionary and cache first; the school's language model (Ollama) on
  the server for anything else.
- **Notes and answers** (not translation, but the same server): Ollama (`OLLAMA_MODEL`, e.g. `qwen2.5:7b`;
  `3b` fits an 8 GB machine) → extractive notes and transcript quotes without it.
- A server that fails or times out is skipped for 2 minutes, so classes never wait on it.
