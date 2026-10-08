import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Languages,
  Mic,
  Volume2,
  Sparkles,
  X,
  Globe,
  Radio,
  Check,
  ChevronDown,
  Send,
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
    setSubtitleMode,
    currentLiveCaption,
    pushLiveCaption,
    isSpeechRecognitionActive,
    toggleSpeechRecognition,
    simulateNextClassroomUtterance,
    isLiveSpeechStreaming,
    currentRole,
  } = useClassroom();

  const [fontSize, setFontSize] = useState<"standard" | "large">("standard");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [customUtterance, setCustomUtterance] = useState("");
  const [showTestInput, setShowTestInput] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);

  // Text-To-Speech speech synthesis
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

  const handleSendCustomUtterance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUtterance.trim()) return;
    const speaker =
      currentRole === "instructor"
        ? "Dr. Evelyn Vance (Lead Facilitator)"
        : currentRole === "auditor"
        ? "Academic Auditor (Observer)"
        : "Student (Participant)";
    await pushLiveCaption(speaker, customUtterance.trim());
    setCustomUtterance("");
  };

  if (!isLiveSubtitlesActive) {
    return (
      <div className="absolute bottom-20 right-6 z-30 pointer-events-auto">
        <button
          onClick={toggleLiveSubtitles}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 hover:bg-[#003872] border border-slate-700/80 hover:border-[#0082FF] text-xs font-semibold text-white shadow-xl transition-all cursor-pointer"
          title="Open Real-Time Dual Captions"
        >
          <Languages className="w-3.5 h-3.5 text-[#00C2E0]" />
          <span>Subtitles CC [{subtitleLanguage.toUpperCase()}]</span>
        </button>
      </div>
    );
  }

  const activeCaption = currentLiveCaption || {
    speakerName: "Classroom Facilitator",
    englishText: "Awaiting speech input... Click 'Mic CC' or 'Next Speech' to generate live dual subtitles.",
    translatedText: "Esperando entrada de voz... Haga clic en 'Mic CC' o 'Next Speech' para generar subtítulos.",
    targetLanguage: subtitleLanguage,
    timestamp: "Ready",
  };

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-30 pointer-events-auto transition-all duration-200">
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 group hover:border-[#0082FF]/50 transition-colors">
        {/* Subtitle Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs flex-wrap gap-2">
          {/* Speaker Badge & Live indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#001F40] border border-[#003872] text-cyan-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate max-w-[170px] sm:max-w-[240px] font-semibold text-white">
                {activeCaption.speakerName}
              </span>
            </div>

            {/* Speaking Equalizer Waveform */}
            <div className="hidden sm:flex items-center gap-0.5 px-1">
              <span className="w-1 h-2 rounded bg-indigo-400 animate-pulse" />
              <span className="w-1 h-3.5 rounded bg-indigo-300 animate-pulse delay-75" />
              <span className="w-1 h-1.5 rounded bg-indigo-400 animate-pulse delay-150" />
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {activeCaption.timestamp || "LIVE"}
            </span>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5">
            {/* Real-time Mic Speech Recognition Toggle */}
            <button
              onClick={toggleSpeechRecognition}
              title={
                isLiveSpeechStreaming || isSpeechRecognitionActive
                  ? "Continuous Speech-to-Text streaming active (root engine)"
                  : "Enable live speech recognition on your microphone"
              }
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                isLiveSpeechStreaming || isSpeechRecognitionActive
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Mic className={`w-3 h-3 ${isLiveSpeechStreaming || isSpeechRecognitionActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span className="hidden md:inline">
                {isLiveSpeechStreaming || isSpeechRecognitionActive ? "Live Streaming Mic" : "Mic CC"}
              </span>
            </button>

            {/* Test Input Toggle */}
            <button
              onClick={() => setShowTestInput(!showTestInput)}
              title="Type custom phrase to translate"
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                showTestInput
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <span className="hidden sm:inline">Type Speech</span>
              <span className="sm:hidden">Type</span>
            </button>

            {/* Simulate Next Classroom Utterance */}
            <button
              onClick={simulateNextClassroomUtterance}
              title="Simulate speech from facilitator or classmate"
              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">Next Speech</span>
              <span className="sm:hidden">Next</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Globe className="w-3 h-3 text-indigo-400" />
                <span className="uppercase font-bold">{subtitleLanguage}</span>
                <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 bottom-7 w-48 rounded-xl bg-slate-900 border border-slate-700 p-1.5 shadow-2xl z-50 flex flex-col gap-0.5">
                  <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase">
                    Target Translation
                  </div>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSubtitleLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                        subtitleLanguage === lang.code
                          ? "bg-indigo-600 text-white"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{lang.flag}</span>
                        <span>{lang.label.split(" ")[0]}</span>
                      </span>
                      {subtitleLanguage === lang.code && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitle Mode (Dual / Target / EN) */}
            <button
              onClick={() => {
                if (subtitleMode === "dual") setSubtitleMode("target_only");
                else if (subtitleMode === "target_only") setSubtitleMode("english_only");
                else setSubtitleMode("dual");
              }}
              title="Toggle Subtitle Mode: Dual, Translation Only, or Universal English"
              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {subtitleMode === "dual"
                ? "Dual Mode"
                : subtitleMode === "target_only"
                ? "Translated"
                : "EN Only"}
            </button>

            {/* Font Size Toggle */}
            <button
              onClick={() => setFontSize(fontSize === "standard" ? "large" : "standard")}
              title="Toggle font size"
              className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              {fontSize === "standard" ? "A" : "A+"}
            </button>

            {/* TTS Audio Speak */}
            <button
              onClick={() =>
                speakCaption(
                  activeCaption.translatedText || activeCaption.englishText,
                  subtitleLanguage
                )
              }
              title="Speak translated text aloud (Text-to-Speech)"
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isSpeakingTts
                  ? "bg-[#0082FF] text-white animate-pulse"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {/* Dismiss Subtitle Overlay */}
            <button
              onClick={toggleLiveSubtitles}
              title="Hide Subtitles"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Custom Speech Input Box */}
        {showTestInput && (
          <form
            onSubmit={handleSendCustomUtterance}
            className="flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-xl border border-slate-800"
          >
            <input
              type="text"
              value={customUtterance}
              onChange={(e) => setCustomUtterance(e.target.value)}
              placeholder="Type any phrase to caption & translate instantly in real-time..."
              className="flex-1 bg-transparent border-0 px-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customUtterance.trim()}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Translate</span>
            </button>
          </form>
        )}

        {/* Subtitle Caption Text Lines */}
        <div className="flex flex-col gap-1.5 select-text">
          {/* Universal English Line */}
          {(subtitleMode === "dual" || subtitleMode === "english_only") && (
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
                EN:
              </span>
              <p
                className={`text-slate-100 font-sans font-medium leading-relaxed tracking-normal ${
                  fontSize === "large" ? "text-base sm:text-lg" : "text-sm sm:text-base"
                }`}
              >
                "{activeCaption.englishText}"
              </p>
            </div>
          )}

          {/* Real-time Target Language Translated Line */}
          {(subtitleMode === "dual" || subtitleMode === "target_only") && (
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFBB00] shrink-0">
                {subtitleLanguage.toUpperCase()}:
              </span>
              <p
                className={`text-[#FFBB00] font-sans font-medium leading-relaxed ${
                  fontSize === "large" ? "text-base sm:text-lg" : "text-xs sm:text-sm"
                }`}
              >
                "{activeCaption.translatedText || activeCaption.englishText}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
