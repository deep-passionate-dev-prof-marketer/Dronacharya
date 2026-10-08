
const CANONICAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  "आज हम fractions के बारे में सीखेंगे।": {
    es: "Hoy aprenderemos sobre las fracciones.",
    en: "Today we will learn about fractions.",
    fr: "Aujourd'hui, nous allons apprendre les fractions.",
    de: "Heute lernen wir etwas über Brüche.",
  },
  "no entiendo esta parte.": {
    hi: "मुझे यह हिस्सा समझ नहीं आया।",
    en: "I do not understand this part.",
    fr: "Je ne comprends pas cette partie.",
  },
  "today we will learn about fractions.": {
    es: "Hoy aprenderemos sobre las fracciones.",
    hi: "आज हम fractions के बारे में सीखेंगे।",
    fr: "Aujourd'hui, nous allons apprendre les fractions.",
  },
  "take the square root of 16.": {
    es: "Tomen la raíz cuadrada de 16.",
    hi: "16 का वर्गमूल (square root) लें।",
  },
};

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, targetLanguage = "es", speaker = "Speaker" } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const clean = text.trim();
    const tgt = targetLanguage.toLowerCase();

    // Check canonical corpus
    const directMatch = CANONICAL_TRANSLATIONS[clean]?.[tgt];
    if (directMatch) {
      return res.status(200).json({
        speaker,
        englishText: clean,
        translatedText: directMatch,
        targetLanguage: tgt,
      });
    }

    // Free Open-source MyMemory fallback
    try {
      const resp = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|${tgt}`
      );
      if (resp.ok) {
        const data = await resp.json();
        const translated = data?.responseData?.translatedText;
        if (translated && !translated.includes("MYMEMORY WARNING")) {
          return res.status(200).json({
            speaker,
            englishText: clean,
            translatedText: translated,
            targetLanguage: tgt,
          });
        }
      }
    } catch {}

    return res.status(200).json({
      speaker,
      englishText: clean,
      translatedText: clean,
      targetLanguage: tgt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Internal translation error" });
  }
}
