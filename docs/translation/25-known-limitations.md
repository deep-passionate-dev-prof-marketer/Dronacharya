# 25 - Known Limitations

- Captions need the school's Whisper server; without it, captions are off.
- The on-device dictionary covers common classroom language; everything else goes to the school's language
  model, so without one, rare phrases may stay untranslated (the original text is shown).
- Local Whisper `base` is fine for testing; accuracy for accented or mixed-language speech needs `small` or
  larger.
- Simulated "test phrase" caption buttons exist only in development builds.
