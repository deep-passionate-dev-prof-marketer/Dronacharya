import React, { useRef, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Share2,
  Hand,
  Disc,
  Download,
  ShieldCheck,
  Maximize2,
  Volume2,
  Users,
  Radio,
  Sparkles,
  Languages,
  BookOpen,
  Coffee,
  HelpCircle,
  ShieldAlert,
  Activity,
  Laptop,
  Smartphone,
  Tablet,
} from "lucide-react";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { FloatingAttentionHUD } from "./FloatingAttentionHUD";
import { ParticipantTileActions } from "./ParticipantTileActions";
import { RoomBreakOverlay } from "./RoomBreakOverlay";
import { AttentionAuditDrawer } from "./AttentionAuditDrawer";
import { MultiDeviceRemoteConsole } from "./MultiDeviceRemoteConsole";
import { RemoteAccessOfferModal } from "./RemoteAccessOfferModal";
import { IncomingAccessNotification } from "./IncomingAccessNotification";
import { HelpEscalationModals } from "./HelpEscalationModals";
import { ChildFeedbackModal } from "./ChildFeedbackModal";
import { RoleSwitcherBar } from "../navigation/RoleSwitcherBar";
import { AuditorCockpitView } from "./AuditorCockpitView";
import { EdgeMeshLatencyHUD } from "./EdgeMeshLatencyHUD";
import { OneToOnePitchStage } from "../bomber/OneToOnePitchStage";
import { ProductionMeetingEmbed } from "./ProductionMeetingEmbed";
import { RoomRatio } from "../../types";

