# 06 - High-Level Design (HLD)

```
Microphone ─▶ (browser STT) ─────────────────────────────┐
          └─▶ AudioWorklet 16 kHz ─▶ WS /stt ─▶ Gemini Live ┤ fails/quota ─▶ local Whisper (VAD segments)
                                                          ▼
                                   caption (speaker's language) ─▶ transcript_lines (server)
                                                          ▼
                     per-listener translation: terminology protector → cache → on-device semantic
                     dictionary → POST /api/ai/live-translate-stream (Gemini, dictionary fallback)
                                                          ▼
                                     subtitle overlay / transcript feed / optional TTS
```
