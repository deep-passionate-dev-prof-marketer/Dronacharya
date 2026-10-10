/**
 * Dronacharya Speech-to-Text (STT) and Text-to-Speech (TTS) Audio Pipeline
 * Standalone Audio Layer decoupled from conferencing logic:
 * - VAD (Voice Activity Detection via Web Audio RMS analysis)
 * - Multilingual Speech Recognition with dynamic BCP-47 locale switching
 * - Streaming Partial & Final Transcript processing
 * - Multilingual Neural Speech Synthesis (TTS) with voice auto-matching
 * - Dual Audio ducking/volume balance
 */

import { ServerStt, serverSttAvailable, serverSttStatus } from "./serverStt";
import { getLanguageBcp47 } from "./languageConfig";

export interface SpeechUtteranceEvent {
  text: string;
  isFinal: boolean;
  speaker: string;
  detectedLanguage?: string;
  audioLevel: number;
  timestamp: string;
}

export type UtteranceCallback = (event: SpeechUtteranceEvent) => void;

/** What the caption engine is doing right now, shown on the CC button. */
export type CaptionHealth =
  | { state: "off" }
  | { state: "listening"; via?: "browser" | "server" }
  | { state: "recovering"; reason: string }
  | { state: "unsupported"; reason: string }
  | { state: "blocked"; reason: string };

/** Best guess at the speaker's language from the browser, instead of assuming Hindi. */
export function defaultSpokenLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  return (navigator.language || "en").split("-")[0].toLowerCase();
}

class RealtimeSpeechAndTtsEngine {
  // Speech Recognition (STT)
  private recognition: any = null;
  private isListening: boolean = false;
  private currentSpokenLanguage: string = defaultSpokenLanguage();
  private health: CaptionHealth = { state: "off" };
  private healthListeners: Set<(h: CaptionHealth) => void> = new Set();
  private retryDelayMs = 300;
  private lastResultAt = 0;
  private watchdog: any = null;
  /** The class microphone track, shared so we never open a second capture (which mutes the call on mobile) */
  private sharedMic: MediaStream | null = null;
  private currentSpeaker: string = "Teacher";
  private listeners: Set<UtteranceCallback> = new Set();
  private restartTimer: any = null;
  private isSupported: boolean = false;
  /** Server transcription (Firefox/Safari, or when browser captions keep failing) */
  private serverStt: ServerStt | null = null;
  private usingServer = false;
  private recoveringSince: number | null = null;
  private static readonly SERVER_FALLBACK_AFTER_MS = 20_000;

  // Voice Activity Detection (VAD)
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private vadInterval: any = null;
  private currentAudioLevel: number = 0;
  private vadThreshold: number = 8; // RMS sensitivity threshold

