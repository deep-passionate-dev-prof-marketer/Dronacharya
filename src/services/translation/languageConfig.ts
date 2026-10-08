/**
 * Dronacharya AI Real-Time Interpreter Language Configuration
 * Supports 50+ Global & Regional ISO-639-1 / BCP-47 Languages.
 * Designed to expand to 100+ languages via declarative configuration.
 */

export interface LanguageDefinition {
  code: string; // ISO 639-1
  bcp47: string; // Speech recognition & synthesis tag
  name: string; // English display name
  nativeName: string; // Native script name
  flag: string; // Emoji flag icon
  rtl?: boolean; // Right-to-left script
  ttsVoicePrefixes?: string[]; // Recommended speech synthesis voice identifiers
  isIndianLanguage?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  // Major International Languages
  { code: "en", bcp47: "en-US", name: "English", nativeName: "English", flag: "🇬🇧", ttsVoicePrefixes: ["en-US", "en-GB", "Samantha", "Daniel", "Google US English"] },
  { code: "hi", bcp47: "hi-IN", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", ttsVoicePrefixes: ["hi-IN", "Lekha", "Neel", "Google हिन्दी"], isIndianLanguage: true },
  { code: "es", bcp47: "es-ES", name: "Spanish", nativeName: "Español", flag: "🇪🇸", ttsVoicePrefixes: ["es-ES", "es-MX", "Monica", "Diego", "Google español"] },
  { code: "fr", bcp47: "fr-FR", name: "French", nativeName: "Français", flag: "🇫🇷", ttsVoicePrefixes: ["fr-FR", "Thomas", "Audrey", "Google français"] },
  { code: "de", bcp47: "de-DE", name: "German", nativeName: "Deutsch", flag: "🇩🇪", ttsVoicePrefixes: ["de-DE", "Anna", "Google Deutsch"] },
  { code: "zh", bcp47: "zh-CN", name: "Chinese (Mandarin)", nativeName: "中文 (普通话)", flag: "🇨🇳", ttsVoicePrefixes: ["zh-CN", "Ting-Ting", "Google 普通话"] },
  { code: "ar", bcp47: "ar-SA", name: "Arabic", nativeName: "العربية", flag: "🇦🇪", rtl: true, ttsVoicePrefixes: ["ar-SA", "Tarik", "Maged", "Google العربية"] },
  { code: "ja", bcp47: "ja-JP", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", ttsVoicePrefixes: ["ja-JP", "Kyoko", "Otoya", "Google 日本語"] },
  { code: "pt", bcp47: "pt-BR", name: "Portuguese", nativeName: "Português", flag: "🇧🇷", ttsVoicePrefixes: ["pt-BR", "pt-PT", "Luciana", "Google português"] },
  { code: "ru", bcp47: "ru-RU", name: "Russian", nativeName: "Русский", flag: "🇷🇺", ttsVoicePrefixes: ["ru-RU", "Milena", "Yuri", "Google русский"] },
  { code: "ko", bcp47: "ko-KR", name: "Korean", nativeName: "한국어", flag: "🇰🇷", ttsVoicePrefixes: ["ko-KR", "Yuna", "Google 한국어"] },
  { code: "it", bcp47: "it-IT", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", ttsVoicePrefixes: ["it-IT", "Alice", "Google italiano"] },
  { code: "nl", bcp47: "nl-NL", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", ttsVoicePrefixes: ["nl-NL", "Xander", "Google Nederlands"] },
  { code: "tr", bcp47: "tr-TR", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", ttsVoicePrefixes: ["tr-TR", "Yelda", "Google Türkçe"] },
  { code: "vi", bcp47: "vi-VN", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", ttsVoicePrefixes: ["vi-VN", "Linh", "Google Tiếng Việt"] },
  { code: "th", bcp47: "th-TH", name: "Thai", nativeName: "ไทย", flag: "🇹🇭", ttsVoicePrefixes: ["th-TH", "Kanya", "Google ไทย"] },
  { code: "id", bcp47: "id-ID", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "🇮🇩", ttsVoicePrefixes: ["id-ID", "Damayanti", "Google Bahasa Indonesia"] },
  { code: "pl", bcp47: "pl-PL", name: "Polish", nativeName: "Polski", flag: "🇵🇱", ttsVoicePrefixes: ["pl-PL", "Ewa", "Google polski"] },
  { code: "sv", bcp47: "sv-SE", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", ttsVoicePrefixes: ["sv-SE", "Alva", "Google svenska"] },
  { code: "el", bcp47: "el-GR", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷", ttsVoicePrefixes: ["el-GR", "Google ελληνικά"] },
  { code: "cs", bcp47: "cs-CZ", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", ttsVoicePrefixes: ["cs-CZ", "Google čeština"] },
  { code: "ro", bcp47: "ro-RO", name: "Romanian", nativeName: "Română", flag: "🇷🇴", ttsVoicePrefixes: ["ro-RO", "Ioana", "Google română"] },
  { code: "hu", bcp47: "hu-HU", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺", ttsVoicePrefixes: ["hu-HU", "Google magyar"] },
  { code: "da", bcp47: "da-DK", name: "Danish", nativeName: "Dansk", flag: "🇩🇰", ttsVoicePrefixes: ["da-DK", "Google dansk"] },
  { code: "fi", bcp47: "fi-FI", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", ttsVoicePrefixes: ["fi-FI", "Google suomi"] },
  { code: "no", bcp47: "nb-NO", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", ttsVoicePrefixes: ["nb-NO", "Google norsk"] },
  { code: "uk", bcp47: "uk-UA", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦", ttsVoicePrefixes: ["uk-UA", "Google українська"] },
  { code: "he", bcp47: "he-IL", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", rtl: true, ttsVoicePrefixes: ["he-IL", "Carmit", "Google עברית"] },
  { code: "fa", bcp47: "fa-IR", name: "Persian", nativeName: "فارسی", flag: "🇮🇷", rtl: true, ttsVoicePrefixes: ["fa-IR", "Google فارسی"] },
  { code: "ms", bcp47: "ms-MY", name: "Malay", nativeName: "Bahasa Melayu", flag: "🇲🇾", ttsVoicePrefixes: ["ms-MY", "Google Bahasa Melayu"] },

  // Indian National & Regional Languages (Key for 21K School Multi-regional footprint)
  { code: "bn", bcp47: "bn-IN", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳", ttsVoicePrefixes: ["bn-IN", "bn-BD", "Google বাংলা"], isIndianLanguage: true },
  { code: "ta", bcp47: "ta-IN", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", ttsVoicePrefixes: ["ta-IN", "Valluvar", "Google தமிழ்"], isIndianLanguage: true },
  { code: "te", bcp47: "te-IN", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", ttsVoicePrefixes: ["te-IN", "Chitra", "Google తెలుగు"], isIndianLanguage: true },
  { code: "mr", bcp47: "mr-IN", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳", ttsVoicePrefixes: ["mr-IN", "Aarohi", "Google मराठी"], isIndianLanguage: true },
  { code: "gu", bcp47: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳", ttsVoicePrefixes: ["gu-IN", "Dhwani", "Google ગુજરાતી"], isIndianLanguage: true },
  { code: "kn", bcp47: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳", ttsVoicePrefixes: ["kn-IN", "Sapna", "Google ಕನ್ನಡ"], isIndianLanguage: true },
  { code: "ml", bcp47: "ml-IN", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳", ttsVoicePrefixes: ["ml-IN", "Midhun", "Google മലയാളം"], isIndianLanguage: true },
  { code: "pa", bcp47: "pa-IN", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳", ttsVoicePrefixes: ["pa-IN", "Google ਪੰਜਾਬੀ"], isIndianLanguage: true },
  { code: "ur", bcp47: "ur-IN", name: "Urdu", nativeName: "اردو", flag: "🇮🇳", rtl: true, ttsVoicePrefixes: ["ur-IN", "ur-PK", "Google اردو"], isIndianLanguage: true },
  { code: "or", bcp47: "or-IN", name: "Odia", nativeName: "ଓଡ଼ିଆ", flag: "🇮🇳", ttsVoicePrefixes: ["or-IN"], isIndianLanguage: true },
  { code: "as", bcp47: "as-IN", name: "Assamese", nativeName: "অসমীয়া", flag: "🇮🇳", ttsVoicePrefixes: ["as-IN"], isIndianLanguage: true },
  { code: "sa", bcp47: "sa-IN", name: "Sanskrit", nativeName: "संस्कृतम्", flag: "🇮🇳", ttsVoicePrefixes: ["sa-IN"], isIndianLanguage: true },

  // Additional Global Languages to reach 50+
  { code: "fil", bcp47: "fil-PH", name: "Filipino (Tagalog)", nativeName: "Tagalog", flag: "🇵🇭", ttsVoicePrefixes: ["fil-PH", "tl-PH"] },
  { code: "sw", bcp47: "sw-KE", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪", ttsVoicePrefixes: ["sw-KE", "sw-TZ"] },
  { code: "af", bcp47: "af-ZA", name: "Afrikaans", nativeName: "Afrikaans", flag: "🇿🇦", ttsVoicePrefixes: ["af-ZA"] },
  { code: "bg", bcp47: "bg-BG", name: "Bulgarian", nativeName: "Български", flag: "🇧🇬", ttsVoicePrefixes: ["bg-BG"] },
  { code: "hr", bcp47: "hr-HR", name: "Croatian", nativeName: "Hrvatski", flag: "🇭🇷", ttsVoicePrefixes: ["hr-HR"] },
  { code: "sk", bcp47: "sk-SK", name: "Slovak", nativeName: "Slovenčina", flag: "🇸🇰", ttsVoicePrefixes: ["sk-SK"] },
  { code: "lt", bcp47: "lt-LT", name: "Lithuanian", nativeName: "Lietuvių", flag: "🇱🇹", ttsVoicePrefixes: ["lt-LT"] },
  { code: "sl", bcp47: "sl-SI", name: "Slovenian", nativeName: "Slovenščina", flag: "🇸🇮", ttsVoicePrefixes: ["sl-SI"] },
  { code: "et", bcp47: "et-EE", name: "Estonian", nativeName: "Eesti", flag: "🇪🇪", ttsVoicePrefixes: ["et-EE"] },
  { code: "lv", bcp47: "lv-LV", name: "Latvian", nativeName: "Latviešu", flag: "🇱🇻", ttsVoicePrefixes: ["lv-LV"] },
];

export const LANGUAGE_MAP = new Map<string, LanguageDefinition>(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang])
);

export function getLanguage(code: string): LanguageDefinition {
  return (
    LANGUAGE_MAP.get(code.toLowerCase()) || {
      code: code.toLowerCase(),
      bcp47: `${code}-US`,
      name: code.toUpperCase(),
      nativeName: code.toUpperCase(),
      flag: "🌐",
    }
  );
}

export function getLanguageBcp47(code: string): string {
  const lang = LANGUAGE_MAP.get(code.toLowerCase());
  return lang ? lang.bcp47 : "en-US";
}

export function getLanguageName(code: string): string {
  const lang = LANGUAGE_MAP.get(code.toLowerCase());
  return lang ? lang.name : code.toUpperCase();
}
