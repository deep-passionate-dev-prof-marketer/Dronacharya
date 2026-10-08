/**
 * Dronacharya Educational Terminology & Context Layer
 * Protects STEM, Coding, Mathematics, and Physics terminology
 * from erroneous literal translation.
 */

import { EducationalSubject } from "./translationTypes";

export interface AcademicTerm {
  canonical: string;
  category: EducationalSubject;
  aliases: string[];
  translations: Record<string, string>; // langCode -> localized academic term
}

export const ACADEMIC_TERMINOLOGY: AcademicTerm[] = [
  // Mathematics
  {
    canonical: "fractions",
    category: "math",
    aliases: ["fraction", "fractions"],
    translations: {
      es: "fracciones",
      hi: "भिन्न (fractions)",
      fr: "fractions",
      de: "Brüche",
      ar: "الكسور",
      zh: "分数",
      ja: "分数",
      pt: "frações",
      ru: "дроби",
    },
  },
  {
    canonical: "square root",
    category: "math",
    aliases: ["square root", "square-root", "sqrt"],
    translations: {
      es: "raíz cuadrada",
      hi: "वर्गमूल (square root)",
      fr: "racine carrée",
      de: "Quadratwurzel",
      ar: "الجذر التربيعي",
      zh: "平方根",
      ja: "平方根",
      pt: "raiz quadrada",
      ru: "квадратный корень",
    },
  },
  {
    canonical: "algebra",
    category: "math",
    aliases: ["algebra", "algebraic"],
    translations: {
      es: "álgebra",
      hi: "बीजगणित (algebra)",
      fr: "algèbre",
      de: "Algebra",
      ar: "الجبر",
      zh: "代数",
      ja: "代数",
      pt: "álgebra",
      ru: "алгебра",
    },
  },
  {
    canonical: "Pythagoras theorem",
    category: "math",
    aliases: ["pythagoras theorem", "pythagorean theorem"],
    translations: {
      es: "teorema de Pitágoras",
      hi: "पायथागोरस प्रमेय (Pythagoras theorem)",
      fr: "théorème de Pythagore",
      de: "Satz des Pythagoras",
      ar: "مبرهنة فيثاغورس",
      zh: "勾股定理",
      ja: "ピタゴラスの定理",
      pt: "teorema de Pitágoras",
      ru: "теорема Пифагора",
    },
  },
  {
    canonical: "matrix",
    category: "math",
    aliases: ["matrix", "matrices"],
    translations: {
      es: "matriz",
      hi: "आव्यूह (matrix)",
      fr: "matrice",
      de: "Matrix",
      ar: "مصفوفة",
      zh: "矩阵",
      ja: "行列",
      pt: "matriz",
      ru: "матрица",
    },
  },

  // Science & Quantum Physics
  {
    canonical: "Newton's laws",
    category: "science",
    aliases: ["newton's laws", "newton laws", "laws of newton"],
    translations: {
      es: "leyes de Newton",
      hi: "न्यूटन के नियम (Newton's laws)",
      fr: "lois de Newton",
      de: "Newtons Axiome",
      ar: "قوانين نيوتن",
      zh: "牛顿运动定律",
      ja: "ニュートンの法則",
      pt: "leis de Newton",
      ru: "законы Ньютона",
    },
  },
  {
    canonical: "Bloch sphere",
    category: "science",
    aliases: ["bloch sphere"],
    translations: {
      es: "esfera de Bloch",
      hi: "ब्लोच स्फीयर (Bloch sphere)",
      fr: "sphère de Bloch",
      de: "Bloch-Kugel",
      ar: "كرة بلوخ",
      zh: "布洛赫球面",
      ja: "ブロッホ球",
      pt: "esfera de Bloch",
      ru: "сфера Блоха",
    },
  },
  {
    canonical: "cryogenic thermal noise",
    category: "science",
    aliases: ["cryogenic thermal noise", "cryogenic noise"],
    translations: {
      es: "ruido térmico criogénico",
      hi: "क्रायोजेनिक थर्मल शोर",
      fr: "bruit thermique cryogénique",
      de: "kryogenes thermisches Rauschen",
      ar: "الضجيج الحراري المبرد",
      zh: "低温热噪声",
      ja: "極低温熱雑音",
      pt: "ruído térmico criogênico",
      ru: "криогенный тепловой шум",
    },
  },
  {
    canonical: "superposition",
    category: "science",
    aliases: ["superposition", "quantum superposition"],
    translations: {
      es: "superposición cuántica",
      hi: "क्वांटम सुपरपोजिशन",
      fr: "superposition quantique",
      de: "Quantensuperposition",
      ar: "التراكب الكمي",
      zh: "量子叠加",
      ja: "量子重ね合わせ",
      pt: "superposição quântica",
      ru: "квантовая суперпозиция",
    },
  },

  // Coding & Computer Science
  {
    canonical: "Python",
    category: "coding",
    aliases: ["python"],
    translations: {
      es: "Python",
      hi: "Python",
      fr: "Python",
      de: "Python",
      ar: "بايثون (Python)",
      zh: "Python",
      ja: "Python",
      pt: "Python",
      ru: "Python",
    },
  },
  {
    canonical: "JavaScript",
    category: "coding",
    aliases: ["javascript", "js"],
    translations: {
      es: "JavaScript",
      hi: "JavaScript",
      fr: "JavaScript",
      de: "JavaScript",
      ar: "جافا سكريبت (JavaScript)",
      zh: "JavaScript",
      ja: "JavaScript",
      pt: "JavaScript",
      ru: "JavaScript",
    },
  },
  {
    canonical: "HTML and CSS",
    category: "coding",
    aliases: ["html and css", "html", "css"],
    translations: {
      es: "HTML y CSS",
      hi: "HTML और CSS",
      fr: "HTML et CSS",
      de: "HTML und CSS",
      ar: "HTML و CSS",
      zh: "HTML 与 CSS",
      ja: "HTMLとCSS",
      pt: "HTML e CSS",
      ru: "HTML и CSS",
    },
  },
  {
    canonical: "algorithm",
    category: "coding",
    aliases: ["algorithm", "algorithms"],
    translations: {
      es: "algoritmo",
      hi: "एल्गोरिदम (algorithm)",
      fr: "algorithme",
      de: "Algorithmus",
      ar: "خوارزمية",
      zh: "算法",
      ja: "アルゴリズム",
      pt: "algoritmo",
      ru: "алгоритм",
    },
  },
  {
    canonical: "recursion",
    category: "coding",
    aliases: ["recursion", "recursive function"],
    translations: {
      es: "recursión",
      hi: "रिकर्शन (recursion)",
      fr: "récursion",
      de: "Rekursion",
      ar: "الاستدعاء الذاتي (Recursion)",
      zh: "递归",
      ja: "再帰",
      pt: "recursão",
      ru: "рекурсия",
    },
  },
];

