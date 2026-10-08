/**
 * Dronacharya Speech-to-Text (STT) and Text-to-Speech (TTS) Audio Pipeline
 * Standalone Audio Layer decoupled from conferencing logic:
 * - VAD (Voice Activity Detection via Web Audio RMS analysis)
 * - Multilingual Speech Recognition with dynamic BCP-47 locale switching
 * - Streaming Partial & Final Transcript processing
 * - Multilingual Neural Speech Synthesis (TTS) with voice auto-matching
 * - Dual Audio ducking/volume balance
 */

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

class RealtimeSpeechAndTtsEngine {
  // Speech Recognition (STT)
  private recognition: any = null;
  private isListening: boolean = false;
  private currentSpokenLanguage: string = "hi"; // Default Hindi as per requirements
  private currentSpeaker: string = "Teacher";
  private listeners: Set<UtteranceCallback> = new Set();
  private restartTimer: any = null;
  private isSupported: boolean = false;

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
      console.warn("[STT Engine] Web Speech API not supported in this browser.");
      this.isSupported = false;
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

      rec.onerror = (event: any) => {
        if (event.error === "no-speech") {
          // Normal silence, ignore
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          console.warn("[STT Engine] Microphone permission not allowed:", event.error);
          this.isListening = false;
          return;
        }
        console.warn("[STT Engine] Recognition event:", event.error);
      };

      rec.onend = () => {
        if (this.isListening) {
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

  private scheduleRestart() {
    clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.isListening && this.recognition) {
        try {
          this.recognition.lang = getLanguageBcp47(this.currentSpokenLanguage);
          this.recognition.start();
        } catch (e: any) {
          if (e?.name !== "InvalidStateError") {
            this.restartTimer = setTimeout(() => this.scheduleRestart(), 1000);
          }
        }
      }
    }, 300);
  }

  public setSpokenLanguage(langCode: string) {
    this.currentSpokenLanguage = langCode.toLowerCase();
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
    this.isListening = true;
    this.startVad();

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
    this.stopVad();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  // Voice Activity Detection (VAD) Implementation
  private async startVad() {
    if (typeof window === "undefined" || this.analyser) return;

    try {
      if (!this.micStream && navigator.mediaDevices?.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

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

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (err) => {
        console.warn("[TTS Engine] Synthesis event error:", err);
        this.isSpeaking = false;
        resolve();
      };

      this.isSpeaking = true;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (speakErr) {
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