export const VideoStage: React.FC = () => {
  const {
    participants,
    currentRole,
    activePitchRoom,
    setActivePitchRoom,
    activeProductionMeeting,
    leaveProductionMeeting,
    isRoomBomberActive,
    localStream,
    screenStream,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    handRaised,
    toggleHandRaise,
    isRecording,
    recordingSeconds,
    startRecording,
    stopRecording,
    hasRecordedClip,
    downloadRecordedClip,
    isE2eeSecured,
    remotePointer,
    setRemotePointer,
    setIsAiSummaryModalOpen,
    setActiveView,
    isLiveSubtitlesActive,
    toggleLiveSubtitles,
    subtitleLanguage,
    setIsAuditDrawerOpen,
    startRoomBreak,
    setIsParentHelpModalOpen,
    setIsCxHelpModalOpen,
    attentionAudits,
    roomRatio,
    setRoomRatio,
    muteAllParticipants,
    setActiveDockTab,
    remoteSessions,
    setIsRemoteAccessModalOpen,
    setIsOfferAccessModalOpen,
  } = useClassroom();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach real local media stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  // Attach real screen sharing stream
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Remote annotation / screen pointer click
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentRole === "instructor" || isScreenSharing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setRemotePointer({ x, y, active: true, label: "Instructor Pointer" });
      setTimeout(() => {
        setRemotePointer((prev) => ({ ...prev, active: false }));
      }, 3000);
    }
  };

  const getGridClass = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
    if (count <= 9) return "grid-cols-2 sm:grid-cols-3";
    if (count <= 12) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    if (count <= 16) return "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5";
  };

  // Dedicated 1:1 Executive Pitching Breakout Stage
  if (activePitchRoom) {
    return (
      <OneToOnePitchStage
        pitchRoom={activePitchRoom}
        onExit={() => {
          setActivePitchRoom(null);
        }}
      />
    );
  }

  // Real Production Meeting Bridge & Stream Stage (Google Meet, Zoom, Teams, Jitsi, WebRTC SFU)
  if (activeProductionMeeting) {
    return (
      <ProductionMeetingEmbed
        meeting={activeProductionMeeting}
        onExit={leaveProductionMeeting}
      />
    );
  }

  if (currentRole === "auditor") {
    return (
      <div className="relative flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
        <RoleSwitcherBar />
        <AuditorCockpitView />
        <AttentionAuditDrawer />
        <MultiDeviceRemoteConsole />
        <HelpEscalationModals />
        <ChildFeedbackModal />
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Role Switcher Viewport Bar */}
      <RoleSwitcherBar />

      {/* Role Cockpit Specific Action Strip */}
      {currentRole === "sales_rep" ? (
        <div className="h-10 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-b border-emerald-500/30 px-3 flex items-center justify-between text-xs shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>1:1 Live Admissions Demo Stage</span>
            </div>
            <span className="text-[11px] text-slate-300 font-medium hidden md:inline">
              Real-time Audio Captioning & Pitch Telemetry Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("sales_hub")}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
            >
              Sales Hub
            </button>
            <EdgeMeshLatencyHUD />
          </div>
        </div>
      ) : currentRole === "instructor" || currentRole === "admin" ? (
        <div className="h-10 bg-[#091122] border-b border-slate-800 px-3 flex items-center justify-between text-xs shrink-0 z-20">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">
              Room Capacity:
            </span>
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
              {(["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:8", "1:12", "1:16", "1:24"] as RoomRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setRoomRatio(ratio)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer ${
                    roomRatio === ratio
                      ? "bg-[#003872] text-[#FFBB00] shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title={`Configure Room Capacity: ${ratio}`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            <button
              onClick={muteAllParticipants}
              className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] font-medium hover:bg-rose-900 transition-colors cursor-pointer"
            >
              Mute All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <EdgeMeshLatencyHUD />
          </div>
        </div>
      ) : (
        <div className="h-10 bg-[#0c1222] border-b border-slate-800 px-3 flex items-center justify-between text-xs shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Personal Focus: 96% (High Focus)</span>
            </div>

            <button
              onClick={() => setActiveDockTab("smartnotes")}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Smart Peer Notes</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsParentHelpModalOpen(true)}
              className="px-2 py-0.5 rounded bg-[#001F40] border border-cyan-800 text-cyan-300 text-[11px] font-medium hover:bg-[#002e60] transition-colors cursor-pointer"
            >
              Ask Parent
            </button>
            <button
              onClick={() => setIsCxHelpModalOpen(true)}
              className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] font-medium hover:bg-rose-900 transition-colors cursor-pointer"
            >
              Ask CX
            </button>
            <EdgeMeshLatencyHUD />
          </div>
        </div>
      )}

      {/* Recording & Session Info Banner */}
      <div className="absolute top-12 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* E2EE Lock Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#003872]/90 backdrop-blur border border-[#003872] text-xs text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFBB00]" />
            <span className="font-mono text-[11px]">21K E2EE AES-256</span>
          </div>

          {/* HD Recording Status */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FF7176]/90 backdrop-blur border border-[#FF7176] text-xs text-white animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="font-mono text-[11px] font-semibold">REC {formatDuration(recordingSeconds)}</span>
            </div>
          )}

          {/* Hand Raised Counter */}
          {participants.filter((p) => p.handRaised).length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#FFBB00] text-[#003872] text-xs font-bold shadow-sm">
              <Hand className="w-3 h-3 text-[#003872]" />
              <span>{participants.filter((p) => p.handRaised).length} Raised</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {hasRecordedClip && !isRecording && (
            <button
              onClick={downloadRecordedClip}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#003872] border border-[#0082FF] text-xs text-white hover:bg-[#00264d] transition-colors shadow-lg"
            >
              <Download className="w-3.5 h-3.5 text-[#FFBB00]" />
              <span>Download 21K Lecture .webm</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Real-Time Biometric Attention & Audio Telemetry HUD */}
      <FloatingAttentionHUD />

      {/* Main Video Stage Viewport */}
      <div
        onClick={handleStageClick}
        className="relative flex-1 p-3 overflow-hidden flex items-center justify-center cursor-crosshair"
      >
        {/* Remote Laser Pointer Overlay */}
        {remotePointer.active && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-150 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${remotePointer.x * 100}%`,
              top: `${remotePointer.y * 100}%`,
            }}
          >
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg shadow-red-500/50 animate-ping absolute inset-0" />
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg shadow-red-500/50" />
              <div className="absolute top-5 left-0 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                {remotePointer.label}
              </div>
            </div>
          </div>
        )}

        {/* Screen Sharing View OR Video Tiles Grid */}
        {isScreenSharing ? (
          <div className="w-full h-full flex flex-col gap-2">
            {/* Screen Share Stage */}
            <div className="relative flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group shadow-2xl">
              {screenStream ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                    <Share2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    Synchronized Screen Presentation Active
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mb-3">
                    Broadcasting live desktop presentation. Click anywhere on this stage to drop remote laser annotations for students.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 px-3 py-1 rounded bg-indigo-950/60 border border-indigo-800/50">
                    <Radio className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>Multi-Device Ultra-Low Latency Feed (1080p 60fps)</span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur text-xs font-mono text-slate-300 border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Dr. Evelyn Vance is presenting</span>
              </div>
            </div>

            {/* Picture-in-picture participant row */}
            <div className="h-28 flex items-center gap-2 overflow-x-auto py-1">
              {participants.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="relative w-36 h-full rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-inner"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-slate-300">
                    <span className="truncate max-w-[80px]">{p.name.split(" ")[0]}</span>
                    {p.audioEnabled ? (
                      <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-2.5 h-2.5 text-rose-400" />
                    )}
                  </div>
                  {/* Zero-toggle Student Management overlay */}
                  <ParticipantTileActions participant={p} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Dynamic Adaptive Video Grid (1:1 to 1:24 capacities) */
          <div className={`w-full h-full grid ${getGridClass(participants.length)} gap-2.5 auto-rows-fr overflow-y-auto p-1 max-h-full`}>
            {participants.map((p) => {
              const isLocalUser = p.isLocal;
              const hasVideo = isLocalUser ? !isVideoOff : p.videoEnabled;
              const isAudioActive = isLocalUser ? !isAudioMuted : p.audioEnabled;
              const isSpeaking = p.audioLevel > 18;

              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl bg-[#0f172a] border overflow-hidden flex flex-col items-center justify-center group transition-all duration-200 min-h-[140px] sm:min-h-[180px] ${
                    isSpeaking
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Real-time attention score badge for student tiles */}
                  {p.role === "student" && attentionAudits[p.id] && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1 shadow-sm pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>{attentionAudits[p.id].attentionScore}% Focus</span>
                    </div>
                  )}

                  {/* Sub-20ms edge latency badge */}
                  <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 text-[9px] font-mono font-semibold text-emerald-400 pointer-events-none">
                    &lt;15ms
                  </div>
                  {/* Real video feed for local user if enabled */}
                  {isLocalUser && hasVideo ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover -scale-x-100"
                    />
                  ) : (
                    /* High-fidelity avatar & waveform container */
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-950">
                      <div className="relative mb-2">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg transition-transform ${
                            isSpeaking ? "scale-110 ring-4 ring-indigo-500/40" : ""
                          }`}
                          style={{ backgroundColor: p.avatarColor }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        {p.handRaised && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-md animate-bounce">
                            <Hand className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Quiet unboxed metadata */}
                      <div className="text-center">
                        <p className="text-xs font-medium text-slate-200 truncate max-w-[150px]">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {p.role} · {p.breakoutRoomId ? "Breakout Room" : "Main Hall"}
                        </p>
                      </div>

                      {/* Live speaking equalizer waveform */}
                      {isSpeaking && (
                        <div className="flex items-center gap-1 mt-3">
                          <span className="w-1 h-3 rounded bg-indigo-500 animate-pulse" />
                          <span className="w-1 h-5 rounded bg-indigo-400 animate-pulse delay-75" />
                          <span className="w-1 h-2 rounded bg-indigo-500 animate-pulse delay-150" />
                          <span className="w-1 h-4 rounded bg-indigo-400 animate-pulse delay-100" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tile Overlay Controls */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs pointer-events-none">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-slate-200 border border-white/5 font-mono text-[11px]">
                      <span className="truncate max-w-[110px]">{p.name}</span>
                      {isLocalUser && <span className="text-indigo-400">(You)</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <div
                        className={`p-1 rounded bg-black/60 backdrop-blur border border-white/5 ${
                          isAudioActive ? "text-slate-300" : "text-rose-400"
                        }`}
                      >
                        {isAudioActive ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                      </div>
                      <div
                        className={`p-1 rounded bg-black/60 backdrop-blur border border-white/5 ${
                          hasVideo ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {hasVideo ? <VideoIcon className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>

                  {/* Zero-toggle Student Management overlay */}
                  <ParticipantTileActions participant={p} />
                </div>
              );
            })}
          </div>
        )}

        {/* Real-Time Live Captions & Multilingual Subtitle Overlay */}
        <SubtitleOverlay />

        {/* Synchronized Room Break Countdown & Mindfulness Overlay */}
        <RoomBreakOverlay />
      </div>

      {/* Floating Bottom Meeting Controls Bar */}
      <div className="h-16 bg-[#090d16] border-t border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left Side: Audio & Video Device Toggles */}
        <div className="flex items-center gap-2">
          {/* Mic Button */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              isAudioMuted
                ? "bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                : "bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isAudioMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Video Button */}
          <button
            onClick={toggleVideo}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              isVideoOff
                ? "bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                : "bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <VideoIcon className="w-4 h-4 text-indigo-400" />}
            <span className="hidden sm:inline">{isVideoOff ? "Start Video" : "Stop Video"}</span>
          </button>
        </div>

        {/* Center: Collaboration Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar mx-1 sm:mx-2 flex-1 justify-center">
          {/* Real-time Subtitles / CC Toggle */}
          <button
            onClick={toggleLiveSubtitles}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isLiveSubtitlesActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
            title="Toggle Live Subtitles Overlay (Dual English + Translated)"
          >
            <Languages className="w-4 h-4" />
            <span className="hidden md:inline">
              {isLiveSubtitlesActive ? `CC [${subtitleLanguage.toUpperCase()}]` : "Subtitles"}
            </span>
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isScreenSharing
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
          </button>

          {/* HD Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isRecording
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Disc className="w-4 h-4" />
            <span className="hidden md:inline">{isRecording ? "Stop REC" : "Record HD"}</span>
          </button>

          {/* Hand Raise */}
          <button
            onClick={toggleHandRaise}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              handRaised
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Hand className="w-4 h-4" />
            <span className="hidden md:inline">{handRaised ? "Lower Hand" : "Raise Hand"}</span>
          </button>

          {/* Quick Room Break (5 Mins) - Teacher & Admin Only */}
          {(currentRole === "instructor" || currentRole === "admin") && (
            <button
              onClick={() => startRoomBreak(5, "5-Minute Cognitive Rest & Eye Refresh")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900 transition-colors cursor-pointer"
              title="Initiate synchronized 5-Minute classroom break"
            >
              <Coffee className="w-4 h-4 text-[#FFBB00]" />
              <span className="hidden xl:inline">Break (5m)</span>
            </button>
          )}

          {/* Live Attention & Audio Audit Drawer - Teacher & Admin Only */}
          {(currentRole === "instructor" || currentRole === "admin") && (
            <button
              onClick={() => setIsAuditDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-colors cursor-pointer"
              title="Classroom Attention & Audio Audit Drawer"
            >
              <Activity className="w-4 h-4 text-[#00C2E0]" />
              <span className="hidden xl:inline">Attention Audit</span>
            </button>
          )}

          {/* 1-Click Ask Parent Help - Student Only */}
          {currentRole === "student" && (
            <button
              onClick={() => setIsParentHelpModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#001F40] text-cyan-300 border border-cyan-800 hover:bg-[#002e60] transition-colors cursor-pointer"
              title="Ask for Parent Help"
            >
              <HelpCircle className="w-4 h-4 text-[#00C2E0]" />
              <span className="hidden xl:inline">Ask Parent</span>
            </button>
          )}

          {/* 1-Click Ask CX Help - Student & Instructor */}
          {(currentRole === "student" || currentRole === "instructor") && (
            <button
              onClick={() => setIsCxHelpModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors cursor-pointer"
              title="Ask for CX / Tech Ops Help"
            >
              <ShieldAlert className="w-4 h-4 text-[#FF7176]" />
              <span className="hidden xl:inline">Ask CX</span>
            </button>
          )}

          {/* Multi-Device Remote System Access Console Trigger - Teacher & Admin Only */}
          {(currentRole === "instructor" || currentRole === "admin") && (
            <button
              onClick={() => setIsRemoteAccessModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#001F40] text-[#00C2E0] border border-[#00C2E0]/40 hover:bg-[#002e60] transition-colors cursor-pointer shadow-xs"
              title="Open Multi-Device Remote System Access Console (Phone, Tablet, Laptop, Desktop PC)"
            >
              <Laptop className="w-4 h-4 text-[#00C2E0]" />
              <span className="hidden sm:inline">Remote Desk</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#00C2E0]/20 text-[#00C2E0] text-[10px] font-mono font-bold">
                {remoteSessions.filter((s) => s.status === "active").length}
              </span>
            </button>
          )}

          {/* Student Offer Device Access Trigger - Student Only */}
          {currentRole === "student" && (
            <button
              onClick={() => setIsOfferAccessModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900 transition-colors cursor-pointer"
              title="Offer Your Device (Phone, Tablet, Laptop, Desktop PC) to Instructor"
            >
              <Tablet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Offer Device</span>
            </button>
          )}
        </div>

        {/* Right Side: AI Digest, LLM Notebook & Leave */}
        <div className="flex items-center gap-2">
          {/* Post-Class Google LLM Notebook */}
          <button
            onClick={() => setActiveView("notebook")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors"
            title="Open Google LLM Notebook with Interactive Concept Graph & Flow"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">LLM Notebook</span>
          </button>

          <button
            onClick={() => setIsAiSummaryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">AI Summary</span>
          </button>

          <button
            onClick={() => alert("Classroom session paused. You can rejoin at any time using your custom room link.")}
            className="px-3.5 py-2 rounded-lg bg-rose-600/20 border border-rose-600/40 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Slide-over Deep Biometric Attention & Audio Audit Drawer */}
      <AttentionAuditDrawer />

      {/* Multi-Device Remote System Access Console (Phone, Tablet, Laptop, Desktop PC) */}
      <MultiDeviceRemoteConsole />

      {/* Student Offer Device Access Modal */}
      <RemoteAccessOfferModal />

      {/* Real-time Incoming Request & Offer Prompts */}
      <IncomingAccessNotification />

      {/* Instant Single-Click Parent & CX Help Escalations */}
      <HelpEscalationModals />

      {/* Direct In-Room Student Formative Feedback & Star Praise */}
      <ChildFeedbackModal />
    </div>
  );
};
