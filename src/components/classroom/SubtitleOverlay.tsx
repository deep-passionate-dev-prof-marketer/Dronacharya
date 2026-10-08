import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Languages,
  Volume2,
  X,
  Globe,
  VolumeX,
} from "lucide-react";
import { LanguageCode } from "../../types";

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; flag: string; langCode: string }[] = [
  { code: "es", label: "Spanish (Español)", flag: "🇪🇸", langCode: "es-ES" },
  { code: "hi", label: "Hindi (हिन्दी)", flag: "🇮🇳", langCode: "hi-IN" },
  { code: "fr", label: "French (Français)", flag: "🇫🇷", langCode: "fr-FR" },
  { code: "de", label: "German (Deutsch)", flag: "🇩🇪", langCode: "de-DE" },
  { code: "zh", label: "Mandarin (中文)", flag: "🇨🇳", langCode: "zh-CN" },
  { code: "ar", label: "Arabic (العربية)", flag: "🇸🇦", langCode: "ar-SA" },
  { code: "ja", label: "Japanese (日本語)", flag: "🇯🇵", langCode: "ja-JP" },
];

export const SubtitleOverlay: React.FC = () => {
  const {
    isLiveSubtitlesActive,
    toggleLiveSubtitles,
    subtitleLanguage,
    setSubtitleLanguage,
    subtitleMode,
    currentLiveCaption,
  } = useClassroom();

  const [isVisible, setIsVisible] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);

  // Auto-fade timer: If no new caption updates for 5 seconds, fade out smoothly
  useEffect(() => {
    if (currentLiveCaption && currentLiveCaption.englishText.trim()) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [currentLiveCaption]);

  const speakCaption = (textToSpeak: string, lang: LanguageCode) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const langObj = LANGUAGE_OPTIONS.find((l) => l.code === lang);
    if (langObj) {
      utterance.lang = langObj.langCode;
    }
    utterance.onstart = () => setIsSpeakingTts(true);
    utterance.onend = () => setIsSpeakingTts(false);
    utterance.onerror = () => setIsSpeakingTts(false);
    window.speechSynthesis.speak(utterance);
  };

  if (!isLiveSubtitlesActive || !isVisible || !currentLiveCaption || !currentLiveCaption.englishText.trim()) {
    return null;
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl z-30 pointer-events-auto transition-all duration-300 animate-fadeIn">
      <div className="bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2">
        {/* Subtitle Header Bar */}
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white text-[12px] truncate max-w-[200px]">
              {currentLiveCaption.speakerName}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {currentLiveCaption.timestamp || "Live"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language switch */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-cyan-300 transition-colors"
                title="Change subtitle translation language"
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>{subtitleLanguage.toUpperCase()}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 bottom-7 w-44 bg-slate-900 border border-white/15 rounded-xl shadow-xl p-1 z-50 backdrop-blur-xl space-y-0.5 text-xs">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setSubtitleLanguage(opt.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        subtitleLanguage === opt.code
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span>{opt.flag} {opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Read Aloud */}
            {currentLiveCaption.translatedText && (
              <button
                onClick={() => speakCaption(currentLiveCaption.translatedText || "", currentLiveCaption.targetLanguage)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Read aloud in translated language"
              >
                {isSpeakingTts ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            )}

            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Dismiss caption"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Caption Text Body */}
        <div className="flex flex-col gap-1">
          {/* Spoken Utterance (English) */}
          {(subtitleMode === "dual" || subtitleMode === "english_only") && (
            <p className="text-white text-sm sm:text-base font-medium leading-relaxed drop-shadow-sm">
              {currentLiveCaption.englishText}
            </p>
          )}

          {/* Real-Time Translated Utterance */}
          {(subtitleMode === "dual" || subtitleMode === "target_only") && currentLiveCaption.translatedText && currentLiveCaption.translatedText !== currentLiveCaption.englishText && (
            <p className="text-amber-300/95 text-xs sm:text-sm font-medium leading-relaxed italic drop-shadow-sm">
              {currentLiveCaption.translatedText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
