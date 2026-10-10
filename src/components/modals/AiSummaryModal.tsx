import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { X, Sparkles, Download, Copy, Check, RefreshCw, FileText, BookOpen } from "lucide-react";
import { requestTranscriptSummary, SummaryResponse } from "../../services/geminiService";

export const AiSummaryModal: React.FC = () => {
  const {
    isAiSummaryModalOpen,
    setIsAiSummaryModalOpen,
    transcriptLines,
    roomTitle,
    setActiveView,
  } = useClassroom();

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAiSummaryModalOpen && !summaryData) {
      handleGenerate();
    }
  }, [isAiSummaryModalOpen]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await requestTranscriptSummary(
        transcriptLines,
        "Advanced Quantum Mechanics & Superconducting Qubits",
        roomTitle
      );
      setSummaryData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAiSummaryModalOpen) return null;

  const handleCopy = () => {
    if (!summaryData) return;
    const fullText = `${summaryData.summary}\n\nKey Formulas:\n${(summaryData.keyFormulas || []).join("\n")}\n\nAction Items:\n${(summaryData.actionItems || []).join("\n")}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summaryData) return;
    const fullText = `# Automated Post-Session STEM Digest: ${roomTitle}\nDate: ${new Date().toLocaleDateString()}\n\n${summaryData.summary}\n\n## Key Formulas\n${(summaryData.keyFormulas || []).map((f) => `- ${f}`).join("\n")}\n\n## Action Items\n${(summaryData.actionItems || []).map((a) => `- [ ] ${a}`).join("\n")}`;
    const blob = new Blob([fullText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexusstem-lecture-summary-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="animate-sheetUp sm:animate-fadeIn w-full max-w-2xl max-h-[94dvh] sm:max-h-[90dvh] rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-indigo-500/40 p-6 flex flex-col gap-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Automated AI Post-Session Digest</h2>
              <p className="text-2xs text-slate-400">
                Generated via Google Gemini 3.8 from live classroom transcript & telemetry
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiSummaryModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 text-xs">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
              <div className="text-xs font-mono">
                Synthesizing academic transcript into structured study guide...
              </div>
            </div>
          ) : summaryData ? (
            <div className="flex flex-col gap-4">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 leading-relaxed text-slate-300 whitespace-pre-line font-sans shadow-sm">
                {summaryData.summary}
              </div>

              {/* Key Formulas */}
              {summaryData.keyFormulas && summaryData.keyFormulas.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="font-semibold text-white text-xs font-mono text-indigo-300">
                    Key Mathematical Formulas & Scientific Principles
                  </div>
                  <div className="flex flex-col gap-1.5 font-mono text-slate-300">
                    {summaryData.keyFormulas.map((formula, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800">
                        {formula}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {summaryData.actionItems && summaryData.actionItems.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="font-semibold text-white text-xs text-amber-300">
                    Laboratory & Homework Action Items
                  </div>
                  <ul className="list-disc list-inside flex flex-col gap-1 text-slate-300">
                    {summaryData.actionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>

            <button
              onClick={() => {
                setIsAiSummaryModalOpen(false);
                setActiveView("notebook");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Open LLM Concept Graph</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!summaryData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!summaryData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
