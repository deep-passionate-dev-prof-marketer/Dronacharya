import {
  TranscriptLine,
  ConceptNode,
  ConceptEdge,
  LectureFlowPhase,
  NotebookFlashcard,
  FormulaDerivation,
  ConceptCitation,
  LanguageCode,
} from "../types";
import { TranslationEngine } from "./translation/translationEngine";

export interface SummaryResponse {
  summary: string;
  keyFormulas?: string[];
  actionItems?: string[];
  error?: string;
}

export interface NotebookGraphResponse {
  sessionTitle: string;
  audioBriefingScript: string;
  phases: LectureFlowPhase[];
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  flashcards: NotebookFlashcard[];
  derivations: FormulaDerivation[];
}

export interface AdaptiveModule {
  type: string;
  duration: string;
  title: string;
  description: string;
  actionUrl?: string;
}

export interface AdaptivePathwayParams {
  studentName: string;
  skillLevel?: string;
  weakTopics?: string[];
  scorePercentage?: number;
  currentTopic?: string;
}

export interface AdaptivePathwayResponse {
  studentName: string;
  recommendedTrack: string;
  readinessScore: number;
  modules: AdaptiveModule[];
  aiTip?: string;
}

export interface DualCaptionResponse {
  speaker: string;
  englishText: string;
  translatedText: string;
  targetLanguage: LanguageCode;
}

const LOCAL_I18N_DICTIONARY: Record<string, Record<string, string>> = {
  "notice how cryogenic thermal noise at 15 millikelvin induces phase damping along the z-axis of the 3d bloch sphere.": {
    es: "Observen cómo el ruido térmico criogénico a 15 milikelvin induce amortiguamiento de fase a lo largo del eje z de la esfera 3D de Bloch.",
    hi: "ध्यान दें कि कैसे 15 मिलीकेल्विन पर क्रायोजेनिक थर्मल शोर 3D ब्लोच क्षेत्र के z-अक्ष पर चरण अवमंदन उत्पन्न करता है।",
    fr: "Notez comment le bruit thermique cryogénique à 15 millikelvins induit un amortissement de phase le long de l'axe z de la sphère 3D de Bloch.",
    de: "Beachten Sie, wie kryogenes thermisches Rauschen bei 15 Millikelvin eine Phasendämpfung entlang der z-Achse der 3D-Bloch-Kugel induziert.",
    zh: "请注意15毫开尔文的低温热噪声如何沿着三维布洛赫球面的z轴引起相位阻尼。",
    ar: "لاحظ كيف يسبب الضجيج الحراري المبرد عند 15 مللي كلفن تخميد الطور على طول المحور z لكرة بلوخ ثلاثية الأبعاد.",
  },
  "as you can see on the bloch sphere, unitary transformations rotate the pure state vector without changing its norm.": {
    es: "Como pueden ver en la esfera de Bloch, las transformaciones unitarias rotan el vector de estado puro sin cambiar su norma.",
    hi: "जैसा कि आप ब्लोच क्षेत्र पर देख सकते हैं, एकात्मक रूपांतरण इसके मानदंड को बदले बिना शुद्ध अवस्था वेक्टर को घुमाते हैं।",
    fr: "Comme vous pouvez le voir sur la sphère de Bloch, les transformations unitaires font tourner le vecteur d'état pur sans changer sa norme.",
    de: "Wie Sie auf der Bloch-Kugel sehen können, drehen unitäre Transformationen den reinen Zustandsvektor, ohne seine Norm zu ändern.",
    zh: "正如您在布洛赫球面上所见，酉变换在不改变其范数的情况下旋转纯态矢量。",
    ar: "كما ترون على كرة بلوخ، تقوم التحويلات الأحادية بتدوير متجه الحالة النقية دون تغيير معياره.",
  },
  "does the hadamard gate apply a pi rotation around the x+z diagonal axis?": {
    es: "¿La compuerta Hadamard aplica una rotación pi alrededor del eje diagonal X+Z?",
    hi: "क्या हैडामर्ड गेट X+Z विकर्ण अक्ष के चारों ओर एक पाई घूर्णन लागू करता है?",
    fr: "La porte Hadamard applique-t-elle une rotation pi autour de l'axe diagonal X+Z ?",
    de: "Wendet das Hadamard-Gatter eine Pi-Drehung um die diagonale X+Z-Achse an?",
    zh: "阿达马门是否围绕X+Z对角轴应用π旋转？",
    ar: "هل تطبق بوابة هادامارد دوران باي حول المحور القطري X+Z؟",
  },
  "i have calculated the decoherence rate: t2 is approximately 85 microseconds under cryogenic shielding.": {
    es: "He calculado la tasa de decoherencia: T2 es de aproximadamente 85 microsegundos bajo blindaje criogénico.",
    hi: "मैंने डिकोहेरेंस दर की गणना की है: क्रायोजेनिक परिरक्षण के तहत T2 लगभग 85 माइक्रोसेकंड है।",
    fr: "J'ai calculé le taux de décohérence : T2 est d'environ 85 microsecondes sous blindage cryogénique.",
    de: "Ich habe die Dekohärenzrate berechnet: T2 beträgt unter kryogener Abschirmung etwa 85 Mikrosekunden.",
    zh: "我已经计算了退相干率：在低温屏蔽下，T2约为85微秒。",
    ar: "لقد قمت بحساب معدل فقدان الترابط: T2 حوالي 85 ميكروثانية تحت التدريع المبرد.",
  },
  "precisely marcus. and surface code stabilizers will correct those bit-flip and phase-flip errors concurrently.": {
    es: "Exactamente Marcus. Y los estabilizadores de código de superficie corregirán simultáneamente esos errores de inversión de bit y fase.",
    hi: "बिल्कुल मार्कस। और सतह कोड स्टेबलाइजर्स एक साथ उन बिट-फ्लिप और चरण-फ्लिप त्रुटियों को ठीक करेंगे।",
    fr: "Précisément Marcus. Et les stabilisateurs de code de surface corrigeront ces erreurs d'inversion de bit et de phase simultanément.",
    de: "Genau Marcus. Und Oberflächencode-Stabilisatoren korrigieren diese Bit- und Phasenumkehrfehler gleichzeitig.",
    zh: "正是如此马库斯。并且表面码稳定器将同时纠正这些比特翻转和相位翻转错误。",
    ar: "بالضبط ماركوس. وستقوم مثبتات الكود السطحي بتصحيح أخطاء قلب البت والطور بشكل متزامن.",
  },
};

