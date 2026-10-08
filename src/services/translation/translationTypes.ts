/**
 * Dronacharya AI Real-Time Interpreter Types and Schemas
 * Standardized contracts across WebRTC, WebSocket, Audio Engine, and UI.
 */

export type TranslationMode = "two_way" | "teacher_to_students" | "student_to_teacher";
export type CaptionDisplayMode = "dual" | "translated_only" | "original_only" | "off";
export type EducationalSubject = "math" | "science" | "coding" | "general";

export interface UserLanguagePreferences {
  userId: string;
  mySpokenLanguage: string; // ISO 639-1 code (e.g., 'hi' for Hindi, 'es' for Spanish)
  autoDetectSpokenLanguage: boolean;
  targetTranslationLanguage: string; // The language this user wants to hear/read
  isAudioTranslationEnabled: boolean;
  captionMode: CaptionDisplayMode;
  originalAudioVolume: number; // 0 to 100%
  translatedAudioVolume: number; // 0 to 100%
  subjectContext: EducationalSubject;
  lastUpdated: number;
}

export interface RoomTranslationSettings {
  roomId: string;
  isEnabled: boolean;
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  translationMode: TranslationMode;
  allowStudentTranslation: boolean;
  subjectContext: EducationalSubject;
  activeLanguagePairs: string[]; // e.g., ["hi->es", "es->hi", "en->fr"]
  updatedAt: number;
}

export interface LatencyBreakdown {
  sttMs: number;
  translationMs: number;
  ttsMs: number;
  endToEndMs: number;
  timestamp: number;
}

export interface TranslationMetrics {
  totalTranslations: number;
  cacheHits: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  recentLatencies: number[];
  activeRoomsSupported: number;
  currentRoomConcurrency: number;
}

export interface TranslationChunk {
  id: string;
  roomId: string;
  speakerId: string;
  speakerName: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  isFinal: boolean;
  audioLevel: number;
  timestamp: string;
  latencyMs: number;
  subjectContext?: EducationalSubject;
}

export interface AudioSynthesisRequest {
  text: string;
  languageCode: string;
  volume: number; // 0 to 1.0
  rate?: number; // 0.8 to 1.3
  speakerId?: string;
}
