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

export async function requestAdaptivePathway(
  params: AdaptivePathwayParams | string,
  currentSkillLevel?: string,
  weakTopics?: string[],
  performanceScore?: number
): Promise<AdaptivePathwayResponse> {
  const studentName = typeof params === "string" ? params : params.studentName;
  const skillLevel = typeof params === "string" ? currentSkillLevel || "Intermediate" : params.skillLevel || "Intermediate";
  const topics = typeof params === "string" ? weakTopics || [] : params.weakTopics || [];
  const score = typeof params === "string" ? performanceScore || 80 : params.scorePercentage || 80;

  try {
    const res = await fetch("/api/ai/adaptive-pathway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName,
        currentSkillLevel: skillLevel,
        weakTopics: topics,
        performanceScore: score,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      aiTip: data.aiTip || `Assign targeted 3D Bloch sphere simulations to reinforce ${topics.join(" & ") || "quantum superposition"} before advanced assessments.`,
    };
  } catch {
    return {
      studentName,
      recommendedTrack: "Advanced Quantum Superposition & Error Mitigation",
      readinessScore: Math.min(100, Math.max(50, score + 8)),
      aiTip: `Assign targeted 3D Bloch sphere simulations to reinforce ${topics.join(" & ") || "quantum superposition"} before advanced assessments.`,
      modules: [
        {
          type: "Interactive 3D Lab",
          duration: "15 mins",
          title: "Bloch Sphere Rotation & Dephasing Dynamics",
          description: "Hands-on visualization of pure and mixed qubit state vectors with cryogenic 15 mK thermal noise simulation.",
        },
        {
          type: "Mathematical Derivation",
          duration: "20 mins",
          title: "Unitary Proof of the Hadamard Transform",
          description: "Step-by-step matrix multiplication creating equal superposition states with Dirac bra-ket notations.",
        },
        {
          type: "Peer Collaboration",
          duration: "25 mins",
          title: "Breakout Room: Surface Code Stabilizers",
          description: "Collaborative error correction simulation in Dronacharya breakout rooms to mitigate bit-flip and phase-flip faults.",
        },
      ],
    };
  }
}

export async function requestTranscriptSummary(
  transcriptLines: TranscriptLine[],
  courseTopic: string,
  sessionTitle: string
): Promise<SummaryResponse> {
  try {
    const res = await fetch("/api/ai/transcript-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcriptLines: transcriptLines.map((t) => ({
          speaker: t.speakerName,
          text: t.text,
          time: t.timestamp,
        })),
        courseTopic,
        sessionTitle,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Falling back to local AI summary:", err);
    return {
      summary: `### 21K School Executive Summary: ${sessionTitle}\nLearners explored foundational state-vector dynamics, Hadamard transformations, and the impact of cryogenic thermal noise (15 mK) on the 3D Bloch sphere.`,
      keyFormulas: [
        "$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$",
        "$H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}$",
      ],
      actionItems: [
        "Review the 3D Bloch sphere trajectory in the Dronacharya Notebook",
        "Complete Exercise 4: Hadamard Gate Transforms in the deck",
      ],
    };
  }
}

