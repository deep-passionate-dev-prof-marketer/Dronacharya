import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  Hand,
  Disc,
  Languages,
  Globe,
  LayoutGrid,
  Users,
  Layers,
  Sparkles,
  BookOpen,
  PhoneOff,
  Coffee,
  Activity,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  ChevronUp,
} from "lucide-react";
import { LayoutCustomizerModal } from "./LayoutCustomizerModal";

export const BottomMeetingControls: React.FC = () => {
  const {
    currentRole,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    handRaised,
    toggleHandRaise,
    isLiveSubtitlesActive,
    toggleLiveSubtitles,
    subtitleLanguage,
    setIsInterpreterModalOpen,
    participants,
    setIsAiSummaryModalOpen,
    setActiveView,
    startRoomBreak,
    setIsAuditDrawerOpen,
    setIsParentHelpModalOpen,
    setIsCxHelpModalOpen,
    dockSplitRatio,
    setDockSplitRatio,
    roomTitle,
    latencyMs,
  } = useClassroom();

  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [meetingTimer, setMeetingTimer] = useState("00:14:28");

  const toggleDock = () => {
    if (dockSplitRatio === 100) {
      setDockSplitRatio(65);
    } else {
      setDockSplitRatio(100);
    }
  };

  return (
    <>
      <div className="h-16 md:h-18 w-full bg-[#080d19]/95 backdrop-blur-2xl border-t border-white/10 px-3 md:px-6 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left Section: Live Meeting Info & Security Badge */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-slate-200">{meetingTimer}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300">
            <span className="font-semibold truncate max-w-[150px] xl:max-w-[220px]">
              {roomTitle.split("·")[0] || "21K Live Room"}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256 E2EE</span>
          </div>
        </div>

        {/* Center Section: Primary Action Island */}
        <div className="flex items-center gap-1.5 md:gap-2.5 mx-auto">
          {/* Microphone */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-3.5 md:px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
              isAudioMuted
                ? "bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30"
                : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
            }`}
            title={isAudioMuted ? "Unmute Microphone (M)" : "Mute Microphone (M)"}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isAudioMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Camera Video */}
          <button
            onClick={toggleVideo}
            className={`flex items-center gap-2 px-3.5 md:px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
              isVideoOff
                ? "bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30"
                : "bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30"
            }`}
            title={isVideoOff ? "Start Camera Video" : "Stop Camera Video"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4 text-blue-400" />}
            <span className="hidden sm:inline">{isVideoOff ? "Start Video" : "Stop Video"}</span>
          </button>

          {/* Real-time Subtitles CC */}
          <button
            onClick={toggleLiveSubtitles}
            className={`flex items-center gap-1.5 px-3 md:px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              isLiveSubtitlesActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
            title="Toggle Live Multilingual Subtitles"
          >
            <Languages className="w-4 h-4" />
            <span className="hidden md:inline">CC [{subtitleLanguage.toUpperCase()}]</span>
          </button>

          {/* AI Real-time Live Interpreter Studio */}
          <button
            onClick={() => setIsInterpreterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 md:px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 text-cyan-200 border border-cyan-400/40 hover:border-cyan-400/80 shadow-lg shadow-cyan-950/40"
            title="Open AI Real-time Live Interpreter (Two-Way Speech Translation & Dual Audio)"
          >
            <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="hidden lg:inline">AI Interpreter</span>
            <span className="lg:hidden text-[11px] font-mono">🌐</span>
          </button>

          {/* Share Screen */}
          <button
            onClick={toggleScreenShare}
            className={`flex items-center gap-1.5 px-3 md:px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              isScreenSharing
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
            title="Share Screen"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">{isScreenSharing ? "Stop Share" : "Share"}</span>
          </button>

          {/* Manual Layout & Grid Customizer Button */}
          <button
            onClick={() => setIsLayoutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 md:px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all shadow-sm"
            title="Adjust Video Grid & Stage Layout"
          >
            <LayoutGrid className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Layout</span>
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleHandRaise}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              handRaised
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
            title={handRaised ? "Lower Hand" : "Raise Hand"}
          >
            <Hand className="w-4 h-4" />
            <span className="hidden lg:inline">{handRaised ? "Hand Up" : "Hand"}</span>
          </button>

          {/* Teacher Specific Quick Tools */}
          {(currentRole === "instructor" || currentRole === "admin") && (
            <>
              <button
                onClick={() => startRoomBreak(5, "5-Minute Cognitive Refresh")}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                title="Initiate synchronized 5-Minute break"
              >
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Break</span>
              </button>

              <button
                onClick={() => setIsAuditDrawerOpen(true)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
                title="Open Attention & Audio Quality Telemetry"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Audit</span>
              </button>
            </>
          )}

          {/* Student Specific Quick Tools */}
          {currentRole === "student" && (
            <>
              <button
                onClick={() => setIsParentHelpModalOpen(true)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                title="Ask Parent for Help"
              >
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Ask Parent</span>
              </button>

              <button
                onClick={() => setIsCxHelpModalOpen(true)}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
                title="Ask CX / Tech Support"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Help CX</span>
              </button>
            </>
          )}

          {/* Leave / Exit Meeting Button */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to exit this live classroom session?")) {
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30"
            title="Leave Meeting"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>

        {/* Right Section: Workspace Drawers, Participants & Digest */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {/* Active Participants Pill */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{participants.length}</span>
          </div>

          {/* Toggle Tools Dock */}
          <button
            onClick={toggleDock}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
              dockSplitRatio < 100
                ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title={dockSplitRatio < 100 ? "Collapse Tools Dock" : "Expand Tools Dock"}
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="hidden xl:inline">{dockSplitRatio < 100 ? "Dock Open" : "Open Dock"}</span>
          </button>

          {/* LLM Notebook */}
          <button
            onClick={() => setActiveView("notebook")}
            className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
            title="Open Google LLM Notebook Studio"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
          </button>

          {/* AI Summary */}
          <button
            onClick={() => setIsAiSummaryModalOpen(true)}
            className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
            title="Generate AI Lecture Digest"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Manual Layout & Grid Customizer Modal */}
      <LayoutCustomizerModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
      />
    </>
  );
};
