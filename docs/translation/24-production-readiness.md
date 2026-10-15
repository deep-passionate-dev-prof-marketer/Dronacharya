# 24 - Production Readiness

- [x] Server STT on the school's Whisper server, tested end to end; browser speech recognition never used.
- [x] No third-party translation or speech endpoints: the school's language model or the on-device dictionary only.
- [x] Captions gated (not before sign-in, not while muted, not before class).
- [x] Same-origin and signed-in checks on `/stt`; parents refused.
- [x] Autoplay unlock and dual-audio balance in the interpreter settings.
- [ ] Choose the production Whisper model size and host (CPU vs GPU) from a load test.