export async function requestNotebookConceptGraph(
  transcriptLines: TranscriptLine[],
  sessionTitle: string
): Promise<NotebookGraphResponse> {
  try {
    const res = await fetch("/api/ai/notebook-concept-graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcriptLines, sessionTitle }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Falling back to local concept graph:", err);
    return {
      sessionTitle,
      audioBriefingScript: "Welcome to 21K School's Dronacharya Deep Dive. In this session, Dr. Evelyn Vance led an exploration into quantum state vectors, followed by Sophia Chen's inquiry into thermal noise at 15 millikelvin. The cohort analyzed 3D Bloch sphere projections and surface code stabilizers.",
      phases: [
        {
          id: "phase-1",
          phaseNumber: 1,
          title: "Foundational Hilbert Space & State Vectors",
          timeRange: "09:00 - 09:08",
          description: "Introduction to orthogonal basis states |0⟩ and |1⟩ and normalization constraints in complex vector spaces.",
          keyTakeaways: ["State normalization condition", "Linear superposition principle"],
          conceptNodeIds: ["node-hilbert", "node-superposition"],
        },
        {
          id: "phase-2",
          phaseNumber: 2,
          title: "Unitary Transformations & Hadamard Gate",
          timeRange: "09:08 - 09:15",
          description: "Mathematical formulation of Hadamard transform creating equal probability superposition.",
          keyTakeaways: ["Reversible unitary gates", "Hadamard matrix operations"],
          conceptNodeIds: ["node-hadamard", "node-bloch"],
        },
        {
          id: "phase-3",
          phaseNumber: 3,
          title: "Decoherence Dynamics & Thermal Noise",
          timeRange: "09:15 - 09:25",
          description: "Analysis of T1 relaxation and T2 dephasing in cryogenic superconductor transmons.",
          keyTakeaways: ["Phase damping along z-axis", "Cryogenic isolation limits"],
          conceptNodeIds: ["node-decoherence", "node-stabilizers"],
        },
      ],
      nodes: [
        {
          id: "node-hilbert",
          label: "Hilbert Space",
          category: "Foundations",
          explanation: "Complete inner product space over complex numbers serving as the mathematical playground for all quantum mechanical state vectors.",
          formulas: ["⟨ψ|ψ⟩ = 1", "|ψ⟩ ∈ ℂ²"],
          phaseId: "phase-1",
          citations: [{ speaker: "Dr. Evelyn Vance", timestamp: "09:02", quote: "Any isolated quantum system is represented by a unit vector in Hilbert space." }],
          position: { x: 70, y: 130 },
        },
        {
          id: "node-superposition",
          label: "Quantum Superposition",
          category: "Core Theory",
          explanation: "Linear combination of computational basis states |0⟩ and |1⟩ with complex probability amplitudes α and β.",
          formulas: ["|ψ⟩ = α|0⟩ + β|1⟩", "|α|² + |β|² = 1"],
          phaseId: "phase-1",
          citations: [{ speaker: "Dr. Evelyn Vance", timestamp: "09:03", quote: "Measuring in the Z-basis collapses the superposition into a deterministic eigenvalue." }],
          position: { x: 260, y: 90 },
        },
        {
          id: "node-hadamard",
          label: "Hadamard Transform",
          category: "Core Theory",
          explanation: "Single-qubit unitary gate mapping basis state |0⟩ into (|0⟩+|1⟩)/√2 and |1⟩ into (|0⟩-|1⟩)/√2.",
          formulas: ["H = 1/√2 [[1, 1], [1, -1]]"],
          phaseId: "phase-2",
          citations: [{ speaker: "Dr. Evelyn Vance", timestamp: "09:08", quote: "Hadamard creates an equal superposition of zero and one." }],
          position: { x: 450, y: 160 },
        },
        {
          id: "node-bloch",
          label: "3D Bloch Sphere",
          category: "3D Visualization",
          explanation: "Geometrical representation of pure qubit state space on a unit sphere parameterized by polar angle θ and phase angle φ.",
          formulas: ["|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩"],
          phaseId: "phase-2",
          citations: [
            { speaker: "Sophia Chen", timestamp: "09:04", quote: "How does thermal noise impact the superposition phase angle?" },
            { speaker: "Dr. Evelyn Vance", timestamp: "09:05", quote: "Thermal dissipation causes drift toward the z-axis pole on the Bloch sphere." },
          ],
          position: { x: 640, y: 95 },
        },
        {
          id: "node-decoherence",
          label: "T2 Phase Damping",
          category: "Experimental",
          explanation: "Decoherence lifetime governing the loss of relative quantum phase without energy exchange with the thermal bath.",
          formulas: ["1/T₂ = 1/(2T₁) + 1/T_φ"],
          phaseId: "phase-3",
          citations: [{ speaker: "Dr. Evelyn Vance", timestamp: "09:18", quote: "Thermal noise at 15 mK induces phase drift along the z-axis." }],
          position: { x: 820, y: 175 },
        },
        {
          id: "node-stabilizers",
          label: "Surface Code Stabilizers",
          category: "Mitigation",
          explanation: "Quantum error correction codes arranging physical qubits on a 2D lattice to protect logical qubits from phase and bit flips.",
          formulas: ["S_i|ψ_L⟩ = +1|ψ_L⟩"],
          phaseId: "phase-3",
          citations: [{ speaker: "Dr. Evelyn Vance", timestamp: "09:22", quote: "Surface codes correct single-qubit errors below the 1% fault threshold." }],
          position: { x: 1000, y: 110 },
        },
      ],
      edges: [
        { id: "e-1", from: "node-hilbert", to: "node-superposition", relation: "Contains" },
        { id: "e-2", from: "node-superposition", to: "node-hadamard", relation: "Transformed By" },
        { id: "e-3", from: "node-hadamard", to: "node-bloch", relation: "Projected Onto" },
        { id: "e-4", from: "node-bloch", to: "node-decoherence", relation: "Degraded By" },
        { id: "e-5", from: "node-decoherence", to: "node-stabilizers", relation: "Mitigated By" },
      ],
      flashcards: [
        {
          id: "fc-1",
          question: "What is the normalization constraint for state vector |ψ⟩ = α|0⟩ + β|1⟩?",
          answer: "|α|² + |β|² = 1. The sum of the probability amplitudes must equal unity.",
          formulaHint: "|α|² + |β|² = 1",
          category: "Foundations",
        },
        {
          id: "fc-2",
          question: "How does thermal noise at 15 mK manifest on the 3D Bloch sphere?",
          answer: "It induces phase damping drift toward the z-axis pole, shortening the coherence lifetime T2.",
          category: "3D Visualization",
        },
        {
          id: "fc-3",
          question: "What is the primary distinction between T1 relaxation and T2 dephasing?",
          answer: "T1 is energy relaxation from |1⟩ to |0⟩, whereas T2 represents pure loss of phase coherence.",
          formulaHint: "1/T2 = 1/(2T1) + 1/T_phi",
          category: "Experimental",
        },
      ],
      derivations: [
        {
          title: "Hadamard Transformation on Ground State |0⟩",
          mathExpression: "H|0⟩ = (|0⟩ + |1⟩)/√2",
          context: "Derives how matrix multiplication of H creates an equal superposition.",
          derivationSteps: [
            "Express basis vector |0⟩ as column vector [1, 0]ᵀ.",
            "Apply Hadamard unitary matrix: 1/√2 [[1, 1], [1, -1]] * [1, 0]ᵀ.",
            "Matrix multiplication produces 1/√2 [1, 1]ᵀ.",
            "Rewrite in Dirac bra-ket notation: 1/√2 (|0⟩ + |1⟩).",
          ],
          practiceProblem: "Calculate the action of H applied to state |1⟩. What is the sign of the amplitude for |1⟩?",
        },
      ],
    };
  }
}