function getLocalFallback(text: string, lang: LanguageCode): string {
  const norm = text.toLowerCase().trim();
  if (LOCAL_I18N_DICTIONARY[norm] && LOCAL_I18N_DICTIONARY[norm][lang]) {
    return LOCAL_I18N_DICTIONARY[norm][lang];
  }

  // Common quick phrase translations
  const quickWords: Record<string, Record<string, string>> = {
    "hello": { es: "Hola", hi: "नमस्ते", fr: "Bonjour", de: "Hallo", zh: "你好", ar: "مرحبا" },
    "thank you": { es: "Gracias", hi: "धन्यवाद", fr: "Merci", de: "Danke", zh: "谢谢", ar: "شكرا لك" },
    "yes": { es: "Sí", hi: "हाँ", fr: "Oui", de: "Ja", zh: "是的", ar: "نعم" },
    "understood": { es: "Entendido", hi: "समझ गया", fr: "Compris", de: "Verstanden", zh: "明白", ar: "مفهوم" },
  };

  if (quickWords[norm] && quickWords[norm][lang]) {
    return quickWords[norm][lang];
  }

  const prefixes: Record<string, Record<string, string>> = {
    es: { "notice how": "Observen cómo", "does the": "¿Acaso el", "i have calculated": "He calculado", "precisely": "Exactamente" },
    hi: { "notice how": "ध्यान दें कि कैसे", "does the": "क्या", "i have calculated": "मैंने गणना की है", "precisely": "बिल्कुल" },
    fr: { "notice how": "Notez comment", "does the": "Est-ce que", "i have calculated": "J'ai calculé", "precisely": "Précisément" },
    de: { "notice how": "Beachten Sie, wie", "does the": "Macht", "i have calculated": "Ich habe berechnet", "precisely": "Genau" },
    zh: { "notice how": "请注意", "does the": "是否", "i have calculated": "我已计算出", "precisely": "确实如此" },
    ar: { "notice how": "لاحظ كيف", "does the": "هل", "i have calculated": "لقد قمت بحساب", "precisely": "بالتأكيد" },
  };

  const pMap = prefixes[lang];
  if (pMap) {
    for (const [enKey, transVal] of Object.entries(pMap)) {
      if (norm.startsWith(enKey)) {
        return `${transVal} ${text.slice(enKey.length).trim()}`;
      }
    }
  }

  // Fallback tag prefix for any unsupported sentences
  const tagMap: Record<string, string> = {
    es: "Traducción",
    hi: "अनुवाद",
    fr: "Traduction",
    de: "Übersetzung",
    zh: "翻译",
    ar: "ترجمة",
  };
  // Nothing could translate it: show what was said rather than a pretend translation
  void tagMap;
  return text;
}

function detectScriptLanguage(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[¿¡]|\b(hola|entiendo|gracias|profesor|fracciones|parte)\b/i.test(text)) return "es";
  return "en";
}

export async function translateDualCaption(
  text: string,
  targetLanguage: LanguageCode,
  speaker: string
): Promise<DualCaptionResponse> {
  if (!text || text.trim().length === 0) {
    return { speaker, englishText: "", translatedText: "", targetLanguage };
  }

  const detectedSrc = detectScriptLanguage(text);

  try {
    const res = await TranslationEngine.translate(text, detectedSrc, targetLanguage, "general");
    if (res && res.translatedText) {
      return {
        speaker,
        englishText: text,
        translatedText: res.translatedText,
        targetLanguage,
      };
    }
  } catch (_engineErr) {}

  try {
    const res = await fetch("/api/ai/live-translate-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage, speaker }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.translatedText && !data.translatedText.startsWith("<!doctype")) {
        return {
          speaker: data.speaker || speaker,
          englishText: data.englishText || text,
          translatedText: data.translatedText,
          targetLanguage,
        };
      }
    }
  } catch (_err) {}

  return {
    speaker,
    englishText: text,
    translatedText: getLocalFallback(text, targetLanguage),
    targetLanguage,
  };
}

export interface PeerNoteSummaryResult {
  topic: string;
  summary: string;
  keyTakeaways: string[];
  actionItems: Array<{ owner: string; task: string; deadline: string }>;
  sharedVocabulary: string[];
  peerContributionSplit: Record<string, number>;
}

export async function summarizePeerConversation(
  peerA: string,
  peerB: string,
  conversationTranscript: Array<{ speaker: string; text: string; time?: string }>,
  topic: string
): Promise<PeerNoteSummaryResult> {
  try {
    const res = await fetch("/api/ai/peer-notetaker-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerA, peerB, conversationTranscript, topic }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    // No made-up summary: the panel says summaries aren't available
    throw new Error(err?.message?.startsWith("HTTP 503") ? "Summaries aren't available right now." : "Couldn't summarise this conversation. Try again.");
  }
}

