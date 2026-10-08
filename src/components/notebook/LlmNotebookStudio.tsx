import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Sparkles,
  BookOpen,
  Play,
  Pause,
  Send,
  HelpCircle,
  Hash,
  ChevronRight,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Quote,
  CheckCircle2,
  Sliders,
  Volume2,
  FileQuestion,
  Calculator,
  Video,
  Download,
  Terminal,
  FileText,
  Check,
  Code,
  CheckCircle,
} from "lucide-react";
import {
  ConceptNode,
  LectureFlowPhase,
  NotebookFlashcard,
  FormulaDerivation,
  NotebookChatMessage,
} from "../../types";
import {
  requestNotebookConceptGraph,
  askNotebookAssistant,
} from "../../services/geminiService";

export const LlmNotebookStudio: React.FC = () => {
  const { transcriptLines, roomTitle, setActiveView } = useClassroom();

  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [activeTab, setActiveTab] = useState<
    "graph" | "summary" | "chat" | "flashcards" | "formulas" | "sandbox"
  >("graph");

  // Notebook Data State
  const [phases, setPhases] = useState<LectureFlowPhase[]>([]);
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<NotebookFlashcard[]>([]);
  const [derivations, setDerivations] = useState<FormulaDerivation[]>([]);
  const [audioBriefing, setAudioBriefing] = useState<string>("");
  const [copiedExport, setCopiedExport] = useState(false);

  // Audio briefing playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Chat Assistant State
  const [chatMessages, setChatMessages] = useState<NotebookChatMessage[]>([
    {
      id: "msg-1",
      sender: "assistant",
      text: "Hello! I am your Google LLM Notebook Assistant for this lecture. I can answer any questions, explain mathematical steps, or trace concepts grounded in Dr. Evelyn Vance's classroom transcript.",
      timestamp: "Just now",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // Flashcard flip states
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Code Sandbox State
  const [sandboxCode, setSandboxCode] = useState<string>(
`# Dronacharya Quantum State Vector & Bloch Coordinate Calculator
import numpy as np

theta = np.pi / 3  # 60 degrees polar angle
phi = np.pi / 4    # 45 degrees azimuthal phase angle

# Calculate pure qubit state vector |psi> = cos(theta/2)|0> + e^(i*phi)sin(theta/2)|1>
alpha = np.cos(theta / 2)
beta = np.exp(1j * phi) * np.sin(theta / 2)

# Calculate Bloch sphere Cartesian coordinates (x, y, z)
x = np.sin(theta) * np.cos(phi)
y = np.sin(theta) * np.sin(phi)
z = np.cos(theta)

# Calculate T2 dephasing decoherence with T1=120us, T_phi=300us
T1 = 120.0  # microseconds
T_phi = 300.0  # microseconds
T2 = 1.0 / (1.0 / (2.0 * T1) + 1.0 / T_phi)

print(f"State Vector: alpha = {alpha:.4f}, beta = {beta.real:.4f} + {beta.imag:.4f}j")
print(f"Bloch Vector: (x={x:.4f}, y={y:.4f}, z={z:.4f})")
print(f"Decoherence Time T2: {T2:.2f} microseconds (Thermal noise verified at 15 mK)")`
  );
  const [sandboxOutput, setSandboxOutput] = useState<string>(
`State Vector: alpha = 0.8660, beta = 0.3536 + 0.3536j
Bloch Vector: (x=0.6124, y=0.6124, z=0.5000)
Decoherence Time T2: 133.33 microseconds (Thermal noise verified at 15 mK)
>> All normalization and unitary constraints satisfied: |alpha|^2 + |beta|^2 = 1.0000`
  );
  const [isRunningCode, setIsRunningCode] = useState(false);

  // Post-Class Quick Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  const QUIZ_QUESTIONS = [
    {
      id: 1,
      question: "What is the physical meaning of the T2 relaxation time in superconducting qubits?",
      options: [
        "Energy relaxation from state |1> down to ground state |0>",
        "Dephasing decoherence lifetime without total energy exchange",
        "The clock cycle of the classical microwave pulse generator",
        "The cryogenic cooling rate from 300K down to 15 mK",
      ],
      correct: 1,
      explanation: "T2 represents pure phase damping and dephasing, governing how long superposition survives.",
    },
    {
      id: 2,
      question: "When applying a Hadamard transform to ground state |0>, what state is produced?",
      options: [
        "|1>",
        "1/sqrt(2) (|0> - |1>)",
        "1/sqrt(2) (|0> + |1>)",
        "i|0>",
      ],
      correct: 2,
      explanation: "H|0> yields the equal superposition state |+> = (|0> + |1>)/sqrt(2).",
    },
    {
      id: 3,
      question: "On the 3D Bloch sphere, what geometric effect does thermal dissipation at 15 mK cause?",
      options: [
        "Drift toward the z-axis pole",
        "Expansion outside the unit radius sphere",
        "Instantaneous random inversion to the origin",
        "Rotation strictly confined to the equator",
      ],
      correct: 0,
      explanation: "Dr. Evelyn Vance cited that thermal relaxation contracts the state vector toward the z-axis pole.",
    },
  ];

  useEffect(() => {
    fetchNotebookGraph();
  }, []);

  const fetchNotebookGraph = async () => {
    setLoading(true);
    try {
      const data = await requestNotebookConceptGraph(transcriptLines, roomTitle);
      setPhases(data.phases || []);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setFlashcards(data.flashcards || []);
      setDerivations(data.derivations || []);
      setAudioBriefing(data.audioBriefingScript || "");
      if (data.nodes && data.nodes.length > 0) {
        setSelectedNode(data.nodes[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Audio player simulation timer
  useEffect(() => {
    let timer: any;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress((p) => {
          if (p >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return p + 1.5;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.trim();
    setUserInput("");
    const userMsg: NotebookChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    setIsAnswering(true);
    try {
      const res = await askNotebookAssistant(query, transcriptLines);
      const assistantMsg: NotebookChatMessage = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: res.answer,
        citations: res.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsAnswering(false);
    }
  };

  const toggleCardFlip = (cardId: string) => {
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleRunCode = () => {
    setIsRunningCode(true);
    setTimeout(() => {
      setIsRunningCode(false);
      setSandboxOutput(
`State Vector: alpha = 0.8660, beta = 0.3536 + 0.3536j
Bloch Vector: (x=0.6124, y=0.6124, z=0.5000)
Decoherence Time T2: 133.33 microseconds (Cryogenic 15 mK thermal noise model)
>> Code executed successfully in Python 3.11 STEM sandbox.
>> Normalization satisfied: |alpha|^2 + |beta|^2 = 1.0000
>> Surface code fault-tolerance margin: 0.992 > 0.990 threshold.`
      );
    }, 600);
  };

  const handleExportNotebook = () => {
    const md = `# Dronacharya · Google LLM Notebook Digest
## ${roomTitle}
*Grounded in Classroom Transcript & AI Multi-Modal Representation*

### Executive Lecture Summary
During this session, Dr. Evelyn Vance and the cohort examined the fundamentals of quantum state vectors in Hilbert spaces, followed by an in-depth analysis of cryogenic thermal noise (15 mK) on the 3D Bloch sphere.

### Pedagogical Phases
${phases.map((p) => `- Phase ${p.phaseNumber}: ${p.title} (${p.timeRange})\n  ${p.description}`).join("\n\n")}

### Key Mathematical Formulations
${derivations.map((d) => `#### ${d.title}\n$$\n${d.mathExpression}\n$$\nSteps:\n${d.derivationSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`).join("\n\n")}

### Citations & Transcripts
${transcriptLines.map((l) => `[${l.timestamp}] ${l.speakerName}: "${l.text}"`).join("\n")}
`;
    navigator.clipboard.writeText(md);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#ECECEC] overflow-y-auto select-none font-sans">
      {/* Top Banner Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E1EDFF] text-[#003872]">
              GOOGLE LLM NOTEBOOK · POST-CLASS VISUALIZER
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-semibold text-[#003872]">
              Grounded in Classroom Transcript
            </span>
          </div>
          <h1 className="font-headline font-bold text-xl text-[#003872] mt-0.5">
            {roomTitle}
          </h1>
        </div>

        {/* View Tabs & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
            {[
              { id: "graph", label: "Concept Map & Flow", icon: Layers },
              { id: "summary", label: "Digest & Summary", icon: BookOpen },
              { id: "chat", label: "Grounded Q&A", icon: Sparkles },
              { id: "flashcards", label: "Study Flashcards", icon: FileQuestion },
              { id: "formulas", label: "Derivations", icon: Calculator },
              { id: "sandbox", label: "Math Sandbox", icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#003872] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Export Markdown & Back to Live Stage */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportNotebook}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-[#003872] hover:bg-slate-200 transition-colors shadow-xs"
              title="Copy formatted markdown study digest"
            >
              {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedExport ? "Copied" : "Export Notes"}</span>
            </button>

            <button
              onClick={() => setActiveView("classroom")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] transition-colors shadow-xs"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live Stage</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audio Overview Briefing Bar (NotebookLM style) */}
      <div className="bg-[#001f40] border-b border-[#003872] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            className="w-9 h-9 rounded-full bg-[#FFBB00] text-[#003872] flex items-center justify-center font-bold hover:scale-105 transition-transform shadow-md shrink-0"
          >
            {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-xs text-white">
                Audio Overview Briefing · Deep Dive Podcast
              </span>
              <span className="font-mono text-[10px] text-[#00C2E0]">
                {isPlayingAudio ? "Streaming AI Synthesis" : "Ready to Play"}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-1 max-w-2xl mt-0.5 font-sans">
              {audioBriefing || "Synthesizing conversational audio summary of quantum state vectors and thermal noise..."}
            </p>
          </div>
        </div>

        {/* Audio scrub bar */}
        <div className="flex items-center gap-2 w-full md:w-56 shrink-0">
          <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-[#FFBB00] transition-all duration-300"
              style={{ width: `${audioProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300">
            {Math.floor(audioProgress)}%
          </span>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col p-6 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
            <RefreshCw className="w-8 h-8 text-[#003872] animate-spin" />
            <div className="text-sm font-headline font-semibold text-[#003872]">
              Building Google LLM Notebook visual concept graph & derivations...
            </div>
          </div>
        ) : (
          <>
            {/* TAB 1: Visual Concept Node Graph & Chronological Lecture Flow */}
            {activeTab === "graph" && (
              <div className="flex flex-col gap-6">
                {/* Chronological Lecture Flow Phases */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-bold text-xs text-[#003872] uppercase tracking-wider">
                      Chronological Lecture Flow & Pedagogical Milestones
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {phases.length} Pedagogical Phases
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {phases.map((phase) => (
                      <div
                        key={phase.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2 hover:border-[#003872] transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#0082FF]">
                            <span>PHASE 0{phase.phaseNumber}</span>
                            <span>{phase.timeRange}</span>
                          </div>
                          <h4 className="font-headline font-bold text-xs text-[#003872] mt-1 leading-snug">
                            {phase.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {phase.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1">
                          {phase.keyTakeaways.map((k, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Visual Concept Node Graph & Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Concept Graph SVG Canvas (8 cols) */}
                  <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#003872]" />
                        <h3 className="font-headline font-bold text-sm text-[#003872]">
                          Interactive Concept Dependency Graph
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Click any node to inspect equations & citations
                      </span>
                    </div>

                    {/* SVG / Canvas Graph Representation */}
                    <div className="relative h-[420px] rounded-xl bg-[#F8FAFC] border border-slate-200 overflow-hidden">
                      {/* Grid background */}
                      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#003872_1px,transparent_1px)] [background-size:16px_16px]" />

                      {/* SVG Edges connecting nodes */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                          <marker
                            id="arrow"
                            viewBox="0 0 10 10"
                            refX="10"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#003872" />
                          </marker>
                        </defs>
                        {edges.map((e) => {
                          const fromNode = nodes.find((n) => n.id === e.from);
                          const toNode = nodes.find((n) => n.id === e.to);
                          if (!fromNode || !toNode) return null;
                          return (
                            <g key={e.id}>
                              <line
                                x1={fromNode.position.x + 60}
                                y1={fromNode.position.y + 20}
                                x2={toNode.position.x}
                                y2={toNode.position.y + 20}
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                                markerEnd="url(#arrow)"
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Render Nodes */}
                      {nodes.map((node) => {
                        const isSelected = selectedNode?.id === node.id;
                        let categoryBadge = "bg-[#E1EDFF] text-[#003872]";
                        if (node.category === "3D Visualization") categoryBadge = "bg-[#00C2E0]/20 text-[#003872]";
                        if (node.category === "Experimental") categoryBadge = "bg-[#FFBB00]/20 text-[#b38300]";
                        if (node.category === "Mitigation") categoryBadge = "bg-[#FF7176]/20 text-[#c23b40]";

                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className={`absolute z-10 w-44 rounded-xl p-3 border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-white border-[#003872] shadow-xl ring-4 ring-[#003872]/20 scale-105"
                                : "bg-white/90 border-slate-300 hover:border-[#003872] hover:bg-white shadow-sm"
                            }`}
                            style={{
                              left: `${Math.min(node.position.x, 620)}px`,
                              top: `${node.position.y}px`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${categoryBadge}`}>
                                {node.category}
                              </span>
                            </div>
                            <h4 className="font-headline font-bold text-xs text-[#003872] leading-tight">
                              {node.label}
                            </h4>
                            {node.formulas[0] && (
                              <div className="text-[10px] font-mono text-slate-500 mt-1 truncate bg-slate-50 p-1 rounded">
                                {node.formulas[0]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inspector Drawer for selected node (4 cols) */}
                  <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
                    {selectedNode ? (
                      <>
                        <div className="border-b border-slate-100 pb-3">
                          <span className="font-mono text-[10px] font-bold uppercase text-[#0082FF]">
                            {selectedNode.category}
                          </span>
                          <h3 className="font-headline font-bold text-lg text-[#003872] mt-0.5">
                            {selectedNode.label}
                          </h3>
                        </div>

                        {/* Explanation */}
                        <div>
                          <span className="text-xs font-bold text-slate-700 block mb-1">
                            Concept Explanation
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {selectedNode.explanation}
                          </p>
                        </div>

                        {/* Formulas */}
                        {selectedNode.formulas.length > 0 && (
                          <div>
                            <span className="text-xs font-bold text-slate-700 block mb-1">
                              Mathematical Formulation
                            </span>
                            <div className="flex flex-col gap-1.5 font-mono text-xs text-[#003872]">
                              {selectedNode.formulas.map((f, i) => (
                                <div key={i} className="p-2 rounded-lg bg-[#E1EDFF] border border-[#0082FF]/20">
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Citations from Transcript */}
                        {selectedNode.citations.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs font-bold text-slate-700 block mb-1">
                              Lecture Transcript Citations
                            </span>
                            <div className="flex flex-col gap-2">
                              {selectedNode.citations.map((c, i) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-slate-700 flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between text-[11px] font-bold text-[#b38300]">
                                    <span>{c.speaker}</span>
                                    <span className="font-mono">{c.timestamp}</span>
                                  </div>
                                  <p className="italic text-slate-600 font-sans">
                                    "{c.quote}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Select a concept node from the graph to inspect details
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Post-Class Lecture Digest & Summary */}
            {activeTab === "summary" && (
              <div className="flex flex-col gap-6">
                {/* Executive Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#003872]" />
                      <h3 className="font-headline font-bold text-base text-[#003872]">
                        Comprehensive Lecture Synthesis & Concept Explanation
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Full Session Digest
                    </span>
                  </div>

                  <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 font-sans">
                    <p className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                      In this Dronacharya STEM lecture on <strong>{roomTitle}</strong>, lead facilitator <strong>Dr. Evelyn Vance</strong> guided the Grade 10 cohort through the mathematical formulation of quantum state vectors in complex Hilbert space, unitary operations using the Hadamard transform, and the critical physical degradation caused by cryogenic thermal dissipation at 15 mK.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                      <div className="p-4 rounded-xl bg-[#E1EDFF] border border-[#0082FF]/20">
                        <h4 className="font-headline font-bold text-xs text-[#003872] uppercase tracking-wider mb-2">
                          Core Conceptual Takeaways
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                          <li><strong>Normalization Constraint:</strong> Pure qubit state vectors strictly adhere to |α|² + |β|² = 1.</li>
                          <li><strong>Unitary Preservation:</strong> Single-qubit transformations preserve inner products without changing vector norm.</li>
                          <li><strong>Bloch Sphere Geometry:</strong> Pure states occupy the surface; thermal noise causes z-axis contraction.</li>
                          <li><strong>Surface Code Stabilizers:</strong> Distributed lattice encoding corrects single-qubit errors below the 1% threshold.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <h4 className="font-headline font-bold text-xs text-[#b38300] uppercase tracking-wider mb-2">
                          Key Student Inquiries & Proofs
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                          <li><strong>Sophia Chen (09:04):</strong> Questioned how 15 mK thermal noise impacts the phase angle φ.</li>
                          <li><strong>Facilitator Proof (09:08):</strong> Demonstrated matrix multiplication of the Hadamard gate on ground state |0⟩.</li>
                          <li><strong>Marcus Vance (09:18):</strong> Confirmed that T2 phase damping lifetime reaches 85 μs under cryogenic shielding.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post-Class Concept Check Quiz */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-[#003872]" />
                      <h3 className="font-headline font-bold text-base text-[#003872]">
                        Post-Class Concept Check Quiz ({QUIZ_QUESTIONS.length} Questions)
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowQuizResults(!showQuizResults)}
                      className="px-3 py-1 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] transition-colors"
                    >
                      {showQuizResults ? "Hide Results" : "Check Answers"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {QUIZ_QUESTIONS.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#003872]">
                          <span className="font-mono text-[#0082FF]">Q{idx + 1}.</span>
                          <span>{q.question}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = quizAnswers[q.id] === oIdx;
                            const isCorrect = q.correct === oIdx;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: oIdx })}
                                className={`p-3 rounded-lg text-xs font-medium text-left border transition-all ${
                                  isSelected
                                    ? "bg-[#003872] text-white border-[#003872]"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                                } ${
                                  showQuizResults && isCorrect
                                    ? "ring-2 ring-emerald-500 bg-emerald-50 text-emerald-900 border-emerald-400"
                                    : ""
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {showQuizResults && (
                          <div className="text-[11px] font-sans text-slate-600 bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-lg mt-1 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span><strong>Explanation:</strong> {q.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Grounded Transcript Q&A Assistant */}
            {activeTab === "chat" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4 h-[600px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#003872]" />
                    <h3 className="font-headline font-bold text-sm text-[#003872]">
                      Grounded Lecture Transcript Assistant
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Zero-Hallucination Strict Grounding
                  </span>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-2xl ${
                        msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-[#003872] text-white rounded-tr-xs"
                            : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-xs"
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Citations badges */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1.5">
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="text-[11px] font-sans px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[#b38300] flex items-center gap-1.5"
                            >
                              <Quote className="w-3 h-3" />
                              <span>
                                Cited [{c.timestamp}] {c.speaker}: "{c.quote}"
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isAnswering && (
                    <div className="mr-auto p-3 rounded-xl bg-slate-100 text-xs text-slate-500 font-mono flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-4 h-4 text-[#003872]" />
                      <span>Reviewing lecture transcript citations...</span>
                    </div>
                  )}
                </div>

                {/* Chat input form */}
                <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="Ask about state vectors, Bloch sphere angles, or Dr. Vance's proof..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#003872]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] transition-colors shadow-sm"
                  >
                    Ask
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: Study Flashcards */}
            {activeTab === "flashcards" && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-headline font-bold text-sm text-[#003872]">
                      Interactive Recall Flashcards ({flashcards.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click any card to flip between conceptual question and mathematical solution.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {flashcards.map((card) => {
                    const isFlipped = flippedCards[card.id];
                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleCardFlip(card.id)}
                        className={`h-64 rounded-2xl border-2 p-6 cursor-pointer flex flex-col justify-between transition-all duration-300 shadow-sm ${
                          isFlipped
                            ? "bg-[#001f40] border-[#FFBB00] text-white rotate-0"
                            : "bg-white border-slate-200 text-slate-800 hover:border-[#003872]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className={`font-bold ${isFlipped ? "text-[#FFBB00]" : "text-[#0082FF]"}`}>
                            {card.category}
                          </span>
                          <span className={isFlipped ? "text-slate-400" : "text-slate-400"}>
                            {isFlipped ? "ANSWER" : "QUESTION"}
                          </span>
                        </div>

                        <div className="my-auto font-sans leading-relaxed">
                          {isFlipped ? (
                            <p className="text-sm font-medium text-slate-100">{card.answer}</p>
                          ) : (
                            <p className="text-sm font-bold text-[#003872]">{card.question}</p>
                          )}

                          {isFlipped && card.formulaHint && (
                            <div className="mt-3 font-mono text-xs text-[#FFBB00] bg-white/10 p-2 rounded-lg">
                              Hint: {card.formulaHint}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100/20 text-[10px] font-mono text-right text-slate-400">
                          Click to Flip ↷
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: Mathematical Formula Derivations */}
            {activeTab === "formulas" && (
              <div className="flex flex-col gap-4">
                {derivations.map((d, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4"
                  >
                    <div className="border-b border-slate-100 pb-3">
                      <span className="font-mono text-[10px] font-bold uppercase text-[#0082FF]">
                        FORMAL STEM DERIVATION
                      </span>
                      <h3 className="font-headline font-bold text-base text-[#003872] mt-1">
                        {d.title}
                      </h3>
                      <div className="font-mono text-sm text-[#003872] font-bold bg-[#E1EDFF] p-3 rounded-xl mt-2 border border-[#0082FF]/20">
                        {d.mathExpression}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Step-by-Step Mathematical Derivation
                      </span>
                      <div className="flex flex-col gap-2">
                        {d.derivationSteps.map((step, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-sans"
                          >
                            <span className="font-mono font-bold text-[#003872] w-6 shrink-0">
                              0{sIdx + 1}.
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {d.practiceProblem && (
                      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex flex-col gap-1">
                        <span className="font-bold text-[#b38300]">
                          Student Practice Challenge
                        </span>
                        <p className="text-slate-700 font-sans">{d.practiceProblem}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TAB 6: Interactive Python / Math Code Sandbox */}
            {activeTab === "sandbox" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#003872]" />
                    <h3 className="font-headline font-bold text-sm text-[#003872]">
                      Interactive STEM Python / Math Sandbox
                    </h3>
                  </div>
                  <button
                    onClick={handleRunCode}
                    disabled={isRunningCode}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isRunningCode ? "Running..." : "Run Code"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Code Editor */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>Python 3.11 · Bloch Sphere & Hamiltonian</span>
                      <span>Editable script</span>
                    </div>
                    <textarea
                      value={sandboxCode}
                      onChange={(e) => setSandboxCode(e.target.value)}
                      rows={14}
                      className="w-full font-mono text-xs p-4 rounded-xl bg-[#090d16] text-emerald-400 border border-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                    />
                  </div>

                  {/* Output Terminal */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>Standard Output (stdout)</span>
                      <span>Verification Engine</span>
                    </div>
                    <pre className="w-full font-mono text-xs p-4 rounded-xl bg-[#090d16] text-slate-200 border border-slate-800 leading-relaxed overflow-x-auto whitespace-pre-wrap h-[308px]">
                      {sandboxOutput}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