  // Speech Synthesis (TTS)
  private isTtsEnabled: boolean = true;
  private ttsVolume: number = 1.0; // 0.0 to 1.0
  private ttsRate: number = 1.0;
  private ttsQueue: SpeechSynthesisUtterance[] = [];
  private isSpeaking: boolean = false;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initRecognition();
    this.initTtsVoices();
    this.bindAutoplayUnlock();
  }

  private bindAutoplayUnlock() {
    if (typeof window === "undefined") return;
    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener("click", unlockHandler);
      window.removeEventListener("touchstart", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
    };
    window.addEventListener("click", unlockHandler, { once: true, passive: true });
    window.addEventListener("touchstart", unlockHandler, { once: true, passive: true });
    window.addEventListener("keydown", unlockHandler, { once: true, passive: true });
  }

  public unlockAudio() {
    if (typeof window === "undefined") return;
    if ("speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Micro-utterance to prime the audio pipeline for WebKit / Safari
        const silent = new SpeechSynthesisUtterance(" ");
        silent.volume = 0;
        silent.rate = 10;
        window.speechSynthesis.speak(silent);
      } catch {}
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  private initTtsVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        this.availableVoices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  private initRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.isSupported = false;
      this.health = { state: "unsupported", reason: "This browser can't produce captions (use Chrome or Edge). You'll still see captions from other speakers." };
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = getLanguageBcp47(this.currentSpokenLanguage);
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += trans;
          } else {
            interimText += trans;
          }
        }

        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        if (finalText.trim()) {
          this.emit({
            text: finalText.trim(),
            isFinal: true,
            speaker: this.currentSpeaker,
            detectedLanguage: this.currentSpokenLanguage,
            audioLevel: Math.max(this.currentAudioLevel, 80),
            timestamp: now,
          });
        } else if (interimText.trim()) {
          this.emit({
            text: interimText.trim(),
            isFinal: false,
            speaker: this.currentSpeaker,
            detectedLanguage: this.currentSpokenLanguage,
            audioLevel: Math.max(this.currentAudioLevel, 50),
            timestamp: now,
          });
        }
      };

      rec.onstart = () => {
        this.retryDelayMs = 300;
        this.lastResultAt = Date.now();
        this.setHealth({ state: "listening" });
      };

      rec.onerror = (event: any) => {
        switch (event.error) {
          case "no-speech":
          case "aborted":
            return; // silence or our own restart; onend handles it
          case "not-allowed":
          case "service-not-allowed":
            // Keep the user's intent; the UI offers a retry once permission is granted
            this.setHealth({ state: "blocked", reason: "Microphone permission is blocked for captions." });
            this.retryDelayMs = 5000;
            return;
          case "network":
            this.retryDelayMs = Math.min(this.retryDelayMs * 2, 8000);
            this.setHealth({ state: "recovering", reason: "Caption service unreachable, retrying…" });
            return;
          case "audio-capture":
            this.retryDelayMs = 1500;
            this.setHealth({ state: "recovering", reason: "Microphone busy, retrying…" });
            return;
          case "language-not-supported":
            this.setHealth({ state: "unsupported", reason: `Captions don't support ${this.currentSpokenLanguage} in this browser.` });
            this.isListening = false;
            return;
          default:
            console.warn("[STT Engine] Recognition event:", event.error);
        }
      };

      rec.onresult = ((orig) => (event: any) => {
        if (this.usingServer) return;
        this.lastResultAt = Date.now();
        if (this.health.state !== "listening") this.setHealth({ state: "listening" });
        orig(event);
      })(rec.onresult);

      // Chrome ends continuous recognition every ~60s and after errors: restart transparently
      rec.onend = () => {
        if (this.isListening && !this.usingServer) {
          this.scheduleRestart();
        }
      };

      this.recognition = rec;
      this.isSupported = true;
    } catch (e) {
      console.warn("[STT Engine] Init error:", e);
      this.isSupported = false;
    }
  }

  private setHealth(h: CaptionHealth) {
    if (h.state === "recovering") this.recoveringSince = this.recoveringSince ?? Date.now();
    else this.recoveringSince = null;
    this.health = h;
    this.healthListeners.forEach((l) => l(h));
  }

  public getHealth(): CaptionHealth {
    return this.isListening || this.health.state === "unsupported" ? this.health : { state: "off" };
  }

  public subscribeHealth(l: (h: CaptionHealth) => void): () => void {
    this.healthListeners.add(l);
    l(this.getHealth());
    return () => {
      this.healthListeners.delete(l);
    };
  }

  /** Reuse the classroom mic for voice-activity detection instead of opening another capture. */
  public setSharedMicStream(stream: MediaStream | null) {
    if (stream && stream.getAudioTracks().length) {
      const changed = this.sharedMic !== stream;
      this.sharedMic = stream;
      if (this.isListening) {
        this.stopVad();
        this.startVad();
        // Server captions follow the class mic (it may arrive after captions were turned on)
        if (changed && (this.usingServer || !this.isSupported)) {
          this.stopServerStt();
          this.startServerStt();
        }
      }
    }
  }

  private scheduleRestart() {
    clearTimeout(this.restartTimer);
    const delay = this.retryDelayMs;
    this.restartTimer = setTimeout(() => {
      if (this.isListening && this.recognition && !this.usingServer) {
        try {
          this.recognition.lang = getLanguageBcp47(this.currentSpokenLanguage);
          this.recognition.start();
        } catch (e: any) {
          if (e?.name !== "InvalidStateError") {
            this.restartTimer = setTimeout(() => this.scheduleRestart(), 1000);
          }
        }
      }
    }, delay);
  }

  /** Interpreter on/off: whether translated captions are also spoken aloud. */
  public setTtsEnabled(enabled: boolean) {
    this.isTtsEnabled = enabled;
    if (!enabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public setSpokenLanguage(langCode: string) {
    this.currentSpokenLanguage = langCode.toLowerCase();
    if (this.usingServer && this.isListening) {
      this.stopServerStt();
      this.startServerStt();
    }
    if (this.recognition) {
      this.recognition.lang = getLanguageBcp47(this.currentSpokenLanguage);
      if (this.isListening) {
        // Restart with new language locale
        try {
          this.recognition.stop();
        } catch {}
      }
    }
  }

  public startListening(speaker: string = "Teacher") {
    this.currentSpeaker = speaker;
    if (!this.isSupported) {
      // No speech engine in this browser: transcribe on the server instead (when it's set up)
      if (this.isListening) return;
      this.isListening = true;
      this.startVad();
      this.startServerStt();
      return;
    }
    // Idempotent: several UI paths ask to start; only one recognizer may run at a time
    if (this.isListening) return;
    this.isListening = true;
    // The school may require all speech to be transcribed on its own servers
    serverSttStatus().then((st) => {
      if (st.preferServer && this.isListening && !this.usingServer) this.startServerStt();
    });
    this.retryDelayMs = 300;
    this.setHealth({ state: "recovering", reason: "Starting captions…" });
    this.startVad();
    this.startWatchdog();

    if (this.recognition && this.isSupported) {
      try {
        this.recognition.lang = getLanguageBcp47(this.currentSpokenLanguage);
        this.recognition.start();
      } catch (e: any) {
        if (e?.name !== "InvalidStateError") {
          this.scheduleRestart();
        }
      }
    }
  }

  public stopListening() {
    this.isListening = false;
    clearTimeout(this.restartTimer);
    clearInterval(this.watchdog);
    this.stopVad();
    this.stopServerStt();
    this.setHealth({ state: "off" });

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  private async startServerStt() {
    if (this.serverStt || !this.isListening) return;
    const available = await serverSttAvailable();
    if (!this.isListening || this.serverStt) return;
    if (!available) {
      if (!this.isSupported) {
        this.setHealth({ state: "unsupported", reason: "This browser can't make captions, and server captions aren't set up. You'll still see captions from other speakers." });
      }
      return; // browser captions keep retrying on their own
    }
    if (!this.sharedMic) {
      this.setHealth({ state: "recovering", reason: "Waiting for your microphone…" });
      return; // setSharedMicStream starts it when the mic arrives
    }
    this.usingServer = true;
    try {
      this.recognition?.abort();
    } catch {}
    this.setHealth({ state: "recovering", reason: "Starting server captions…" });
    const lang = getLanguageBcp47(this.currentSpokenLanguage);
    const stt = new ServerStt(this.sharedMic, lang, {
      onReady: () => this.setHealth({ state: "listening", via: "server" }),
      onInterim: (text) => this.emitServer(text, false),
      onFinal: (text) => this.emitServer(text, true),
      onError: (message) => this.setHealth({ state: "recovering", reason: message }),
    });
    this.serverStt = stt;
    try {
      await stt.start();
    } catch (err) {
      console.warn("[STT Engine] server captions failed to start:", err);
      this.stopServerStt();
      this.setHealth({ state: "unsupported", reason: "Captions couldn't start on this device." });
    }
  }

  private stopServerStt() {
    this.serverStt?.stop();
    this.serverStt = null;
    this.usingServer = false;
  }

  private emitServer(text: string, isFinal: boolean) {
    if (!this.usingServer || !text.trim()) return;
    if (this.health.state !== "listening") this.setHealth({ state: "listening", via: "server" });
    this.emit({
      text: text.trim(),
      isFinal,
      speaker: this.currentSpeaker,
      detectedLanguage: this.currentSpokenLanguage,
      audioLevel: Math.max(this.currentAudioLevel, isFinal ? 80 : 50),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
  }

  /** Someone is talking but recognition has produced nothing for 8s: it silently stalled, restart it. */
  private startWatchdog() {
    clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (!this.isListening || !this.recognition || this.usingServer) return;
      // Browser captions have been failing for a while: move to server transcription
      if (this.recoveringSince && Date.now() - this.recoveringSince > RealtimeSpeechAndTtsEngine.SERVER_FALLBACK_AFTER_MS && this.sharedMic) {
        this.startServerStt();
        return;
      }
      const quietFor = Date.now() - this.lastResultAt;
      if (this.currentAudioLevel > this.vadThreshold && quietFor > 8000) {
        this.lastResultAt = Date.now();
        this.setHealth({ state: "recovering", reason: "Reconnecting captions…" });
        try {
          this.recognition.abort();
        } catch {}
      }
    }, 2000);
  }

  // Voice Activity Detection (VAD) Implementation
  private async startVad() {
    if (typeof window === "undefined" || this.analyser) return;

    try {
      // Only use the classroom's own mic stream; a second getUserMedia can mute the call on phones
      this.micStream = this.sharedMic;

      if (this.micStream) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.micStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        clearInterval(this.vadInterval);
        this.vadInterval = setInterval(() => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          this.currentAudioLevel = Math.round((avg / 255) * 100);
        }, 100);
      }
    } catch (err) {
      console.warn("[VAD] Failed to initialize hardware audio analysis:", err);
    }
  }

  private stopVad() {
    clearInterval(this.vadInterval);
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.currentAudioLevel = 0;
  }

  // Text-to-Speech (TTS) Synthesis
  public speakTranslatedAudio(
    text: string,
    targetLanguageCode: string,
    volume: number = 1.0,
    rate: number = 1.0
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return resolve();
      }

      if (!this.isTtsEnabled || volume <= 0 || !text.trim()) {
        return resolve();
      }

      // Ensure voices are freshly fetched and synth is not paused
      if (this.availableVoices.length === 0) {
        this.availableVoices = window.speechSynthesis.getVoices();
      }
      if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch {}
      }

      // Stop any prior overlapping speech to maintain fluid conversational cadence
      try {
        window.speechSynthesis.cancel();
      } catch {}

      const utterance = new SpeechSynthesisUtterance(text.trim());
      const bcp47 = getLanguageBcp47(targetLanguageCode);
      utterance.lang = bcp47;
      utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.rate = Math.max(0.7, Math.min(1.4, rate));

      // Resolve voice matching the target language
      const targetPrefix = targetLanguageCode.toLowerCase();
      const matchedVoice = this.availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(targetPrefix) ||
          v.lang.toLowerCase() === bcp47.toLowerCase()
      );

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      // Chromium timer workaround: ensure speech synthesis is never stalled mid-speech
      const keepAliveTimer = setInterval(() => {
        if (!this.isSpeaking) {
          clearInterval(keepAliveTimer);
        } else if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.paused) {
          try { window.speechSynthesis.resume(); } catch {}
        }
      }, 5000);

      utterance.onend = () => {
        clearInterval(keepAliveTimer);
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (err) => {
        clearInterval(keepAliveTimer);
        console.warn("[TTS Engine] Synthesis event error:", err);
        this.isSpeaking = false;
        resolve();
      };

      this.isSpeaking = true;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (speakErr) {
        clearInterval(keepAliveTimer);
        console.warn("[TTS Engine] Speak call error:", speakErr);
        resolve();
      }
    });
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isSpeaking = false;
  }

  // Subscription interface
  public subscribe(callback: UtteranceCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public injectUtterance(event: SpeechUtteranceEvent) {
    this.emit(event);
  }

  private emit(event: SpeechUtteranceEvent) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error("[STT Engine] Callback error:", err);
      }
    });
  }

  public getAudioLevel(): number {
    return this.currentAudioLevel;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getSpokenLanguage(): string {
    return this.currentSpokenLanguage;
  }
}

export const speechTranslationEngine = new RealtimeSpeechAndTtsEngine();
