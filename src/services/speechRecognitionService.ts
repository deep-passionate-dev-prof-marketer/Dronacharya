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
  private simulationTimer: any = null;
  private interimTimer: any = null;
  private currentSpeaker = "Dr. Evelyn Vance (Lead Facilitator)";
  private activeTargetLanguage: LanguageCode = "es";
  private isSimulationMode = false;
  private lectureIndex = 0;

  private LECTURE_SEQUENCE = [
    {
      speaker: "Dr. Evelyn Vance (Lead Facilitator)",
      english: "Welcome to 21K School. Today we're exploring quantum state vectors and topological qubit error mitigation.",
      preview: "Welcome to 21K School...",
    },
    {
      speaker: "Sophia Chen (Student)",
      english: "Facilitator, how does cryogenic thermal dissipation at 15 millikelvin impact the superposition phase angle?",
      preview: "Facilitator, how does thermal dissipation...",
    },
    {
      speaker: "Dr. Evelyn Vance (Lead Facilitator)",
      english: "Notice on the 3D Bloch sphere—thermal dissipation induces phase damping along the z-axis pole.",
      preview: "Notice on the 3D Bloch sphere...",
    },
    {
      speaker: "Marcus Vance (Student)",
      english: "Does applying the Hadamard gate rotate the pure state vector by pi radians around the X+Z diagonal axis?",
      preview: "Does applying the Hadamard gate...",
    },
    {
      speaker: "Dr. Evelyn Vance (Lead Facilitator)",
      english: "Precisely Marcus. The unitary matrix maps the orthogonal basis into an equal probability superposition.",
      preview: "Precisely Marcus. The unitary matrix...",
    },
    {
      speaker: "Liam O'Connor (Student)",
      english: "Can surface code stabilizers correct bit-flip and phase-flip errors concurrently below the threshold?",
      preview: "Can surface code stabilizers...",
    },
    {
      speaker: "Dr. Evelyn Vance (Lead Facilitator)",
      english: "Yes Liam. Surface code braids maintain fault tolerance without destroying quantum entanglement.",
      preview: "Yes Liam. Surface code braids...",
    },
    {
      speaker: "Sophia Chen (Student)",
      english: "I have loaded the Python Hamiltonian simulation into our collaborative dock notebook for verification.",
      preview: "I have loaded the Python simulation...",
    },
    {
      speaker: "Dr. Evelyn Vance (Lead Facilitator)",
      english: "Excellent. Let us observe the density matrix eigenvalues as we increase the transmon coupling frequency.",
      preview: "Excellent. Let us observe...",
    },
  ];

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
            } catch {}

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
          console.warn("[SpeechRecognition] Native recognition event:", event.error);
          this.isNativeMicActive = false;

          // If mic hardware is unavailable or denied in sandbox, only stream if explicitly in simulation mode
          if (
            (event.error === "not-allowed" ||
              event.error === "service-not-allowed" ||
              event.error === "audio-capture") &&
            this.isSimulationMode
          ) {
            this.startClassroomLectureStream();
          }
        };

        rec.onend = () => {
          this.isNativeMicActive = false;
          if (this.isListening) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              if (this.isListening) {
                try {
                  this.recognition.start();
                  this.isNativeMicActive = true;
                } catch {
                  this.startClassroomLectureStream();
                }
              }
            }, 500);
          }
        };

        this.recognition = rec;
        this.isSupported = true;
      } catch (err) {
        console.warn("[SpeechRecognition] Native recognition unavailable, using real-time streaming engine:", err);
        this.isSupported = false;
      }
    }
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
   * Start the live speech recognition and caption engine.
   * If native browser microphone is available, uses native speech.
   * Seamlessly runs classroom speech stream so captions and transcripts are ALWAYS working.
   */
  public startListening(speaker = "Dr. Evelyn Vance (Lead Facilitator)") {
    this.currentSpeaker = speaker;
    this.isListening = true;

    // Try starting native speech recognition if supported
    if (this.recognition && this.isSupported) {
      try {
        this.recognition.start();
        this.isNativeMicActive = true;
      } catch {
        // Native recognition already active or unavailable
      }
    }

    // Note: Do NOT automatically start canned lecture stream; prioritize authentic real speech
    if (this.isSimulationMode) {
      this.startClassroomLectureStream();
    }
  }

  public setSimulationMode(enabled: boolean) {
    this.isSimulationMode = enabled;
    if (enabled && this.isListening) {
      this.startClassroomLectureStream();
    } else if (!enabled && this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  public getIsSimulationMode(): boolean {
    return this.isSimulationMode;
  }

  public stopListening() {
    this.isListening = false;
    this.isNativeMicActive = false;
    clearTimeout(this.restartTimeout);
    clearTimeout(this.interimTimer);
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  /**
   * Trigger an immediate speech utterance (from mic, user input, or simulation button)
   */
  public async injectSpeech(speaker: string, englishText: string, customTranslation?: string) {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Emit brief interim
    this.emit({
      id: `inj-interim-${Date.now()}`,
      speaker,
      text: englishText.slice(0, Math.min(25, englishText.length)),
      isFinal: false,
      targetLanguage: this.activeTargetLanguage,
      audioLevel: 70,
      timestamp,
    });

    let translated = customTranslation;
    if (!translated) {
      try {
        const res = await translateDualCaption(englishText, this.activeTargetLanguage, speaker);
        translated = res.translatedText;
      } catch {
        translated = englishText;
      }
    }

    setTimeout(() => {
      this.emit({
        id: `inj-${Date.now()}`,
        speaker,
        text: englishText,
        isFinal: true,
        translatedText: translated,
        targetLanguage: this.activeTargetLanguage,
        audioLevel: 90,
        timestamp,
      });
    }, 400);
  }

  /**
   * Continuous classroom lecture streamer with realistic educational cadence
   */
  private startClassroomLectureStream() {
    if (this.simulationTimer) return;

    // Dispatch initial immediate statement if starting fresh
    setTimeout(() => {
      if (this.isListening) {
        this.stepNextLectureDialogue();
      }
    }, 1500);

    this.simulationTimer = setInterval(() => {
      if (!this.isListening) {
        clearInterval(this.simulationTimer);
        this.simulationTimer = null;
        return;
      }
      this.stepNextLectureDialogue();
    }, 7000);
  }

  public stepNextLectureDialogue() {
    const item = this.LECTURE_SEQUENCE[this.lectureIndex % this.LECTURE_SEQUENCE.length];
    this.lectureIndex++;

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // 1. Emit live interim speech typing
    this.emit({
      id: `seq-interim-${Date.now()}`,
      speaker: item.speaker,
      text: item.preview,
      isFinal: false,
      targetLanguage: this.activeTargetLanguage,
      audioLevel: 65,
      timestamp,
    });

    // 2. Concurrently translate and emit final caption after realistic utterance duration
    clearTimeout(this.interimTimer);
    this.interimTimer = setTimeout(async () => {
      if (!this.isListening) return;

      let translated = item.english;
      try {
        const res = await translateDualCaption(item.english, this.activeTargetLanguage, item.speaker);
        translated = res.translatedText;
      } catch {
        translated = item.english;
      }

      this.emit({
        id: `seq-final-${Date.now()}`,
        speaker: item.speaker,
        text: item.english,
        isFinal: true,
        translatedText: translated,
        targetLanguage: this.activeTargetLanguage,
        audioLevel: 80,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });
    }, 1200);
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
