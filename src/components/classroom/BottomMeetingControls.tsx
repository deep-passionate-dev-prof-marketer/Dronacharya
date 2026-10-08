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
  Play,
  Briefcase,
  MoreHorizontal,
  Captions,
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
    classStatus,
    classDurationSeconds,
    startClass,
    endClass,
    triggerRoomBomber,
    leaveClass,
    captionHealth,
    isInterpreterOn,
    toggleInterpreter,
  } = useClassroom();

  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);

  const formatDuration = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleDock = () => {
    if (dockSplitRatio === 100) {
      setDockSplitRatio(65);
    } else {
      setDockSplitRatio(100);
    }
  };

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isTeacher = currentRole === "instructor" || currentRole === "admin";
  const isStudent = currentRole === "student";

  type MoreItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; tone?: string; active?: boolean; show?: boolean; mobileOnly?: boolean };
  const moreItems: MoreItem[] = [
    { key: "share", label: isScreenSharing ? "Stop sharing" : "Share screen", icon: Share2, onClick: toggleScreenShare, active: isScreenSharing, mobileOnly: true },
    { key: "hand", label: handRaised ? "Lower hand" : "Raise hand", icon: Hand, onClick: toggleHandRaise, active: handRaised, mobileOnly: true },
    { key: "interpreter", label: "Language settings", icon: Globe, onClick: () => setIsInterpreterModalOpen(true), tone: "text-cyan-300" },
    { key: "layout", label: "Layout & grid", icon: LayoutGrid, onClick: () => setIsLayoutModalOpen(true) },
    { key: "dock", label: dockSplitRatio < 100 ? "Hide tools panel" : "Show tools panel", icon: Layers, onClick: toggleDock, show: typeof window !== "undefined" && window.innerWidth >= 1024 },
    { key: "break", label: "5-min break", icon: Coffee, onClick: () => startRoomBreak(5, "5-Minute Cognitive Refresh"), tone: "text-amber-300", show: isTeacher },
    {
      key: "pitch",
      label: "Sales pitch breakout",
      icon: Briefcase,
      onClick: () => triggerRoomBomber({ salesRepName: "Marcus Sterling (Lead Admissions)", discountPct: 20, studentName: "Demo Student" }),
      tone: "text-violet-300",
      show: isTeacher && classStatus === "in_progress",
    },
    { key: "parent", label: "Ask parent", icon: HelpCircle, onClick: () => setIsParentHelpModalOpen(true), tone: "text-blue-300", show: isStudent },
    { key: "cx", label: "Tech help", icon: ShieldAlert, onClick: () => setIsCxHelpModalOpen(true), tone: "text-rose-300", show: isStudent },
    { key: "notebook", label: "LLM notebook", icon: BookOpen, onClick: () => setActiveView("notebook"), tone: "text-amber-300" },
    { key: "summary", label: "AI lecture digest", icon: Sparkles, onClick: () => setIsAiSummaryModalOpen(true), tone: "text-indigo-300" },
    { key: "end", label: "End class for all", icon: PhoneOff, onClick: endClass, tone: "text-amber-300", show: isTeacher && classStatus === "in_progress" },
  ].filter((i) => i.show !== false);

  // Display is set per button so responsive "hidden …:inline-flex" pairs don't fight a base inline-flex
  const ctrl = "h-11 min-w-11 items-center justify-center gap-2 px-3 rounded-2xl text-xs font-semibold transition-colors border shrink-0";
  const neutral = "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10";

  return (
    <>
      <div className="@container w-full shrink-0 z-30 select-none bg-[#080d19] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 @2xl:h-[72px] px-2 @md:px-3 @4xl:px-5 flex items-center gap-2">
          {/* Left: session status */}
          <div className="hidden @4xl:flex items-center gap-2 min-w-0 flex-1 basis-0">
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs shrink-0">
              <span className={`w-2 h-2 rounded-full ${classStatus === "in_progress" ? "bg-rose-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="font-mono font-bold text-slate-200">{classStatus === "in_progress" ? formatDuration(classDurationSeconds) : "Waiting"}</span>
            </div>
            <span className="hidden @5xl:block truncate text-xs text-slate-400 min-w-0">{roomTitle.split("·")[0] || "21K Live Room"}</span>
          </div>

          {/* Center: primary controls */}
          <div className="flex items-center justify-center gap-1.5 @md:gap-2 flex-1 @4xl:flex-none min-w-0">
            <button
              onClick={toggleAudio}
              className={`${ctrl} inline-flex ${isAudioMuted ? "bg-rose-600/20 text-rose-200 border-rose-500/40 hover:bg-rose-600/30" : neutral}`}
              title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
              aria-pressed={!isAudioMuted}
              aria-label={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isAudioMuted ? <MicOff className="w-[18px] h-[18px] text-rose-400" /> : <Mic className="w-[18px] h-[18px] text-emerald-400" />}
              <span className="hidden @3xl:inline">{isAudioMuted ? "Unmute" : "Mute"}</span>
            </button>

            <button
              onClick={toggleVideo}
              className={`${ctrl} inline-flex ${isVideoOff ? "bg-rose-600/20 text-rose-200 border-rose-500/40 hover:bg-rose-600/30" : neutral}`}
              title={isVideoOff ? "Start camera" : "Stop camera"}
              aria-pressed={!isVideoOff}
              aria-label={isVideoOff ? "Start camera" : "Stop camera"}
            >
              {isVideoOff ? <VideoOff className="w-[18px] h-[18px] text-rose-400" /> : <Video className="w-[18px] h-[18px] text-blue-400" />}
              <span className="hidden @3xl:inline">{isVideoOff ? "Start video" : "Stop video"}</span>
            </button>

            <button
              onClick={toggleScreenShare}
              className={`${ctrl} hidden @md:inline-flex ${isScreenSharing ? "bg-emerald-600 text-white border-emerald-400/40" : neutral}`}
              title="Share screen"
              aria-pressed={isScreenSharing}
            >
              <Share2 className="w-[18px] h-[18px]" />
              <span className="hidden @5xl:inline">{isScreenSharing ? "Stop share" : "Share"}</span>
            </button>

            <button
              onClick={toggleHandRaise}
              className={`${ctrl} hidden @md:inline-flex ${handRaised ? "bg-amber-500 text-slate-950 border-amber-300/50" : neutral}`}
              title={handRaised ? "Lower hand" : "Raise hand"}
              aria-pressed={handRaised}
              aria-label={handRaised ? "Lower hand" : "Raise hand"}
            >
              <Hand className="w-[18px] h-[18px]" />
              <span className="hidden @5xl:inline">{handRaised ? "Lower" : "Raise"}</span>
            </button>

            {/* Captions and interpreter are always one tap away, on every screen size */}
            <button
              onClick={toggleLiveSubtitles}
              className={`${ctrl} relative inline-flex ${isLiveSubtitlesActive ? "bg-indigo-600 text-white border-indigo-400/40" : neutral}`}
              title={
                !isLiveSubtitlesActive
                  ? "Turn captions on"
                  : captionHealth.state === "listening"
                  ? "Captions on"
                  : "reason" in captionHealth
                  ? captionHealth.reason
                  : "Captions on"
              }
              aria-pressed={isLiveSubtitlesActive}
              aria-label={isLiveSubtitlesActive ? "Turn captions off" : "Turn captions on"}
            >
              <Captions className="w-[18px] h-[18px]" />
              <span className="hidden @5xl:inline">CC · {subtitleLanguage.toUpperCase()}</span>
              {isLiveSubtitlesActive && (
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#080d19] ${
                    captionHealth.state === "listening"
                      ? "bg-emerald-400"
                      : captionHealth.state === "recovering"
                      ? "bg-amber-400 animate-pulse"
                      : captionHealth.state === "off"
                      ? "bg-slate-400"
                      : "bg-rose-400"
                  }`}
                />
              )}
            </button>

            <button
              onClick={toggleInterpreter}
              className={`${ctrl} inline-flex ${isInterpreterOn ? "bg-cyan-600 text-white border-cyan-300/40" : neutral}`}
              title={isInterpreterOn ? `Interpreter on: translating into ${subtitleLanguage.toUpperCase()}` : "Turn interpreter on (hear and read the class in your language)"}
              aria-pressed={isInterpreterOn}
              aria-label={isInterpreterOn ? "Turn interpreter off" : "Turn interpreter on"}
            >
              <Languages className="w-[18px] h-[18px]" />
              <span className="hidden @5xl:inline">Interpret</span>
            </button>

            {isTeacher && classStatus === "waiting" && (
              <button onClick={startClass} className={`${ctrl} hidden @md:inline-flex bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 font-bold`} title="Start live class">
                <Play className="w-4 h-4 fill-current" />
                <span className="hidden @xl:inline">Start</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsMoreOpen((o) => !o)}
                className={`${ctrl} inline-flex ${isMoreOpen ? "bg-white/15 text-white border-white/20" : neutral}`}
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
                aria-label="More controls"
                title="More controls"
              >
                <MoreHorizontal className="w-[18px] h-[18px]" />
                <span className="hidden @5xl:inline">More</span>
              </button>

              {isMoreOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent animate-fadeIn" onClick={() => setIsMoreOpen(false)} />
                  <div
                    role="menu"
                    className="fixed sm:absolute z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-14 sm:left-1/2 sm:-translate-x-1/2 sm:w-[360px] rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 shadow-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 animate-sheetUp sm:animate-fadeIn max-h-[80dvh] overflow-y-auto"
                  >
                    <div className="sm:hidden mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
                    <div className="flex items-center justify-between px-1 pb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">More controls</span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5" /> {participants.length} in room
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {moreItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            role="menuitem"
                            onClick={() => {
                              item.onClick();
                              setIsMoreOpen(false);
                            }}
                            className={`${item.mobileOnly ? "@md:hidden" : ""} flex flex-col items-center justify-center gap-1.5 min-h-[76px] px-1.5 py-2 rounded-xl border text-center text-[11px] leading-tight font-medium transition-colors ${
                              item.active ? "bg-blue-600/20 border-blue-500/40 text-white" : "bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10"
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${item.tone || "text-slate-300"}`} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                if (window.confirm("Leave this class? You can rejoin any time.")) leaveClass();
              }}
              className={`${ctrl} inline-flex bg-rose-600 hover:bg-rose-500 text-white border-rose-400/40 @md:px-4`}
              title="Leave meeting"
              aria-label="Leave meeting"
            >
              <PhoneOff className="w-[18px] h-[18px]" />
              <span className="hidden @3xl:inline">Leave</span>
            </button>
          </div>

          {/* Right: room info + quick panels */}
          <div className="hidden @4xl:flex items-center justify-end gap-2 flex-1 basis-0 min-w-0">
            <span className="hidden @6xl:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5" /> E2EE
            </span>
            <span className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300" title="Participants">
              <Users className="w-3.5 h-3.5 text-blue-400" /> {participants.length}
            </span>
            {isTeacher && classStatus === "in_progress" && (
              <button onClick={endClass} className="h-9 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white font-semibold text-xs border border-amber-500/40 transition-colors whitespace-nowrap">
                End class
              </button>
            )}
          </div>
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
