# Audio Pipeline Discovery & Architecture

## 1. End-to-End Audio Lifecycle
The audio pipeline in Dronacharya is engineered to prioritize original classroom audio authority while tapping uncompressed audio for zero-latency speech recognition and translation.

```text
Speaker (Teacher / Student)
  │
  ▼
Microphone Capture (navigator.mediaDevices.getUserMedia)
  │  echoCancellation: true, noiseSuppression: true, autoGainControl: true
  ├────────────────────────────────────────┬─────────────────────────────────────┐
  ▼                                        ▼                                     ▼
Original MediaStream Track           Web Audio API VAD                  Speech Recognition (STT)
(RTCPeerConnection audio track)      (AudioContext + AnalyserNode)      (speechTranslationEngine)
  │                                        │                                     │
  ▼                                        ▼                                     ▼
Peer WebRTC Mesh / SFU               RMS Level Telemetry (0-100%)       Streaming Transcript
  │                                        │                                     │
  ▼                                        ▼                                     ▼
Listener Audio Playback              UI Audio Meters / Glow             Semantic Chunker & Router
(Original Audio Stream)                                                          │
                                                                                 ▼
                                                                        Translation Engine
                                                                        (Self-Hosted Offline)
                                                                                 │
                                                                                 ▼
                                                                        Speech Synthesis (TTS)
                                                                        (SpeechSynthesisUtterance)
                                                                                 │
                                                                                 ▼
                                                                        Target Listener
                                                                        (Translated Audio Stream)
```

## 2. Ingress Point (Audio Tap)
- **File**: `src/services/translation/speechTranslationEngine.ts`
- **Mechanism**: The engine taps into the microphone via `navigator.mediaDevices.getUserMedia({ audio: true })` inside `startVad()` and attaches an `AudioContext` with an `AnalyserNode` (FFT size 256) to measure audio energy without disrupting the track sent to WebRTC.
- **Independence**: The speech engine runs as a consumer of audio frames. If VAD, STT, or Translation fails, the `MediaStreamTrack` streaming through `RTCPeerConnection` in `src/services/webRtcMeshService.ts` continues completely uninterrupted.

## 3. Egress Point (Audio Delivery & Dual Mixing)
- **File**: `src/services/translation/speechTranslationEngine.ts` (`speakTranslatedAudio`)
- **Mechanism**: Translated speech is rendered via `window.speechSynthesis.speak(utterance)`.
- **Dual Audio Ducking**: The user can configure `originalAudioVolume` (e.g. 20%) and `translatedAudioVolume` (e.g. 100%). When translated audio is active, listener clients maintain low background original audio while clearly hearing the translated voice.
- **Barge-In / Interruption**: If the speaker resumes or another participant interrupts, `stopSpeaking()` immediately invokes `window.speechSynthesis.cancel()` to clear obsolete audio buffers without playing stale audio.

## 4. Status in v4.0
- Class media now goes through **LiveKit** (SFU); the peer-to-peer mesh is the fallback when LiveKit isn't
  configured. The audio tap is unchanged: captions never touch the media track.
- A second STT path streams 16 kHz PCM16 from an AudioWorklet to the server (`/stt`: Gemini Live, then local
  Whisper), for browsers without Web Speech or when `STT_PREFER_SERVER=1`.
- Final captions are stored as `transcript_lines` and feed recordings, AI notes and class analytics.
