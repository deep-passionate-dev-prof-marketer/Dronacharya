import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Upload,
  Download,
  FileText,
  FileCode,
  Users,
  Check,
} from "lucide-react";

const SAMPLE_SLIDES = [
  {
    number: 1,
    title: "Quantum Information Theory & Hilbert Spaces",
    subtitle: "Lecture 08: Entanglement & Bell Inequality Tests",
    content: `### 1. Hilbert Space Formulation
Any isolated physical system is represented by a complex state vector in Hilbert space $\\mathcal{H}$.

$$\\langle \\psi | \\psi \\rangle = 1$$

- Basis states: $|0\\rangle = \\begin{pmatrix} 1 \\\\ 0 \\end{pmatrix}$, $|1\\rangle = \\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix}$
- Superposition: $|\\psi\\rangle = \\alpha |0\\rangle + \\beta |1\\rangle$ with $|\\alpha|^2 + |\\beta|^2 = 1$`,
  },
  {
    number: 2,
    title: "Quantum Logic Gates & Unitary Operations",
    subtitle: "Reversible computation via unitary transformations",
    content: `### 2. Unitary Operators
A quantum gate $U$ must preserve inner products ($U^\\dagger U = I$).

- **Hadamard Gate ($H$)**:
  $$H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}$$
- **Pauli-X (Bit Flip)**:
  $$X = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}$$
- **Controlled-NOT ($CNOT$)**:
  Entangles control qubit and target qubit.`,
  },
  {
    number: 3,
    title: "Decoherence & Surface Code Error Mitigation",
    subtitle: "Overcoming environmental thermal noise in transmon hardware",
    content: `### 3. Decoherence Rates
Quantum information degrades through two primary mechanisms:

1. **Relaxation Time ($T_1$)**: Spontaneous emission from $|1\\rangle \\to |0\\rangle$
2. **Dephasing Time ($T_2$)**: Loss of relative phase coherence

$$\\frac{1}{T_2} = \\frac{1}{2T_1} + \\frac{1}{T_\\phi}$$

Surface code stabilizers can correct arbitrary single-qubit errors below the 1% fault threshold.`,
  },
];

export const DeckAndNotes: React.FC = () => {
  const [subTab, setSubTab] = useState<"deck" | "notes">("deck");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [notesContent, setNotesContent] = useState<string>(
    `# Collaborative STEM Lab Notes
**Date**: October 2026 | **Session**: Quantum Mechanics 402

### Key Questions Raised During Lecture:
1. *Sophia Chen*: What is the physical significance of the phase angle on the Bloch sphere?
   - **Answer**: The phase angle $\\phi$ determines interference patterns in Mach-Zehnder and Ramsey interferometry experiments.

2. *Marcus Vance*: Can we simulate 3-qubit Toffoli gates without decomposing into single-qubit rotations?
   - **Answer**: On transmon architectures, Toffoli gates are synthesized via sequences of CZ and single-qubit gates.

### Lab Action Items:
- [ ] Measure $T_1$ relaxation curve on the simulated transmon register.
- [ ] Record findings in the class repository before Friday.
`
  );
  const [savedNotes, setSavedNotes] = useState(false);

  const slide = SAMPLE_SLIDES[currentSlideIndex];

  const handleNextSlide = () => {
    if (currentSlideIndex < SAMPLE_SLIDES.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleSaveNotes = () => {
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  };

  const handleDownloadNotes = () => {
    const blob = new Blob([notesContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantum-lab-notes-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Top Dock Subtabs */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab("deck")}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              subTab === "deck"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Lecture Slide Deck
          </button>
          <button
            onClick={() => setSubTab("notes")}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              subTab === "notes"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Live Co-Notes
          </button>
        </div>

        {subTab === "deck" ? (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>
              Slide {currentSlideIndex + 1} of {SAMPLE_SLIDES.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextSlide}
                disabled={currentSlideIndex === SAMPLE_SLIDES.length - 1}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <Users className="w-3 h-3" />
              <span>3 Co-Editors Active</span>
            </div>
            <button
              onClick={handleSaveNotes}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Save changes"
            >
              {savedNotes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {subTab === "deck" ? (
          <div className="h-full flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
            <div>
              <div className="text-[11px] font-mono text-indigo-400 mb-1">
                MODULE 08 · STEM CURRICULUM
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{slide.title}</h2>
              <p className="text-xs text-slate-400 mb-4">{slide.subtitle}</p>

              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {slide.content}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">NexusStem Encrypted Presentation Feed</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert("Simulated: Slide deck presentation synced to student screens.")}
                  className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
                >
                  Sync to Cohort
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col gap-2">
            <div className="flex items-center gap-1.5 mb-1">
              <button
                onClick={() => setNotesContent((prev) => prev + "\n$$\\int_{-\\infty}^\\infty |\\psi(x)|^2 dx = 1$$\n")}
                className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 hover:bg-slate-700"
              >
                + Formula
              </button>
              <button
                onClick={() => setNotesContent((prev) => prev + "\n- [ ] New Action Item\n")}
                className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 hover:bg-slate-700"
              >
                + Checkbox
              </button>
              <button
                onClick={handleDownloadNotes}
                className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 hover:bg-slate-700 ml-auto"
              >
                Export .md
              </button>
            </div>

            <textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
              placeholder="Type shared notes or equations here..."
            />
          </div>
        )}
      </div>
    </div>
  );
};
