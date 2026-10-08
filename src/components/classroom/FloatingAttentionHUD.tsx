import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Activity,
  Sliders,
  Coffee,
  AlertTriangle,
  Volume2,
  Eye,
  ShieldAlert,
  HelpCircle,
  Headphones,
  CheckCircle2,
  Clock,
  Play,
} from "lucide-react";

export const FloatingAttentionHUD: React.FC = () => {
  const {
    attentionAudits,
    audioMetrics,
    qualityProfiles,
    participants,
    currentRole,
    setIsAuditDrawerOpen,
    setSelectedAuditParticipantId,
    roomBreak,
    startRoomBreak,
    resumeRoomBreak,
    endRoomBreak,
    setIsParentHelpModalOpen,
    setIsCxHelpModalOpen,
    activeRoomFlow,
  } = useClassroom();

  // Compute average student attention
  const studentAudits = Object.values(attentionAudits).filter((a) => a.role === "student");
  const avgStudentAttention = studentAudits.length
    ? Math.round(studentAudits.reduce((acc, curr) => acc + curr.attentionScore, 0) / studentAudits.length)
    : 88;

  const teacherAudit = attentionAudits["host-1"] || Object.values(attentionAudits)[0];
  const teacherQuality = qualityProfiles["host-1"]?.finalCompositeScore || 96;
  const teacherAudio = audioMetrics["host-1"] || Object.values(audioMetrics)[0];

  const distractedCount = studentAudits.filter((s) => s.distractionAlert).length;

  const formatBreakTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute top-14 left-4 right-4 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2">
      {/* Left Glass HUD Pill: Live Classroom Attention & Audio Telemetry */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#001F40]/90 backdrop-blur-md border border-[#003872]/80 px-3 py-1.5 rounded-xl shadow-2xl text-white text-xs select-none">
        {/* Live Pulse Indicator */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-700/60">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wide text-[11px] text-cyan-300 font-mono">
            {activeRoomFlow.subCategoryCode} AUDIT
          </span>
        </div>

        {/* Aggregate Student Attention Score */}
        <button
          onClick={() => {
            setSelectedAuditParticipantId(studentAudits[0]?.participantId || "stu-1");
            setIsAuditDrawerOpen(true);
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Click to view detailed Class Attention & Gaze Analytics"
        >
          <Eye className="w-3.5 h-3.5 text-[#00C2E0]" />
          <span className="text-slate-300">Class Attn:</span>
          <span
            className={`font-mono font-bold ${
              avgStudentAttention >= 85
                ? "text-emerald-400"
                : avgStudentAttention >= 70
                ? "text-[#FFBB00]"
                : "text-rose-400"
            }`}
          >
            {avgStudentAttention}%
          </span>
        </button>

        {/* Teacher Quality Score */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/30 border border-white/5">
          <Activity className="w-3.5 h-3.5 text-[#FFBB00]" />
          <span className="text-slate-300">Teacher Quality:</span>
          <span className="font-mono font-bold text-[#FFBB00]">{teacherQuality}/100</span>
        </div>

        {/* Acoustic Quality SNR */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/30 border border-white/5">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300">SNR:</span>
          <span className="font-mono text-cyan-300 font-semibold">{teacherAudio?.snrDb || 32}dB</span>
          <span className="px-1 py-0.2 text-[9px] rounded font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
            {teacherAudio?.vocalClarityGrade || "A+"}
          </span>
        </div>

        {/* Distraction Alert Pill */}
        {distractedCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[11px] animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>{distractedCount} Distracted</span>
          </div>
        )}

        {/* Open Deep Audit Drawer Button */}
        <button
          onClick={() => {
            setSelectedAuditParticipantId("host-1");
            setIsAuditDrawerOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0082FF] hover:bg-[#0070dc] text-white font-semibold transition-colors shadow-sm ml-1 cursor-pointer"
        >
          <Sliders className="w-3 h-3 text-white" />
          <span>Deep Audit</span>
        </button>
      </div>

      {/* Right Controls: Room Break Status & Single-Click Help Escalations */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Room Break Controller Widget */}
        {roomBreak.isActive ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/90 backdrop-blur-md border border-amber-600/80 text-white text-xs shadow-xl animate-pulse">
            <Coffee className="w-4 h-4 text-[#FFBB00]" />
            <div className="flex flex-col">
              <span className="font-bold text-[11px] text-amber-200">Room Break In Progress</span>
              <span className="font-mono text-xs font-black text-[#FFBB00]">
                {formatBreakTimer(roomBreak.remainingSeconds)}
              </span>
            </div>
            {currentRole === "instructor" && (
              <button
                onClick={endRoomBreak}
                className="px-2 py-0.5 rounded bg-[#FFBB00] hover:bg-amber-400 text-[#001F40] font-bold text-[11px] transition-colors shadow"
              >
                Resume
              </button>
            )}
          </div>
        ) : (
          currentRole === "instructor" && (
            <button
              onClick={() => startRoomBreak(5, "5-Minute Cognitive Rest & Eye Refresh")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#001F40]/80 hover:bg-[#002e60] text-amber-300 border border-amber-500/30 text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer"
              title="Initiate synchronized 5-Minute classroom break with mindfulness timer"
            >
              <Coffee className="w-3.5 h-3.5 text-[#FFBB00]" />
              <span>Take Break</span>
            </button>
          )
        )}

        {/* Single-Click 1P Ask for Parent Help */}
        <button
          onClick={() => setIsParentHelpModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#001F40]/90 hover:bg-[#002e60] text-[#00C2E0] border border-[#00C2E0]/40 text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer"
          title="Single-Click Ask for Parent Help: Dispatches immediate alert to parent"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#00C2E0]" />
          <span className="hidden sm:inline">Ask Parent</span>
        </button>

        {/* Single-Click 1P Ask for CX Help */}
        <button
          onClick={() => setIsCxHelpModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#001F40]/90 hover:bg-[#002e60] text-[#FF7176] border border-[#FF7176]/40 text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer"
          title="Single-Click Ask for CX Help: Dispatches high-priority intervention to 21K Support Desk"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#FF7176]" />
          <span className="hidden sm:inline">Ask CX</span>
        </button>
      </div>
    </div>
  );
};
