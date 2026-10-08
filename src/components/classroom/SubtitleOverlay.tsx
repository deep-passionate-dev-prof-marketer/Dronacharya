import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Volume2,
  VolumeX,
  X,
  Globe,
  Sliders,
  Play,
  Zap,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguage } from "../../services/translation/languageConfig";
import { speechTranslationEngine } from "../../services/translation/speechTranslationEngine";
import { realtimeInterpreterService } from "../../services/translation/realtimeInterpreterService";
import { realtimeSpeechEngine } from "../../services/speechRecognitionService";

export const SubtitleOverlay: React.FC = () => {
  const {
    isLiveSubtitlesActive,
    subtitleLanguage,
    setSubtitleLanguage,
    subtitleMode,
    currentLiveCaption,
    setIsInterpreterModalOpen,
  } = useClassroom();

  const [isVisible, setIsVisible] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);

  // Auto-fade timer: If no new caption updates for 9 seconds, collapse to listening pill
  useEffect(() => {
    if (currentLiveCaption && currentLiveCaption.englishText?.trim()) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [currentLiveCaption]);

  const speakCaption = (textToSpeak: string, langCode: string) => {
    if (!textToSpeak.trim()) return;
    setIsSpeakingTts(true);
    speechTranslationEngine
      .speakTranslatedAudio(textToSpeak, langCode, 1.0)
      .finally(() => setIsSpeakingTts(false));
  };

  const handleQuickTest = async (speaker: string, text: string, src: string, tgt: string) => {
    setIsVisible(true);
    await realtimeInterpreterService.simulateUtterance(speaker, text, src, tgt);
  };

  if (!isLiveSubtitlesActive) {
    return null;
  }

  const prefs = realtimeInterpreterService.getPreferences();
  const srcLang = getLanguage(prefs.mySpokenLanguage || "hi");
  const tgtLang = getLanguage(currentLiveCaption?.targetLanguage || subtitleLanguage || "es");

  // When caption is idle/faded, show sleek listening badge with 1-click test triggers
  if (!isVisible || !currentLiveCaption || !currentLiveCaption.englishText?.trim()) {
    return (
      <div className="absolute bottom-20 md:bottom-22 left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-all duration-300 animate-fadeIn max-w-[96vw]">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#080d1c]/90 backdrop-blur-xl border border-cyan-500/30 rounded-full px-2.5 sm:px-3.5 py-1.5 shadow-xl shadow-black/80 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-semibold text-white text-[10px] sm:text-[11px] whitespace-nowrap">
            <span className="hidden sm:inline">AI </span>Interpreter:
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] text-cyan-300 whitespace-nowrap">
            {srcLang.flag} {srcLang.code.toUpperCase()} → {tgtLang.flag} {tgtLang.code.toUpperCase()}
          </span>

          <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 sm:pl-2 shrink-0">
            <button
              onClick={() =>
                handleQuickTest(
                  "Prof. Vance (Teacher)",
                  "आज हम fractions के बारे में सीखेंगे।",
                  srcLang.code,
                  tgtLang.code
                )
              }
              className="px-1.5 sm:px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 rounded text-[9px] sm:text-[10px] font-medium transition whitespace-nowrap"
              title={`Test speech translation into ${tgtLang.name}`}
            >
              {tgtLang.flag} <span className="hidden sm:inline">Test {tgtLang.name}</span>
            </button>
            <button
              onClick={() =>
                handleQuickTest(
                  "Student",
                  "I don't understand this part.",
                  "en",
                  tgtLang.code
                )
              }
              className="px-1.5 sm:px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[9px] sm:text-[10px] font-medium transition whitespace-nowrap"
              title={`Test Student to ${tgtLang.name} translation`}
            >
              🎓 <span className="hidden sm:inline">Student Query</span>
            </button>
            <button
              onClick={() => setIsInterpreterModalOpen(true)}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Open Interpreter Studio"
            >
              <Sliders className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[94%] max-w-2xl z-30 pointer-events-auto transition-all duration-300 animate-fadeIn">
      <div className="bg-[#080d1c]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/80 p-3.5 flex flex-col gap-2.5 text-slate-100 font-sans">
        
        {/* Subtitle Header Bar */}
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white text-[12px] truncate max-w-[150px] sm:max-w-[200px]">
              {currentLiveCaption.speakerName}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-cyan-300">
              {srcLang.flag} {srcLang.code.toUpperCase()} → {tgtLang.flag} {tgtLang.code.toUpperCase()}
            </span>
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400">
              {currentLiveCaption.timestamp || "Live"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Two-Way Test Triggers */}
            <button
              onClick={() =>
                handleQuickTest(
                  "Prof. Vance (Teacher)",
                  "आज हम fractions के बारे में सीखेंगे।",
                  srcLang.code,
                  tgtLang.code
                )
              }
              className="hidden sm:inline px-1.5 py-0.5 bg-amber-950/40 hover:bg-amber-900 border border-amber-500/30 text-amber-300 rounded text-[9px] font-semibold transition"
              title={`Test speech translation into ${tgtLang.name}`}
            >
              {tgtLang.flag} {tgtLang.name}
            </button>
            <button
              onClick={() =>
                handleQuickTest(
                  "Student",
                  "I don't understand this part.",
                  "en",
                  tgtLang.code
                )
              }
              className="hidden sm:inline px-1.5 py-0.5 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 rounded text-[9px] font-semibold transition"
              title={`Test Student Query into ${tgtLang.name}`}
            >
              🎓 Query
            </button>

            {/* Quick Language Switch Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-cyan-300 transition-colors"
                title="Change subtitle translation language"
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>{tgtLang.flag} {tgtLang.code.toUpperCase()}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 bottom-8 w-52 max-h-60 overflow-y-auto bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl p-1 z-50 backdrop-blur-xl space-y-0.5 text-xs">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                    50+ Available Languages
                  </div>
                  {SUPPORTED_LANGUAGES.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setSubtitleLanguage(opt.code as any);
                        realtimeSpeechEngine.setTargetLanguage(opt.code as any);
                        realtimeInterpreterService.updatePreferences({
                          targetTranslationLanguage: opt.code,
                        });
                        setShowLangMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        tgtLang.code === opt.code
                          ? "bg-cyan-600 text-white font-bold"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <span className="truncate">{opt.flag} {opt.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{opt.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Read Aloud TTS */}
            {currentLiveCaption.translatedText && (
              <button
                onClick={() =>
                  speakCaption(
                    currentLiveCaption.translatedText || "",
                    currentLiveCaption.targetLanguage
                  )
                }
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Read aloud in translated speech audio"
              >
                {isSpeakingTts ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>
            )}

            {/* Open Full Real-Time Interpreter Studio */}
            <button
              onClick={() => setIsInterpreterModalOpen(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              title="Open AI Real-time Live Interpreter Studio"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Dismiss caption box"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dual Caption Text Body */}
        <div className="flex flex-col gap-1.5">
          {/* Spoken Utterance (Original Spoken Language) */}
          {(subtitleMode === "dual" || subtitleMode === "english_only") && (
            <div className="flex items-start gap-1.5 text-slate-200">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 uppercase tracking-wider font-mono">
                {srcLang.code}
              </span>
              <p className="text-white text-xs sm:text-sm font-medium leading-relaxed drop-shadow-sm">
                {currentLiveCaption.englishText}
              </p>
            </div>
          )}

          {/* Real-Time Translated Utterance */}
          {(subtitleMode === "dual" || subtitleMode === "target_only") &&
            currentLiveCaption.translatedText &&
            currentLiveCaption.translatedText !== currentLiveCaption.englishText && (
              <div className="flex items-start gap-1.5 text-emerald-300">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 shrink-0 uppercase tracking-wider font-mono">
                  {tgtLang.code}
                </span>
                <p className="text-emerald-300 text-xs sm:text-sm font-semibold leading-relaxed drop-shadow-sm">
                  {currentLiveCaption.translatedText}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
