import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { Coffee, Play, Plus, Volume2, Sparkles, Smile } from "lucide-react";

export const RoomBreakOverlay: React.FC = () => {
  const { roomBreak, startRoomBreak, endRoomBreak, currentRole } = useClassroom();

  if (!roomBreak.isActive) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isTeacher = currentRole === "instructor";

  return (
    <div className="absolute inset-0 z-30 bg-[#001F40]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white select-none animate-fadeIn">
      {/* Ambient Pulsing Rings */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="w-48 h-48 rounded-full border-2 border-cyan-400/20 animate-ping absolute inset-0" />
        <div className="w-40 h-40 rounded-full border-2 border-[#FFBB00]/30 animate-pulse absolute" />
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#003872] to-[#0082FF] flex items-center justify-center shadow-2xl border border-white/20">
          <Coffee className="w-14 h-14 text-[#FFBB00] drop-shadow-md" />
        </div>
      </div>

      {/* Break Title & Timer */}
      <div className="text-center max-w-md space-y-2 mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#FFBB00]/20 text-[#FFBB00] border border-[#FFBB00]/40">
          Scheduled Classroom Break
        </span>
        <h2 className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight drop-shadow-lg">
          {formatTimer(roomBreak.remainingSeconds)}
        </h2>
        <p className="text-sm font-medium text-cyan-200">
          {roomBreak.reason}
        </p>
      </div>

      {/* Mindfulness Relaxation Exercise Prompt */}
      <div className="max-w-lg w-full p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-center space-y-2 mb-6 shadow-xl">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFBB00]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mindfulness Activity</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">
          {roomBreak.mindfulnessActivity}
        </p>
        <p className="text-[11px] text-slate-400 italic">
          Look away from screens at a distance of 20 feet to relieve eye strain before resumption.
        </p>
      </div>

      {/* Facilitator Controls */}
      {isTeacher ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => startRoomBreak(Math.ceil((roomBreak.remainingSeconds + 120) / 60))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FFBB00]" />
            <span>Add +2 Minutes</span>
          </button>

          <button
            onClick={endRoomBreak}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFBB00] hover:bg-amber-400 text-[#001F40] text-xs font-bold transition-all shadow-lg cursor-pointer transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-[#001F40]" />
            <span>Resume Class Now</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Smile className="w-4 h-4 text-emerald-400" />
          <span>Facilitator will resume session automatically upon timer completion</span>
        </div>
      )}
    </div>
  );
};
