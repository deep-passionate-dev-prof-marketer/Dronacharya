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
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { LanguageCode } from "../../types";
import { SUPPORTED_LANGUAGES, getLanguage } from "../../services/translation/languageConfig";
import { speechTranslationEngine } from "../../services/translation/speechTranslationEngine";
import { realtimeInterpreterService } from "../../services/translation/realtimeInterpreterService";

export const TranscriptFeed: React.FC = () => {
  const {
    transcriptLines,
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
  const [playingLineId, setPlayingLineId] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Follow new lines by scrolling only this list (scrollIntoView would also yank the swipe panes
  // and page), and only when the reader is already at the bottom so reading back isn't interrupted.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (nearBottom) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [transcriptLines]);

  const currentSpeaker = authenticatedUser ? authenticatedUser.name : "You (Participant)";

  const handleSendLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSpeech.trim()) return;
    const text = inputSpeech.trim();
    setInputSpeech("");
    await pushLiveCaption(currentSpeaker, text);
  };

  const handleQuickBenchmark = async (speaker: string, text: string, srcLang: string, tgtLang: string) => {
    await realtimeInterpreterService.simulateUtterance(speaker, text, srcLang, tgtLang);
  };

  const handleSpeakLine = (lineId: string, text: string, langCode: string) => {
    if (!text) return;
    setPlayingLineId(lineId);
    speechTranslationEngine
      .speakTranslatedAudio(text, langCode, 1.0)
      .finally(() => setPlayingLineId(null));
  };

  const handleExportTranscript = () => {
    if (transcriptLines.length === 0) return;
    const text = transcriptLines
      .map(
        (t) =>
          `[${t.timestamp}] ${t.speakerName}:\nOriginal: ${t.text}\nTranslated (${t.language || "es"}): ${t.translatedText || t.text}\n`
      )
      .join("\n---\n\n");
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
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden select-none font-sans">
      {/* Top Header */}
      <div className="h-12 border-b border-white/10 bg-slate-900/90 px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-white">Live AI Transcripts</span>
          <span className="text-2xs px-1.5 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
              className="bg-transparent text-2xs text-slate-200 focus:outline-none cursor-pointer max-w-[120px]"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  [{l.code.toUpperCase()}] {l.name}
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

      {/* Quick Benchmark Speech Triggers */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto text-2xs">
        <span className="text-2xs text-slate-400 font-semibold shrink-0">Two-Way Test:</span>
        <button
          onClick={() => {
            const tgt = activeLanguage !== "en" ? activeLanguage : "es";
            handleQuickBenchmark(
              "Prof. Vance (Teacher)",
              "आज हम fractions के बारे में सीखेंगे।",
              "hi",
              tgt
            );
          }}
          className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 rounded-md shrink-0 flex items-center gap-1.5 transition"
        >
          <Languages className="w-3.5 h-3.5 text-amber-400" />
          <span>Teacher: Fractions → {(activeLanguage !== "en" ? activeLanguage : "es").toUpperCase()}</span>
        </button>
        <button
          onClick={() => {
            const tgt = activeLanguage !== "en" ? activeLanguage : "es";
            handleQuickBenchmark(
              "Student",
              "I don't understand this part.",
              "en",
              tgt
            );
          }}
          className="px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 rounded-md shrink-0 flex items-center gap-1.5 transition"
        >
          <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Student Query → {(activeLanguage !== "en" ? activeLanguage : "es").toUpperCase()}</span>
        </button>
        <button
          onClick={() => {
            const tgt = activeLanguage !== "en" ? activeLanguage : "es";
            handleQuickBenchmark(
              "Prof. Vance (Teacher)",
              "Take the square root of 16.",
              "en",
              tgt
            );
          }}
          className="px-2 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 rounded-md shrink-0 flex items-center gap-1.5 transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>STEM → {(activeLanguage !== "en" ? activeLanguage : "es").toUpperCase()}</span>
        </button>
      </div>

      {/* Transcript Feed List */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
        {isTranslating && (
          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center gap-2 text-xs text-cyan-300 font-mono animate-pulse">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Translating transcript via neural engine...</span>
          </div>
        )}

        {transcriptLines.map((line) => {
          const isPlaying = playingLineId === line.id;
          return (
            <div
              key={line.id}
              className="rounded-xl bg-slate-900/80 border border-white/10 p-3 flex flex-col gap-1.5 shadow-sm hover:border-cyan-500/30 transition"
            >
              <div className="flex items-center justify-between text-2xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="font-semibold text-cyan-300">{line.speakerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-500 text-2xs">{line.timestamp}</span>
                  <button
                    onClick={() =>
                      handleSpeakLine(
                        line.id,
                        line.translatedText || line.text,
                        line.language || activeLanguage
                      )
                    }
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition"
                    title="Listen to synthesized voice audio"
                  >
                    {isPlaying ? (
                      <VolumeX className="w-3 h-3 text-rose-400 animate-spin" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Spoken original */}
              <div className="text-xs text-slate-300 font-medium leading-relaxed">
                {line.text}
              </div>

              {/* Translated text if different */}
              {line.translatedText && line.translatedText !== line.text && (
                <div className="text-xs text-emerald-300 font-semibold italic border-t border-white/5 pt-1 mt-0.5 flex items-start gap-1">
                  <span className="text-2xs not-italic px-1 py-0.2 bg-emerald-950/80 border border-emerald-500/30 rounded text-emerald-400 shrink-0">
                    {(line.language || activeLanguage).toUpperCase()}
                  </span>
                  <span>{line.translatedText}</span>
                </div>
              )}
            </div>
          );
        })}
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
          title={
            isSpeechRecognitionActive
              ? "Mute live transcript microphone"
              : "Enable microphone transcription"
          }
          className={`p-2 rounded-xl transition-all ${
            isSpeechRecognitionActive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
          }`}
        >
          {isSpeechRecognitionActive ? (
            <Mic className="w-4 h-4 animate-pulse" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>

        <input
          type="text"
          placeholder="Type or speak into microphone to transcribe and translate..."
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
