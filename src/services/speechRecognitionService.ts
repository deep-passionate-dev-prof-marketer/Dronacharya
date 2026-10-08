/**
 * Dronacharya Real-Time Speech Recognition Engine
 * Unified with the Translation & Interpreter Pipeline.
 * Eliminates duplicate mic stream / Web Speech API conflicts.
 */

import { LanguageCode } from "../types";
import { speechTranslationEngine, SpeechUtteranceEvent } from "./translation/speechTranslationEngine";
import { realtimeInterpreterService } from "./translation/realtimeInterpreterService";
import { TranslationEngine } from "./translation/translationEngine";

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
  private listeners: Set<SpeechCallback> = new Set();
  private currentSpeaker = "You (Local Speaker)";
  private activeSourceLanguage = "hi";
  private activeTargetLanguage: LanguageCode = "es";

  constructor() {
    this.setupPipelineBridge();
  }

  private setupPipelineBridge() {
    // Listen to unified speech engine utterances
    speechTranslationEngine.subscribe(async (event: SpeechUtteranceEvent) => {
      let translated = event.text;
      if (event.isFinal && event.text.trim()) {
        try {
          const res = await TranslationEngine.translate(
            event.text,
            this.activeSourceLanguage,
            this.activeTargetLanguage,
            "general"
          );
          translated = res.translatedText;
        } catch {
          translated = event.text;
        }
      }

      this.emit({
        id: `speech-${Date.now()}`,
        speaker: event.speaker || this.currentSpeaker,
        text: event.text,
        isFinal: event.isFinal,
        translatedText: translated,
        targetLanguage: this.activeTargetLanguage,
        audioLevel: event.audioLevel || 80,
        timestamp: event.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
    });
  }

  public setTargetLanguage(lang: LanguageCode) {
    this.activeTargetLanguage = lang;
    realtimeInterpreterService.updatePreferences({
      targetTranslationLanguage: lang,
    });
  }

  public setSourceLanguage(lang: string) {
    this.activeSourceLanguage = lang.toLowerCase();
    speechTranslationEngine.setSpokenLanguage(this.activeSourceLanguage);
    realtimeInterpreterService.updatePreferences({
      mySpokenLanguage: this.activeSourceLanguage,
    });
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

  public async startListening(speaker = "You (Local Speaker)") {
    this.currentSpeaker = speaker;
    speechTranslationEngine.startListening(speaker);
  }

  public stopListening() {
    speechTranslationEngine.stopListening();
  }

  /**
   * Inject or dictate an utterance manually
   */
  public async injectSpeech(speaker: string, text: string, customTranslation?: string) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // 1. Emit live interim feedback
    this.emit({
      id: `live-interim-${Date.now()}`,
      speaker,
      text: cleanText,
      isFinal: false,
      targetLanguage: this.activeTargetLanguage,
      audioLevel: 75,
      timestamp: now,
    });

    // 2. Perform translation
    let translated = customTranslation;
    if (!translated) {
      try {
        const res = await TranslationEngine.translate(
          cleanText,
          this.activeSourceLanguage,
          this.activeTargetLanguage,
          "general"
        );
        translated = res.translatedText;
      } catch {
        translated = cleanText;
      }
    }

    // 3. Emit verified final event
    const finalEvent: SpeechCaptionEvent = {
      id: `live-speech-${Date.now()}`,
      speaker,
      text: cleanText,
      isFinal: true,
      translatedText: translated,
      targetLanguage: this.activeTargetLanguage,
      audioLevel: 90,
      timestamp: now,
    };

    this.emit(finalEvent);

    // 4. Play audio synthesis if translation is active
    speechTranslationEngine.speakTranslatedAudio(
      translated,
      this.activeTargetLanguage,
      1.0
    );
  }

  public getIsListening(): boolean {
    return speechTranslationEngine.getIsListening();
  }

  public getIsNativeMicActive(): boolean {
    return speechTranslationEngine.getIsListening();
  }

  public getCurrentSpeaker(): string {
    return this.currentSpeaker;
  }

  public setCurrentSpeaker(speaker: string) {
    this.currentSpeaker = speaker;
  }
}

export const realtimeSpeechEngine = new RealtimeSpeechRecognitionEngine();
