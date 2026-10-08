/**
 * Dronacharya Translation Router Service
 * Multi-Student fan-out router:
 * 1. Takes 1 source transcript from the speaker
 * 2. Gathers unique target languages of all listeners in the room
 * 3. Translates ONCE per unique target language (deduplicated)
 * 4. Dispatches translated text & audio requests to matching listeners
 */

import { TranslationEngine, TranslationResult } from "./translationEngine";
import { EducationalSubject } from "./translationTypes";

export interface ParticipantLanguageMap {
  participantId: string;
  role: string;
  preferredListeningLanguage: string;
}

export interface FanOutTranslationResult {
  sourceLanguage: string;
  sourceText: string;
  speakerId: string;
  speakerName: string;
  translationsByLanguage: Map<string, TranslationResult>; // targetLang -> result
  totalUniqueTranslationsGenerated: number;
  participantsRouted: number;
}

export class TranslationRouter {
  /**
   * Routes a spoken utterance across a classroom of participants.
   * Efficient O(U) where U = number of unique target languages (e.g. 3),
   * NOT O(N) where N = 50 students.
   */
  public static async routeUtterance(
    roomId: string,
    speakerId: string,
    speakerName: string,
    sourceLanguage: string,
    sourceText: string,
    participants: ParticipantLanguageMap[],
    subjectContext: EducationalSubject = "general"
  ): Promise<FanOutTranslationResult> {
    const cleanText = sourceText.trim();
    if (!cleanText) {
      return {
        sourceLanguage,
        sourceText: "",
        speakerId,
        speakerName,
        translationsByLanguage: new Map(),
        totalUniqueTranslationsGenerated: 0,
        participantsRouted: 0,
      };
    }

    // Identify unique target languages excluding the speaker's own target if matching source
    const uniqueTargetLangs = new Set<string>();
    participants.forEach((p) => {
      if (p.participantId !== speakerId && p.preferredListeningLanguage) {
        uniqueTargetLangs.add(p.preferredListeningLanguage.toLowerCase());
      }
    });

    // If no distinct participants, ensure at least default target is translated for captions
    if (uniqueTargetLangs.size === 0) {
      uniqueTargetLangs.add(sourceLanguage.toLowerCase() === "hi" ? "es" : "hi");
    }

    // Execute translation in parallel for each unique language ONCE
    const translationsByLanguage = new Map<string, TranslationResult>();
    const translationPromises = Array.from(uniqueTargetLangs).map(async (targetLang) => {
      try {
        const res = await TranslationEngine.translate(
          cleanText,
          sourceLanguage,
          targetLang,
          subjectContext
        );
        translationsByLanguage.set(targetLang, res);
      } catch (err) {
        console.warn(`[TranslationRouter] Failed translation for ${targetLang}:`, err);
        // Fallback to source
        translationsByLanguage.set(targetLang, {
          sourceLanguage,
          targetLanguage: targetLang,
          sourceText: cleanText,
          translatedText: cleanText,
          latencyMs: 0,
          fromCache: false,
          provider: "fallback_original",
        });
      }
    });

    await Promise.all(translationPromises);

    return {
      sourceLanguage,
      sourceText: cleanText,
      speakerId,
      speakerName,
      translationsByLanguage,
      totalUniqueTranslationsGenerated: uniqueTargetLangs.size,
      participantsRouted: participants.length,
    };
  }
}
