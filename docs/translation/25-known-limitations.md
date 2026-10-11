# 25 - Known Limitations

- Browser speech recognition needs microphone permission and isn't available in every browser; those
  learners use server captions.
- The on-device dictionary covers common classroom language; everything else goes to Gemini, so with no
  AI configured, rare phrases may stay untranslated (the original text is shown).
- Local Whisper `base` is fine for testing; accuracy for accented or mixed-language speech needs `small` or
  larger.
- Simulated "test phrase" caption buttons exist only in development builds.
