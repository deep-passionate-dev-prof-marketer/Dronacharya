import React, { useRef, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Share2,
  Hand,
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
  Pin,
  PinOff,
  Copy,
  Check,
  Link2,
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
import { AuditorCockpitView } from "./AuditorCockpitView";
import { EdgeMeshLatencyHUD } from "./EdgeMeshLatencyHUD";
import { OneToOnePitchStage } from "../bomber/OneToOnePitchStage";
import { ParticipantVideoTile } from "./ParticipantVideoTile";
import { BottomMeetingControls } from "./BottomMeetingControls";
import { Participant } from "../../types";

export const VideoStage: React.FC = () => {
  const {
    participants,
    currentRole,
    activePitchRoom,
    setActivePitchRoom,
    activeProductionMeeting,
    leaveProductionMeeting,
    localStream,
    screenStream,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    remotePointer,
    setRemotePointer,
    attentionAudits,
    roomId,
    roomTitle,
    roomLink,
    layoutMode,
    manualGridColumns,
    tileAspectRatio,
    pinnedParticipantId,
    setPinnedParticipantId,
    showSelfView,
  } = useClassroom();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyStudentLink = () => {
    const studentUrl = typeof window !== "undefined"
      ? `${window.location.origin}/?room=${roomId}&role=student`
      : roomLink;
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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


  if (currentRole === "auditor") {
    return (
      <div className="relative flex-1 flex flex-col bg-[#070b14] overflow-hidden select-none">
        <AuditorCockpitView />
        <AttentionAuditDrawer />
        <MultiDeviceRemoteConsole />
        <HelpEscalationModals />
        <ChildFeedbackModal />
        <BottomMeetingControls />
      </div>
    );
  }

  // Filter participants based on showSelfView setting
  const displayParticipants = participants.filter((p) => {
    if (!showSelfView && p.isLocal) return false;
    return true;
  });

  // Calculate grid column classes based on layout mode and manual controls
  const getGridClasses = () => {
    if (manualGridColumns > 0) {
      if (manualGridColumns === 1) return "grid-cols-1";
      if (manualGridColumns === 2) return "grid-cols-1 sm:grid-cols-2";
      if (manualGridColumns === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      if (manualGridColumns === 4) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
      return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
    }

    const count = displayParticipants.length;
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  };

  const getAspectClass = () => {
    if (tileAspectRatio === "4:3") return "aspect-[4/3]";
    if (tileAspectRatio === "1:1") return "aspect-square";
    return "aspect-video";
  };

  // Pinned or spotlighted participant
  const pinnedParticipant = displayParticipants.find((p) => p.id === pinnedParticipantId) || displayParticipants[0];

  return (
    <div className="relative flex-1 flex flex-col bg-[#070b14] overflow-hidden select-none">
      {/* Laser Pointer Overlay */}
      {remotePointer.active && (
        <div
          className="absolute z-40 pointer-events-none transition-all duration-75 flex items-center gap-1.5"
          style={{
            left: `${remotePointer.x * 100}%`,
            top: `${remotePointer.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/80 animate-ping" />
          <span className="text-[10px] font-mono font-bold bg-cyan-900/90 text-cyan-200 px-2 py-0.5 rounded shadow">
            {remotePointer.label}
          </span>
        </div>
      )}

      {/* Main Video Viewport Area */}
      <div
        className="flex-1 p-3 md:p-4 overflow-y-auto flex flex-col relative"
        onClick={handleStageClick}
      >
        {isScreenSharing ? (
          /* Screen Presentation View */
          <div className="w-full h-full flex flex-col gap-3">
            <div className="flex-1 rounded-2xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
              {screenStream ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
                    <Share2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Screen Share Active
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Broadcasting live desktop presentation. Click stage to drop laser pointers.
                  </p>
                </div>
              )}
            </div>

            {/* Filmstrip participant row */}
            <div className="h-24 flex items-center gap-2 overflow-x-auto py-1">
              {displayParticipants.map((p) => (
                <div
                  key={p.id}
                  className="relative w-32 h-full rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center group"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-slate-300">
                    <span className="truncate max-w-[70px]">{p.name.split(" ")[0]}</span>
                    {p.audioEnabled ? <Volume2 className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : layoutMode === "spotlight" && pinnedParticipant ? (
          /* Spotlight Hero Mode */
          <div className="w-full h-full flex flex-col gap-3">
            {/* Primary Hero Stage */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-xl">
              <ParticipantVideoTile
                participant={pinnedParticipant}
                isLocal={!!pinnedParticipant.isLocal}
                localStream={localStream}
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                isPinned={true}
                onPinToggle={() => setPinnedParticipantId(null)}
                aspectClass="w-full h-full"
              />
            </div>

            {/* Thumbnail row */}
            <div className="h-24 flex items-center gap-2 overflow-x-auto py-1">
              {displayParticipants
                .filter((p) => p.id !== pinnedParticipant.id)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPinnedParticipantId(p.id)}
                    className="relative w-32 h-full rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center group hover:border-blue-500/50 transition-all text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-slate-300">
                      <span className="truncate max-w-[70px]">{p.name.split(" ")[0]}</span>
                      <Pin className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-blue-400" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          /* Standard & Custom Grid View */
          <div className="w-full h-full flex flex-col justify-center">
            {displayParticipants.length === 0 ? (
              /* Completely Empty Stage */
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 my-auto">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Ready for Classroom Participants
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Share the student invite link below to connect real-time peers with audio and video.
                </p>
                <button
                  onClick={handleCopyStudentLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Student Link Copied!" : "Copy Student Invite Link"}</span>
                </button>
              </div>
            ) : displayParticipants.length === 1 && displayParticipants[0].isLocal ? (
              /* Single User (You are the only one in room) -> Hero + Fast Student Invite Card */
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 items-center max-w-4xl mx-auto my-auto p-2">
                {/* Local User Tile */}
                <div className="w-full h-full max-h-[380px]">
                  <ParticipantVideoTile
                    participant={displayParticipants[0]}
                    isLocal={true}
                    localStream={localStream}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isPinned={false}
                    onPinToggle={() => {}}
                    aspectClass={getAspectClass()}
                  />
                </div>

                {/* Invite & Classroom Status Card */}
                <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 flex flex-col justify-between shadow-2xl min-h-[260px] backdrop-blur-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                        Classroom Active · Room {roomId}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-2">{roomTitle}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      You are live in the classroom with in-house WebRTC. Click below to copy the direct Student joining link to test or start the lesson with your scholar!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleCopyStudentLink}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? "Student Invite Link Copied!" : "🔗 Copy Student Invite Link"}</span>
                    </button>
                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/10 text-[11px] text-slate-400 font-mono truncate">
                      <span className="truncate flex-1">{typeof window !== "undefined" ? `${window.location.origin}/?room=${roomId}&role=student` : roomLink}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Multi-Participant Adaptive Grid (Real WebRTC Peers) */
              <div className={`w-full grid ${getGridClasses()} gap-3 auto-rows-fr overflow-y-auto p-1 max-h-full`}>
                {displayParticipants.map((p) => (
                  <ParticipantVideoTile
                    key={p.id}
                    participant={p}
                    isLocal={!!p.isLocal}
                    localStream={localStream}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isPinned={pinnedParticipantId === p.id}
                    onPinToggle={() => setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)}
                    aspectClass={getAspectClass()}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Real-Time Live Captions & Multilingual Subtitle Overlay */}
        <SubtitleOverlay />

        {/* Synchronized Room Break Countdown & Mindfulness Overlay */}
        <RoomBreakOverlay />
      </div>

      {/* Modern Redesigned Bottom Meeting Controls Dock */}
      <BottomMeetingControls />

      {/* Slide-over Deep Biometric Attention & Audio Audit Drawer */}
      <AttentionAuditDrawer />

      {/* Multi-Device Remote System Access Console */}
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
