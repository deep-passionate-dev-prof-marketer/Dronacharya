# 02 - Current Audio Architecture

- **Microphone Ingress**: Browser `getUserMedia` with echo cancellation and noise suppression.
- **Speech-to-Text**: Browser-native Web Speech Recognition API with dynamic BCP-47 locale switching (`speechTranslationEngine.ts`).
- **Text-to-Speech**: Browser-native SpeechSynthesis API with target language voice matching and Chromium keepalive timer.
- **Audio Routing**: Decoupled WebRTC mesh audio + optional dual audio synthesized playback (`speechTranslationEngine.ts`).
