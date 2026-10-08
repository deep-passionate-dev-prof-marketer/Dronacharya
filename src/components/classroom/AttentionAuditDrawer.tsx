import React, { useState, useEffect, useRef } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  X,
  Eye,
  Volume2,
  Sliders,
  Activity,
  Award,
  AlertTriangle,
  CheckCircle2,
  User,
  Radio,
  FileText,
  Save,
  Sparkles,
  Zap,
} from "lucide-react";

export const AttentionAuditDrawer: React.FC = () => {
  const {
    isAuditDrawerOpen,
    setIsAuditDrawerOpen,
    selectedAuditParticipantId,
    setSelectedAuditParticipantId,
    attentionAudits,
    audioMetrics,
    qualityProfiles,
    updateManualRubricScore,
    participants,
  } = useClassroom();

  const [activeTab, setActiveTab] = useState<"telemetry" | "rubric" | "class_matrix">("telemetry");
  const [rubricNotes, setRubricNotes] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeAudit = attentionAudits[selectedAuditParticipantId] || Object.values(attentionAudits)[0];
  const activeAudio = audioMetrics[selectedAuditParticipantId] || Object.values(audioMetrics)[0];
  const activeProfile = qualityProfiles[selectedAuditParticipantId] || Object.values(qualityProfiles)[0];

  useEffect(() => {
    if (activeProfile?.evaluatorNotes) {
      setRubricNotes(activeProfile.evaluatorNotes);
    }
  }, [selectedAuditParticipantId, activeProfile]);

  // Animated live audio waveform in canvas
  useEffect(() => {
    if (!isAuditDrawerOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw baseline grid
      ctx.strokeStyle = "rgba(0, 194, 224, 0.1)";
      ctx.lineWidth = 1;
      for (let y = 10; y < canvas.height; y += 15) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw primary waveform
      ctx.beginPath();
      ctx.strokeStyle = "#00C2E0";
      ctx.lineWidth = 2;
      const centerY = canvas.height / 2;
      const amplitude = (activeAudio?.snrDb || 25) * 0.7;

      for (let x = 0; x < canvas.width; x++) {
        const angle = (x / canvas.width) * Math.PI * 4 + phase;
        const noise = Math.sin(x * 0.2 + phase * 2) * 3;
        const y = centerY + Math.sin(angle) * amplitude * 0.5 + noise;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      phase += 0.08;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAuditDrawerOpen, selectedAuditParticipantId, activeAudio]);

  if (!isAuditDrawerOpen) return null;

  const handleSliderChange = (paramKey: "pedagogyDelivery" | "studentInclusivity" | "vocalClarityAcoustics" | "screenEngagementPacing", val: number) => {
    updateManualRubricScore(selectedAuditParticipantId, { [paramKey]: val }, rubricNotes);
  };

  const handleSaveNotes = () => {
    updateManualRubricScore(selectedAuditParticipantId, {}, rubricNotes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none select-none">
      {/* Backdrop */}
      <div
        onClick={() => setIsAuditDrawerOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity pointer-events-auto"
      />

      {/* Slide-over Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
        <div className="w-screen max-w-md md:max-w-xl bg-[#090e17] text-slate-100 border-l border-[#003872] shadow-2xl flex flex-col font-sans">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-[#001F40] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#003872] text-[#00C2E0]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Classroom Attention & Audio Audit</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00C2E0]/20 text-[#00C2E0] border border-[#00C2E0]/40">
                    LIVE CV/DSP
                  </span>
                </h2>
                <p className="text-xs text-slate-300">
                  Bi-Directional Biometric Attention & DSP Acoustic Health Engine
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAuditDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Participant Selector Strip */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
              Auditing:
            </span>
            {participants.map((p) => {
              const audit = attentionAudits[p.id];
              const isSelected = selectedAuditParticipantId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedAuditParticipantId(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#0082FF] text-white shadow-md font-bold"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.avatarColor }}
                  />
                  <span>{p.name.split(" ")[0]}</span>
                  {p.role === "instructor" && <span className="text-[10px] text-amber-300 font-mono">(Facilitator)</span>}
                  <span className="font-mono text-[11px] opacity-80">
                    {audit ? `${audit.attentionScore}%` : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "telemetry"
                  ? "border-[#00C2E0] text-[#00C2E0] bg-[#001F40]/50"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Face & Audio Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab("rubric")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "rubric"
                  ? "border-[#FFBB00] text-[#FFBB00] bg-[#001F40]/50"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Manual Rubric ({activeProfile?.finalCompositeScore || 90}/100)</span>
            </button>
            <button
              onClick={() => setActiveTab("class_matrix")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "class_matrix"
                  ? "border-[#0082FF] text-[#0082FF] bg-[#001F40]/50"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Classroom Matrix</span>
            </button>
          </div>

          {/* Content Zone */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "telemetry" && (
              <div className="space-y-4">
                {/* Section 1: Biometric Face & Gaze Tracking Canvas */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#00C2E0]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Facial Landmark & Gaze Orientation Mesh
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        activeAudit?.engagementLevel === "High Focus"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : activeAudit?.engagementLevel === "Attentive"
                          ? "bg-blue-950 text-blue-400 border border-blue-800"
                          : activeAudit?.engagementLevel === "Mild Distraction"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {activeAudit?.engagementLevel || "Attentive"}
                    </span>
                  </div>

                  {/* Visual Face Mesh Diagram */}
                  <div className="relative h-44 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(#00c2e0_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

                    {/* SVG Face Mesh & Gaze Vector */}
                    <svg className="w-40 h-40" viewBox="0 0 100 100">
                      {/* Head Oval Contour */}
                      <ellipse
                        cx="50"
                        cy="50"
                        rx="32"
                        ry="40"
                        fill="none"
                        stroke="#00C2E0"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        className="opacity-70 animate-pulse"
                      />

                      {/* Eyes and Nose Bridge */}
                      <circle cx={activeAudit?.landmarks.leftEye[0] || 42} cy={activeAudit?.landmarks.leftEye[1] || 38} r="3" fill="#00C2E0" />
                      <circle cx={activeAudit?.landmarks.rightEye[0] || 58} cy={activeAudit?.landmarks.rightEye[1] || 38} r="3" fill="#00C2E0" />
                      <circle cx={activeAudit?.landmarks.noseTip[0] || 50} cy={activeAudit?.landmarks.noseTip[1] || 48} r="2" fill="#FFBB00" />
                      <line
                        x1={activeAudit?.landmarks.leftEye[0] || 42}
                        y1={activeAudit?.landmarks.leftEye[1] || 38}
                        x2={activeAudit?.landmarks.rightEye[0] || 58}
                        y2={activeAudit?.landmarks.rightEye[1] || 38}
                        stroke="#00C2E0"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                      <path
                        d={`M 40 64 Q 50 ${activeAudit?.gaze === "down" ? 70 : 66} 60 64`}
                        fill="none"
                        stroke="#00C2E0"
                        strokeWidth="1.5"
                      />

                      {/* Gaze Vector Arrow */}
                      <line
                        x1="50"
                        y1="48"
                        x2={
                          activeAudit?.gaze === "center"
                            ? 50
                            : activeAudit?.gaze === "screen-left"
                            ? 25
                            : activeAudit?.gaze === "screen-right"
                            ? 75
                            : 50
                        }
                        y2={
                          activeAudit?.gaze === "down"
                            ? 75
                            : activeAudit?.gaze === "away"
                            ? 20
                            : 30
                        }
                        stroke="#FF7176"
                        strokeWidth="2.5"
                        markerEnd="url(#arrow)"
                      />
                    </svg>

                    {/* HUD Overlay Stats inside canvas */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] font-mono text-slate-300">
                      Gaze: <span className="font-bold text-cyan-300 uppercase">{activeAudit?.gaze}</span>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] font-mono text-slate-300">
                      Blink: <span className="font-bold text-amber-300">{activeAudit?.blinkRate || 18}</span>/min
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Head Pose Yaw</p>
                      <p className="text-sm font-mono font-bold text-white">
                        {activeAudit?.headPose.yaw.toFixed(1)}°
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Eyes On Screen</p>
                      <p className={`text-sm font-mono font-bold ${activeAudit?.eyesOnScreen ? "text-emerald-400" : "text-rose-400"}`}>
                        {activeAudit?.eyesOnScreen ? "VERIFIED" : "DEVIATED"}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Attention Score</p>
                      <p className="text-sm font-mono font-bold text-[#00C2E0]">
                        {activeAudit?.attentionScore}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: DSP Audio Quality Waveform & Metrics */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#00C2E0]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Acoustic Health & DSP Spectrum Analysis
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      GRADE: {activeAudio?.vocalClarityGrade || "A+"}
                    </span>
                  </div>

                  {/* Live Canvas Waveform */}
                  <div className="h-24 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800 mb-3">
                    <canvas ref={canvasRef} width={450} height={96} className="w-full h-full" />
                  </div>

                  {/* Audio DSP Telemetry */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Signal-to-Noise</p>
                      <p className="text-sm font-mono font-bold text-cyan-300">
                        {activeAudio?.snrDb || 32} dB
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Packet Loss</p>
                      <p className={`text-sm font-mono font-bold ${(activeAudio?.packetLossPercent || 0) > 1 ? "text-rose-400" : "text-emerald-400"}`}>
                        {activeAudio?.packetLossPercent || 0}%
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Jitter Buffer</p>
                      <p className="text-sm font-mono font-bold text-slate-200">
                        {activeAudio?.jitterMs || 3.2} ms
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <p className="text-[10px] text-slate-400">Speech Pace</p>
                      <p className="text-sm font-mono font-bold text-amber-300">
                        {activeAudio?.speechPaceWpm || 135} wpm
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rubric" && (
              <div className="space-y-4">
                {/* Composite Score Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#001F40] to-slate-900 border border-[#003872] shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                        Evaluated Participant
                      </span>
                      <h3 className="text-base font-bold text-white">{activeProfile?.participantName}</h3>
                      <p className="text-xs text-slate-400 capitalize">
                        Role: {activeProfile?.role} · Audited: {activeProfile?.lastAuditedAt}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-300 uppercase tracking-wider font-mono">Final Quality</p>
                      <p className="text-3xl font-extrabold font-mono text-[#FFBB00]">
                        {activeProfile?.finalCompositeScore || 90}
                        <span className="text-sm text-slate-400 font-normal">/100</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span>Auto Attention: {activeProfile?.autoComputedScore}% (40% weight)</span>
                    <span>Manual Rubric: {activeProfile?.manualRubricScore}/100 (60% weight)</span>
                  </div>
                </div>

                {/* 4 Interactive Manual Rubric Parameters */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#FFBB00]" />
                      <span>Manual Evaluation Parameters (0–25 each)</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Rubric Total: {activeProfile?.manualRubricScore}/100
                    </span>
                  </div>

                  {/* Param 1: Pedagogy Delivery */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">1. Pedagogy & Concept Delivery</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {activeProfile?.rubricBreakdown.pedagogyDelivery || 24} / 25
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={activeProfile?.rubricBreakdown.pedagogyDelivery || 24}
                      onChange={(e) => handleSliderChange("pedagogyDelivery", Number(e.target.value))}
                      className="w-full accent-[#00C2E0] cursor-pointer"
                    />
                  </div>

                  {/* Param 2: Student Inclusivity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">2. Student Inclusivity & Active Interaction</span>
                      <span className="font-mono font-bold text-amber-300">
                        {activeProfile?.rubricBreakdown.studentInclusivity || 23} / 25
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={activeProfile?.rubricBreakdown.studentInclusivity || 23}
                      onChange={(e) => handleSliderChange("studentInclusivity", Number(e.target.value))}
                      className="w-full accent-[#FFBB00] cursor-pointer"
                    />
                  </div>

                  {/* Param 3: Vocal Clarity & Acoustics */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">3. Vocal Clarity & Acoustic Presence</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {activeProfile?.rubricBreakdown.vocalClarityAcoustics || 25} / 25
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={activeProfile?.rubricBreakdown.vocalClarityAcoustics || 25}
                      onChange={(e) => handleSliderChange("vocalClarityAcoustics", Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  {/* Param 4: Screen Engagement & Pacing */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">4. Screen Discipline & Visual Aid Pacing</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {activeProfile?.rubricBreakdown.screenEngagementPacing || 23} / 25
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={activeProfile?.rubricBreakdown.screenEngagementPacing || 23}
                      onChange={(e) => handleSliderChange("screenEngagementPacing", Number(e.target.value))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Evaluator Notes Section */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Evaluator Qualitative Assessment Notes</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rubricNotes}
                    onChange={(e) => setRubricNotes(e.target.value)}
                    placeholder="Enter formal academic audit feedback or pedagogy observations..."
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00C2E0]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Auditor: {activeProfile?.auditorName || "Academic Quality Cell"}
                    </span>
                    <button
                      onClick={handleSaveNotes}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0082FF] hover:bg-[#0070dc] text-white text-xs font-bold transition-all shadow cursor-pointer"
                    >
                      {savedSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{savedSuccess ? "Saved to Audit Log!" : "Save Evaluation"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "class_matrix" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Total Roster Monitored:</span>
                  <span className="font-mono font-bold text-white">{participants.length} Active Participants</span>
                </div>

                <div className="space-y-2">
                  {participants.map((p) => {
                    const audit = attentionAudits[p.id];
                    const audio = audioMetrics[p.id];
                    const profile = qualityProfiles[p.id];

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedAuditParticipantId(p.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedAuditParticipantId === p.id
                            ? "bg-[#001F40] border-[#00C2E0] shadow-md"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: p.avatarColor }}
                            />
                            <span className="text-xs font-bold text-white">{p.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              ({p.role})
                            </span>
                          </div>

                          <span className="font-mono text-xs font-bold text-[#FFBB00]">
                            Quality: {profile?.finalCompositeScore || 88}/100
                          </span>
                        </div>

                        {/* Progress Bar for Attention */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>Attention: {audit?.attentionScore || 85}%</span>
                            <span>Audio: {audio?.vocalClarityGrade || "A"} ({audio?.snrDb || 28}dB)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                (audit?.attentionScore || 85) >= 85
                                  ? "bg-emerald-400"
                                  : (audit?.attentionScore || 85) >= 70
                                  ? "bg-amber-400"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${audit?.attentionScore || 85}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
