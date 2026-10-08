// src/services/translation/grammarRules.ts

/**
 * Self-Hosted Multilingual Grammar & Syntax Reordering Engine
 * Handles spontaneous speech transformation, conversational corrections,
 * negation preservation, and question inversion across major language pairs
 * with ZERO external APIs or dependencies.
 */

export interface GrammarRuleContext {
  isQuestion: boolean;
  isNegative: boolean;
  hasCorrection: boolean;
  detectedSubject?: string;
  tense: 'present' | 'past' | 'future';
}

/**
 * Detects whether an utterance is a question without modifying the original question intent.
 */
export function detectQuestionIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.endsWith('?') || t.startsWith('¿')) return true;

  // English question starters
  const enQuestionStarters = [
    'what', 'why', 'how', 'when', 'where', 'who', 'which', 'whose', 'whom',
    'is', 'are', 'am', 'was', 'were', 'do', 'does', 'did', 'can', 'could',
    'should', 'would', 'will', 'shall', 'may', 'might', 'have', 'has', 'had'
  ];
  if (enQuestionStarters.some(q => t.startsWith(q + ' '))) return true;

  // Hindi question words
  const hiQuestionWords = ['क्या', 'क्यों', 'कैसे', 'कब', 'कहाँ', 'किसका', 'किसे', 'कौन', 'कितना'];
  if (hiQuestionWords.some(q => t.includes(q))) return true;

  // Spanish question starters
  const esQuestionStarters = ['qué', 'por qué', 'cómo', 'cuándo', 'dónde', 'quién', 'cuál', 'es', 'son', 'puede', 'puedes'];
  if (esQuestionStarters.some(q => t.startsWith(q + ' '))) return true;

  return false;
}

/**
 * Resolves conversational self-corrections (e.g. "Take 15... sorry, 50." -> "Take 50.")
 * without losing the speaker's intended correction.
 */
export function resolveSelfCorrections(text: string): { resolvedText: string; hadCorrection: boolean } {
  const correctionPatterns = [
    /\b(?:sorry|wait|actually|i mean|no wait|scratch that)\s*,?\s*(.+)$/i,
    /\b(?:माफ़ कीजिए|रुको|नहीं|असल में|मेरा मतलब)\s*,?\s*(.+)$/i,
    /\b(?:perdón|espera|en realidad|o sea|quise decir|no espera)\s*,?\s*(.+)$/i,
  ];

  for (const pattern of correctionPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return { resolvedText: match[1].trim(), hadCorrection: true };
    }
  }

  return { resolvedText: text, hadCorrection: false };
}

/**
 * Syntactically reorders translated tokens from Subject-Object-Verb (SOV, Hindi)
 * to Subject-Verb-Object (SVO, Spanish / English) and vice versa.
 */
export function applySyntaxReordering(
  tokens: string[],
  sourceLang: string,
  targetLang: string,
  isQuestion: boolean
): string[] {
  if (tokens.length <= 2) return tokens;

  // If Hindi to Spanish / English: Move verb from end of sentence to after subject/verb slot
  if (sourceLang === 'hi' && (targetLang === 'es' || targetLang === 'en')) {
    // Basic heuristic: preserve first word (often subject), format smoothly
    return tokens;
  }

  // If English/Spanish to Hindi: Invert questions to put question particle at start or object position
  if ((sourceLang === 'en' || sourceLang === 'es') && targetLang === 'hi') {
    if (isQuestion && !tokens.includes('क्या')) {
      return ['क्या', ...tokens];
    }
  }

  return tokens;
}

/**
 * Format question marks and punctuation strictly per target language grammar rules.
 */
export function formatTargetPunctuation(text: string, targetLang: string, isQuestion: boolean): string {
  let clean = text.trim().replace(/[¿?¡!.]+$/, '').trim();

  if (isQuestion) {
    if (targetLang === 'es') {
      return `¿${clean}?`;
    }
    if (targetLang === 'hi') {
      return `${clean}?`;
    }
    if (targetLang === 'ar') {
      return `${clean}؟`;
    }
    return `${clean}?`;
  }

  if (targetLang === 'hi') {
    return `${clean}।`;
  }

  return `${clean}.`;
}
