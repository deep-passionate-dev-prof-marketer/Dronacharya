# 02 - Current Audio Architecture

- **Media**: the school's own media server (SFU) carries class audio and video (peer-to-peer fallback when
  it's turned off). Captions and translation sit beside the media path and never change what it delivers.
- **Speech-to-text, one path, on the school's server**: an AudioWorklet downsamples the microphone to 16 kHz
  PCM16 and streams it over the `/stt` WebSocket (`src/services/translation/serverStt.ts`). The server
  (`src/server/sttHub.ts`) transcribes with the school's Whisper server (whisper.cpp, speaches or any
  OpenAI-compatible server) with energy-based voice-activity segmentation. The browser's own speech
  recognition is never used: it sends audio to the browser vendor.
- **Captions only when they should run**: not on the sign-in screen, not while muted, not before the class
  starts. The caption language follows the account or the browser, never a fixed default.
- **Text-to-speech** (optional dual audio): the browser's SpeechSynthesis in the listener's language.
- **Transcript**: final captions are stored as `transcript_lines`. They feed recordings, AI notes, "ask about
  this class" and class analytics (learner questions, teacher talk time).
