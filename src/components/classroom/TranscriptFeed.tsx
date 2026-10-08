import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Languages,
  Download,
  Mic,
  Send,
  Sparkles,
  Volume2,
  Check,
  Globe,
} from "lucide-react";
import { LanguageCode } from "../../types";

const LANGUAGES: Array<{ code: LanguageCode; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "US" },
  { code: "es", label: "Español", flag: "ES" },
  { code: "fr", label: "Français", flag: "FR" },
  { code: "de", label: "Deutsch", flag: "DE" },
  { code: "zh", label: "中文 (Mandarin)", flag: "CN" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "IN" },
  { code: "ar", label: "العربية (Arabic)", flag: "SA" },
];

export const TranscriptFeed: React.FC = () => {
  const {
    transcriptLines,
    addTranscriptLine,
    pushLiveCaption,
    activeLanguage,
    setActiveLanguage,
    translateTranscripts,
    isTranslating,
    currentUser,
  } = useClassroom();

  const [inputSpeech, setInputSpeech] = useState("");
  const [isSimulatingSpeech, setIsSimulatingSpeech] = useState(false);

  const handleSendLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSpeech.trim()) return;
    addTranscriptLine(currentUser.name, inputSpeech.trim());
    pushLiveCaption(currentUser.name, inputSpeech.trim());
    setInputSpeech("");
  };

  const handleSimulateSpeech = () => {
    setIsSimulatingSpeech(true);
    const phrases = [
      "Notice that the wave function collapse is strictly non-unitary during von Neumann projective measurements.",
      "In topological quantum computing, non-Abelian anyons braids form fault-tolerant quantum gates.",
      "Let's look at the density matrix ρ = ∑ p_i |ψ_i⟩⟨ψ_i| for this mixed state ensemble.",
      "The decoherence time T2 exceeds 120 microseconds in our helium-cooled transmon circuit.",
    ];
    const picked = phrases[Math.floor(Math.random() * phrases.length)];
    setTimeout(() => {
      addTranscriptLine("Dr. Evelyn Vance", picked);
      pushLiveCaption("Dr. Evelyn Vance", picked);
      setIsSimulatingSpeech(false);
    }, 600);
  };

  const handleExportTranscript = () => {
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
    a.download = `nexusstem-transcript-${activeLanguage}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-white">Live AI Transcripts</span>
        </div>

        {/* Translation & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5">
            <Languages className="w-3 h-3 text-slate-400" />
            <select
              value={activeLanguage}
              onChange={(e) => translateTranscripts(e.target.value as LanguageCode)}
              disabled={isTranslating}
              className="bg-transparent text-[11px] text-slate-300 focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportTranscript}
            title="Download full transcript as text"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transcript Feed List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {isTranslating && (
          <div className="p-2 rounded bg-indigo-950/60 border border-indigo-800/40 flex items-center gap-2 text-xs text-indigo-300 font-mono animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Translating academic transcript via Gemini neural engine...</span>
          </div>
        )}

        {transcriptLines.map((line) => (
          <div
            key={line.id}
            className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col gap-1 shadow-sm"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-indigo-300">{line.speakerName}</span>
              <span className="font-mono text-slate-400">{line.timestamp}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {line.translatedText || line.text}
            </p>
          </div>
        ))}
      </div>

      {/* Speech input & push-to-transcribe controls */}
      <form
        onSubmit={handleSendLine}
        className="h-14 border-t border-slate-800 bg-slate-900/90 px-3 flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={handleSimulateSpeech}
          disabled={isSimulatingSpeech}
          title="Simulate speech stream from instructor"
          className="p-2 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition-colors"
        >
          <Mic className={`w-3.5 h-3.5 ${isSimulatingSpeech ? "text-rose-400 animate-spin" : ""}`} />
        </button>

        <input
          type="text"
          placeholder="Speak or add manual transcription note..."
          value={inputSpeech}
          onChange={(e) => setInputSpeech(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
        />

        <button
          type="submit"
          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