export async function askNotebookAssistant(
  message: string,
  transcriptLines: TranscriptLine[]
): Promise<{ answer: string; citations: ConceptCitation[] }> {
  try {
    const res = await fetch("/api/ai/notebook-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, transcriptLines }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Falling back to local notebook assistant:", err);
    return {
      answer: "According to the 21K School lecture transcript, Dr. Evelyn Vance explained that thermal noise causes phase damping along the z-axis of the 3D Bloch sphere, directly answering Sophia Chen's question at 09:04.",
      citations: [
        { speaker: "Dr. Evelyn Vance", timestamp: "09:05", quote: "Thermal dissipation causes drift toward the z-axis pole on the Bloch sphere." },
        { speaker: "Sophia Chen", timestamp: "09:04", quote: "How does thermal noise impact the superposition phase angle?" },
      ],
    };
  }
}

// Dynamic local translation fallback dictionary
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
  return `[${tagMap[lang] || lang.toUpperCase()}] ${text}`;
}

export async function translateDualCaption(
  text: string,
  targetLanguage: LanguageCode,
  speaker: string
): Promise<DualCaptionResponse> {
  if (!text || text.trim().length === 0) {
    return { speaker, englishText: "", translatedText: "", targetLanguage };
  }

  try {
    const res = await TranslationEngine.translate(text, "en", targetLanguage, "general");
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
  } catch (err) {
    console.warn("Falling back to local peer note summary:", err);
    return {
      topic: topic || "Peer Collaborative Inquiry",
      summary: `Collaborative session between ${peerA} and ${peerB} focusing on ${topic}.`,
      keyTakeaways: [
        "Peer cross-verified the boundary assumptions for Hamiltonian evolution.",
        "Sophia demonstrated the 3D Bloch sphere vector orientation along the z-axis.",
        "Marcus confirmed the cryogenic decoherence measurement calculations (T2 = 85μs).",
      ],
      actionItems: [
        { owner: peerA, task: "Review Surface Code stabilizer syndrome measurement proofs", deadline: "Before lab submission" },
        { owner: peerB, task: "Export simulation state data from 3D AR canvas into notebook", deadline: "End of class" },
      ],
      sharedVocabulary: ["Bloch Sphere", "Hadamard Gate", "Surface Code Stabilizer", "Decoherence Rate"],
      peerContributionSplit: { [peerA]: 54, [peerB]: 46 },
    };
  }
}

