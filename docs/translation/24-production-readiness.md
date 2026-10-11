# 24 - Production Readiness

- [x] Server STT with provider failover (Gemini Live → local Whisper), tested end to end.
- [x] No third-party translation endpoints (MyMemory removed); Gemini or on-device dictionary only.
- [x] Captions gated (not before sign-in, not while muted, not before class).
- [x] Same-origin and signed-in checks on `/stt`; parents refused.
- [x] Autoplay unlock and dual-audio balance in the interpreter settings.
- [ ] Choose the production Whisper model size and host (CPU vs GPU) from a load test.
