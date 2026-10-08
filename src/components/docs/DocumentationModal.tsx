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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-md font-sans">
      <div className="w-full max-w-6xl h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 bg-[#001F40] text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#003872] flex items-center justify-center text-[#FFBB00]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Dronacharya Engineering & Business Documentation
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFBB00] text-[#001F40]">
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
        <div className="flex-1 flex overflow-hidden">
          {/* Left Index Sidebar (260px) */}
          <div className="w-72 bg-slate-50 border-r border-slate-200 p-4 flex flex-col shrink-0">
            {/* Search filter */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specs..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 outline-none focus:border-[#003872]"
              />
            </div>

            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
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
                        ? "bg-[#003872] text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-200/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px]">{doc.id}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
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
            <div className="mt-4 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 font-mono">
              <span className="block font-bold">File Location:</span>
              <span>/docs/{currentMeta.file}</span>
            </div>
          </div>

          {/* Right Content Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Active Document Subheader */}
            <div className="h-12 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs">
                <FileText className="w-4 h-4 text-[#003872]" />
                <span className="font-bold text-slate-800">{currentMeta.title}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-500">/docs/{currentMeta.file}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Category: <strong className="text-slate-700">{currentMeta.category}</strong>
              </span>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 font-mono text-xs text-slate-800 leading-relaxed select-text">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <span>Loading documentation file...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 bg-transparent">
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
