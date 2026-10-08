import React, { useState, useRef, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Languages,
  Download,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Globe,
  Trash2,
} from "lucide-react";
import { LanguageCode } from "../../types";
import { SUPPORTED_LANGUAGES } from "../../services/translation/languageConfig";

export const TranscriptFeed: React.FC = () => {
  const {
    transcriptLines,
    addTranscriptLine,
    pushLiveCaption,
    activeLanguage,
    setActiveLanguage,
    translateTranscripts,
    isTranslating,
    authenticatedUser,
    isSpeechRecognitionActive,
    toggleSpeechRecognition,
  } = useClassroom();

  const [inputSpeech, setInputSpeech] = useState("");
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptLines]);

  const currentSpeaker = authenticatedUser ? authenticatedUser.name : "You (Participant)";

  const handleSendLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSpeech.trim()) return;
    const text = inputSpeech.trim();
    addTranscriptLine(currentSpeaker, text);
    await pushLiveCaption(currentSpeaker, text);
    setInputSpeech("");
  };

  const handleExportTranscript = () => {
    if (transcriptLines.length === 0) return;
    const text = transcriptLines
      .map(
        (t) =>
          `[${t.timestamp}] ${t.speakerName}: ${t.translatedText || t.text}`
      )
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dronacharya-transcript-${activeLanguage}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070b14] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-white/10 bg-slate-900/90 px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Live AI Transcript</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {transcriptLines.length} lines
          </span>
        </div>

        {/* Translation & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-950 border border-white/10 rounded-lg px-2 py-1">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeLanguage}
              onChange={(e) => {
                const lang = e.target.value as LanguageCode;
                setActiveLanguage(lang);
                translateTranscripts(lang);
              }}
              disabled={isTranslating}
              className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportTranscript}
            disabled={transcriptLines.length === 0}
            title="Download full transcript as text"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transcript Feed List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isTranslating && (
          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center gap-2 text-xs text-cyan-300 font-mono animate-pulse">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Translating transcript via neural engine...</span>
          </div>
        )}

        {transcriptLines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-cyan-400">
              <Mic className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Live Transcript Active</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Speak into your microphone or type a note below to record real-time spoken text and translations.
            </p>
          </div>
        ) : (
          transcriptLines.map((line) => (
            <div
              key={line.id}
              className="rounded-xl bg-slate-900/80 border border-white/10 p-3 flex flex-col gap-1 shadow-sm"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-cyan-300">{line.speakerName}</span>
                <span className="font-mono text-slate-500">{line.timestamp}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {line.translatedText || line.text}
              </p>
            </div>
          ))
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Speech input & live transcription controls */}
      <form
        onSubmit={handleSendLine}
        className="h-14 border-t border-white/10 bg-slate-900/90 px-3 flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          title={isSpeechRecognitionActive ? "Mute live transcript microphone" : "Enable microphone transcription"}
          className={`p-2 rounded-xl transition-all ${
            isSpeechRecognitionActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
          }`}
        >
          {isSpeechRecognitionActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
        </button>

        <input
          type="text"
          placeholder="Speak into mic or type to broadcast live..."
          value={inputSpeech}
          onChange={(e) => setInputSpeech(e.target.value)}
          className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
        />

        <button
          type="submit"
          disabled={!inputSpeech.trim()}
          className="p-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 transition-colors disabled:opacity-40"
          title="Send transcription"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
