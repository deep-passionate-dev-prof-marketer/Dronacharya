# 02 - Current Audio Architecture

- **Media**: LiveKit carries class audio and video (peer-to-peer fallback when LiveKit isn't configured).
  Captions and translation sit beside the media path and never change what LiveKit delivers.
- **Speech-to-text, two paths**
  - *Browser*: Web Speech recognition in the speaker's language (Chromium-based browsers).
  - *Server*: an AudioWorklet downsamples the microphone to 16 kHz PCM16 and streams it over the `/stt`
    WebSocket (`src/services/translation/serverStt.ts`). The server (`src/server/sttHub.ts`) transcribes with
    Gemini Live, and fails over mid-class to a local Whisper server (whisper.cpp or any OpenAI-compatible
    server) with energy-based voice-activity segmentation. Used for Firefox/Safari, or for everyone when
    `STT_PREFER_SERVER=1`.
- **Captions only when they should run**: not on the sign-in screen, not while muted, not before the class
  starts. The caption language follows the account or the browser, never a fixed default.
- **Text-to-speech** (optional dual audio): the browser's SpeechSynthesis in the listener's language.
- **Transcript**: final captions are stored as `transcript_lines`. They feed recordings, AI notes, "ask about
  this class" and class analytics (learner questions, teacher talk time).
