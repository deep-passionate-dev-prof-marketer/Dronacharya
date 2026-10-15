# 06 - High-Level Design (HLD)

```
Microphone ─▶ AudioWorklet 16 kHz ─▶ WS /stt ─▶ the school's Whisper server (VAD segments)
                                                          │
                                                          ▼
                                   caption (speaker's language) ─▶ transcript_lines (server)
                                                          ▼
                     per-listener translation: terminology protector → cache → on-device semantic
                     dictionary → POST /api/ai/live-translate-stream (the school's language model)
                                                          ▼
                                     subtitle overlay / transcript feed / optional TTS
```