export class TerminologyProtector {
  /**
   * Pre-processes sentence to tag protected terms with placeholders
   * to prevent corrupted translation across intermediate engines.
   */
  public static protectTerms(
    text: string,
    targetLang: string,
    subject?: EducationalSubject
  ): { processedText: string; restoredMap: Map<string, string> } {
    let processedText = text;
    const restoredMap = new Map<string, string>();
    let markerIdx = 0;

    const termsToProtect = ACADEMIC_TERMINOLOGY.filter((t) =>
      !subject || subject === "general" || t.category === subject
    );

    for (const term of termsToProtect) {
      for (const alias of term.aliases) {
        const regex = new RegExp(`\\b${alias}\\b`, "gi");
        if (regex.test(processedText)) {
          const placeholder = `__ACAD_TERM_${markerIdx++}__`;
          const targetTranslation =
            term.translations[targetLang.toLowerCase()] ||
            term.canonical;

          restoredMap.set(placeholder, targetTranslation);
          processedText = processedText.replace(regex, placeholder);
        }
      }
    }

    return { processedText, restoredMap };
  }

  /**
   * Post-processes translated output to restore academic terms accurately.
   */
  public static restoreTerms(
    translatedText: string,
    restoredMap: Map<string, string>
  ): string {
    let result = translatedText;
    restoredMap.forEach((replacement, placeholder) => {
      result = result.split(placeholder).join(replacement);
      // Case where model inserted spaces
      result = result.split(placeholder.toLowerCase()).join(replacement);
    });
    return result;
  }
}
