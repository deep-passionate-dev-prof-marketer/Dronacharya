import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  X,
  Download,
  Copy,
  Check,
  Code,
  Layers,
  Cpu,
  ShieldCheck,
  TrendingUp,
  Workflow,
  Search,
} from "lucide-react";

interface DocMeta {
  id: string;
  title: string;
  file: string;
  badge: string;
  category: "Business" | "Product" | "Architecture" | "Engineering";
}

const DOCS_CATALOG: DocMeta[] = [
  {
    id: "PRD",
    title: "Product Requirements Document (PRD)",
    file: "PRD.md",
    badge: "v2.4 Approved",
    category: "Product",
  },
  {
    id: "BRD",
    title: "Business Requirements Document (BRD)",
    file: "BRD.md",
    badge: "Unit Economics",
    category: "Business",
  },
  {
    id: "LMD",
    title: "Low-Level Model Document (LMD)",
    file: "LMD.md",
    badge: "WebSocket Wire & Models",
    category: "Engineering",
  },
  {
    id: "MMD",
    title: "Mid-Level Architecture Document (MMD)",
    file: "MMD.md",
    badge: "Partition Engine & Pub/Sub",
    category: "Engineering",
  },
  {
    id: "HMD",
    title: "High-Level Model Document (HMD)",
    file: "HMD.md",
    badge: "Global Edge Mesh",
    category: "Architecture",
  },
  {
    id: "FEATURES",
    title: "Features & Functionality Matrix",
    file: "FEATURES_AND_FUNCTIONALITY.md",
    badge: "Complete Capabilities",
    category: "Product",
  },
  {
    id: "FLOWS",
    title: "Architecture & Wire Sequences",
    file: "ARCHITECTURE_AND_FLOWS.md",
    badge: "Sequence Diagrams",
    category: "Architecture",
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDocId?: string;
}

export const DocumentationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultDocId = "PRD",
}) => {
  const [activeDocId, setActiveDocId] = useState<string>(defaultDocId);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadDoc(activeDocId);
    }
  }, [isOpen, activeDocId]);

  const loadDoc = async (docId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/docs/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
      } else {
        setContent(`### Documentation for ${docId}\n\nLoading documentation from /docs/${docId}.md...`);
      }
    } catch {
      setContent(`### Error loading documentation file: /docs/${docId}.md`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDocId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const currentMeta = DOCS_CATALOG.find((d) => d.id === activeDocId) || DOCS_CATALOG[0];

  const filteredCatalog = DOCS_CATALOG.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-sans">
      <div className="pb-[env(safe-area-inset-bottom)] sm:pb-0 animate-sheetUp sm:animate-fadeIn w-full max-w-6xl h-[94dvh] sm:h-[88vh] bg-slate-900/70 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 bg-brand-navy-deep text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-navy flex items-center justify-center text-brand-yellow">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Dronacharya Engineering & Business Documentation
                </h2>
                <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-brand-yellow text-brand-navy-deep">
                  Standalone Suite
                </span>
              </div>
              <p className="text-xs text-slate-300">
                PRD, BRD, LMD, MMD, HMD, Features Matrix & Architectural Wire Flows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
              title="Copy markdown content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Markdown"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
              title="Download markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-2"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Index: a compact strip on phones, a sidebar from md up */}
          <div className="w-full md:w-72 max-h-[38%] md:max-h-none overflow-y-auto bg-white/[0.03] border-b md:border-b-0 md:border-r border-white/10 p-3 md:p-4 flex flex-col shrink-0">
            {/* Search filter */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specs..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/70 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Document Catalog
            </div>

            <div className="space-y-1 overflow-y-auto flex-1">
              {filteredCatalog.map((doc) => {
                const isSelected = doc.id === activeDocId;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setActiveDocId(doc.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-brand-navy text-white shadow-xs"
                        : "text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xs">{doc.id}</span>
                      <span
                        className={`text-2xs px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {doc.badge}
                      </span>
                    </div>
                    <span className="font-sans text-xs truncate leading-snug">{doc.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Storage path notice */}
            <div className="mt-4 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-2xs text-blue-300 font-mono">
              <span className="block font-bold">File Location:</span>
              <span>/docs/{currentMeta.file}</span>
            </div>
          </div>

          {/* Right Content Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/70">
            {/* Active Document Subheader */}
            <div className="h-12 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs">
                <FileText className="w-4 h-4 text-blue-300" />
                <span className="font-bold text-slate-100">{currentMeta.title}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-400">/docs/{currentMeta.file}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Category: <strong className="text-slate-200">{currentMeta.category}</strong>
              </span>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 font-mono text-xs text-slate-100 leading-relaxed select-text">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <span>Loading documentation file...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-100 bg-transparent">
                  {content}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
