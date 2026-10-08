import { LanguageCode } from "../types";
import { translateDualCaption } from "./geminiService";

export interface SpeechCaptionEvent {
  id: string;
  speaker: string;
  text: string;
  isFinal: boolean;
  translatedText?: string;
  targetLanguage: LanguageCode;
  audioLevel: number;
  timestamp: string;
}

export type SpeechCallback = (event: SpeechCaptionEvent) => void;

class RealtimeSpeechRecognitionEngine {
  private recognition: any = null;
  private isListening = false;
  private isNativeMicActive = false;
  private isSupported = false;
  private listeners: Set<SpeechCallback> = new Set();
  private restartTimeout: any = null;
  private currentSpeaker = "You (Local Speaker)";
  private activeTargetLanguage: LanguageCode = "es";
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isPermissionGranted = false;

  constructor() {
    this.initNativeSpeechRecognition();
  }

  private initNativeSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.maxAlternatives = 1;

        rec.onresult = async (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

          if (final.trim()) {
            const text = final.trim();
            let translated = text;
            try {
              const res = await translateDualCaption(text, this.activeTargetLanguage, this.currentSpeaker);
              translated = res.translatedText;
            } catch {
              translated = text;
            }

            this.emit({
              id: `speech-${Date.now()}`,
              speaker: this.currentSpeaker,
              text,
              isFinal: true,
              translatedText: translated,
              targetLanguage: this.activeTargetLanguage,
              audioLevel: 85,
              timestamp: now,
            });
          } else if (interim.trim()) {
            this.emit({
              id: `interim-${Date.now()}`,
              speaker: this.currentSpeaker,
              text: interim.trim(),
              isFinal: false,
              targetLanguage: this.activeTargetLanguage,
              audioLevel: 60,
              timestamp: now,
            });
          }
        };

        rec.onerror = (event: any) => {
          // "no-speech" is a normal silence event in Web Speech API - do not stop listening
          if (event.error === "no-speech") {
            return;
          }
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            console.warn("[SpeechRecognition] Microphone permission denied:", event.error);
            this.isNativeMicActive = false;
            return;
          }
          console.warn("[SpeechRecognition] Native recognition event:", event.error);
        };

        rec.onend = () => {
          this.isNativeMicActive = false;
          if (this.isListening) {
            this.scheduleRestart();
          }
        };

        this.recognition = rec;
        this.isSupported = true;
      } catch (err) {
        console.warn("[SpeechRecognition] SpeechRecognition initialization:", err);
        this.isSupported = false;
      }
    }
  }

  private scheduleRestart() {
    clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (this.isListening && this.recognition) {
        try {
          this.recognition.start();
          this.isNativeMicActive = true;
        } catch (e: any) {
          // If already started or transitioning, retry cleanly
          if (e?.name !== "InvalidStateError") {
            this.restartTimeout = setTimeout(() => this.scheduleRestart(), 1000);
          }
        }
      }
    }, 400);
  }

  public setTargetLanguage(lang: LanguageCode) {
    this.activeTargetLanguage = lang;
  }

  public subscribe(callback: SpeechCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: SpeechCaptionEvent) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        console.error("[SpeechRecognition] Subscriber error:", e);
      }
    });
  }

  /**
   * Start live speech recognition using real microphone hardware.
   */
  public async startListening(speaker = "You (Local Speaker)") {
    this.currentSpeaker = speaker;
    this.isListening = true;

    // Request actual microphone hardware permission if available
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (!this.audioStream) {
          this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.isPermissionGranted = true;
        }
      } catch (micErr) {
        console.warn("[SpeechRecognition] Microphone access prompt:", micErr);
      }
    }

    // Start native Web Speech recognition
    if (this.recognition && this.isSupported) {
      try {
        this.recognition.start();
        this.isNativeMicActive = true;
      } catch (startErr: any) {
        if (startErr?.name !== "InvalidStateError") {
          this.scheduleRestart();
        }
      }
    }
  }

  public stopListening() {
    this.isListening = false;
    this.isNativeMicActive = false;
    clearTimeout(this.restartTimeout);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  /**
   * Broadcast an authentic real-time utterance (from mic dictation or user input).
   * Fully real-time with Google AI dual language translation.
   */
  public async injectSpeech(speaker: string, englishText: string, customTranslation?: string) {
    if (!englishText || !englishText.trim()) return;
    const cleanText = englishText.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // 1. Emit live typing/interim feedback
    this.emit({
      id: `live-interim-${Date.now()}`,
      speaker,
      text: cleanText,
      isFinal: false,
      targetLanguage: this.activeTargetLanguage,
      audioLevel: 75,
      timestamp,
    });

    let translated = customTranslation;
    if (!translated) {
      try {
        const res = await translateDualCaption(cleanText, this.activeTargetLanguage, speaker);
        translated = res.translatedText;
      } catch {
        translated = cleanText;
      }
    }

    // 2. Emit final verified utterance
    this.emit({
      id: `live-speech-${Date.now()}`,
      speaker,
      text: cleanText,
      isFinal: true,
      translatedText: translated,
      targetLanguage: this.activeTargetLanguage,
      audioLevel: 90,
      timestamp,
    });
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsNativeMicActive(): boolean {
    return this.isNativeMicActive;
  }

  public getCurrentSpeaker(): string {
    return this.currentSpeaker;
  }

  public setCurrentSpeaker(speaker: string) {
    this.currentSpeaker = speaker;
  }
}

export const realtimeSpeechEngine = new RealtimeSpeechRecognitionEngine();
