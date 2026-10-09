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
  Play,
  GraduationCap,
  Briefcase,
  Cloud,
  Sliders,
  PhoneOff,
} from "lucide-react";
import { generateDemoMeetingUrl } from "../../services/demoClassService";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { ClassHeader } from "./ClassHeader";
import { LivePollCard } from "./controls/TeacherControls";
import { classroomTransport } from "../../services/media/classroomTransport";
import { StageLayout, Presentation } from "./stage/StageLayout";
import { TranscriptFeed } from "./TranscriptFeed";
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

/** Phones and tablets (< 1024px) get the swipeable stage panes. */
function useIsCompact() {
  const query = "(max-width: 1023px)";
  const [compact, setCompact] = React.useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setCompact(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return compact;
}

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
    classStatus,
    classDurationSeconds,
    startClass,
    endClass,
    connectDemoStudent,
    triggerRoomBomber,
    roomRatio,
    setIsScheduleModalOpen,
    isWhiteboardPresenting,
    transportState,
    hasLeftClass,
    rejoinClass,
    startAudioPlayback,
    mediaJoinError,
    spotlightId,
    setSpotlight,
    hostAction,
  } = useClassroom();
  const isHost = currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep";
  const isCompact = useIsCompact();

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
    const studentUrl = generateDemoMeetingUrl({
      roomCode: roomId,
      studentId: "21SCHOLARX",
      grade: 10,
      course: roomTitle.split("·")[0]?.trim() || "Physics",
      language: "en",
      ratio: roomRatio || "1:4",
      teacherName: "Dr. Evelyn Vance",
    });
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


  if (hasLeftClass) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#070b14]">
        <div className="max-w-sm w-full text-center space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <PhoneOff className="w-6 h-6 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold text-white">You left the class</h2>
          <p className="text-sm text-slate-400">The class is still running for everyone else.</p>
          <button onClick={rejoinClass} className="btn-primary w-full">
            Rejoin class
          </button>
        </div>
      </div>
    );
  }

  // Removed by the host, or not admitted from the waiting room
  if (transportState.error === "removed" || transportState.error === "denied") {
    const denied = transportState.error === "denied";
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#070b14]">
        <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <ClassHeader roomSlug={roomId} fallbackTitle={roomTitle.split("·")[0]} />
          <h2 className="text-lg font-bold text-white">{denied ? "Your teacher didn't let you in this time" : "You were removed from this class"}</h2>
          <p className="text-sm text-slate-400">If you think this is a mistake, you can ask to join again. Your teacher will see your request.</p>
          <button onClick={() => classroomTransport.rejoin()} className="btn-primary mx-auto">
            Ask to join again
          </button>
        </div>
      </div>
    );
  }

  // Learner connected but not yet admitted by the host
  if (transportState.waiting) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#070b14]">
        <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="relative mx-auto w-14 h-14">
            <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-200 text-xl">⏳</div>
          </div>
          <ClassHeader roomSlug={roomId} fallbackTitle={roomTitle.split("·")[0]} />
          <h2 className="text-lg font-bold text-white">Waiting for your teacher to let you in</h2>
          <p className="text-sm text-slate-400">Keep this screen open. You'll join automatically when you're admitted.</p>
        </div>
      </div>
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
  // Learners in the waiting room never appear on stage (hosts admit them from the bar)
  const displayParticipants = participants.filter((p) => {
    if (p.waiting) return false;
    if (!showSelfView && p.isLocal) return false;
    return true;
  });

  // Calculate grid column classes based on layout mode and manual controls
  // Container-query columns: the stage lives in a resizable pane, so columns follow the pane width
  const getGridClasses = () => {
    if (manualGridColumns > 0) {
      if (manualGridColumns === 1) return "grid-cols-1";
      if (manualGridColumns === 2) return "grid-cols-1 @md:grid-cols-2";
      if (manualGridColumns === 3) return "grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3";
      if (manualGridColumns === 4) return "grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4";
      return "grid-cols-2 @xl:grid-cols-3 @5xl:grid-cols-5";
    }

    const count = displayParticipants.length;
    if (count <= 1) return "grid-cols-1";
    if (count <= 4) return "grid-cols-1 @md:grid-cols-2";
    if (count <= 6) return "grid-cols-2 @2xl:grid-cols-3";
    return "grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-4";
  };

  const getAspectClass = () => {
    if (tileAspectRatio === "4:3") return "aspect-[4/3]";
    if (tileAspectRatio === "1:1") return "aspect-square";
    return "aspect-video";
  };

  // Pinned or spotlighted participant
  const pinnedParticipant = displayParticipants.find((p) => p.id === pinnedParticipantId) || displayParticipants[0];

  // What fills the main stage: a shared screen beats a presented whiteboard; otherwise people
  const localParticipant = displayParticipants.find((p) => p.isLocal) || participants.find((p) => p.isLocal);
  const remotePresenter = participants.find((p) => !p.isLocal && p.screenSharing && p.attachScreen);
  const presentation: Presentation =
    isScreenSharing && screenStream && localParticipant
      ? { kind: "screen", presenter: localParticipant, localStream: screenStream }
      : remotePresenter
      ? { kind: "screen", presenter: remotePresenter }
      : isWhiteboardPresenting
      ? { kind: "whiteboard" }
      : null;

  const renderTile = (p: Participant) => (
    <ParticipantVideoTile
      participant={p}
      isLocal={!!p.isLocal}
      localStream={localStream}
      isAudioMuted={isAudioMuted}
      isVideoOff={isVideoOff}
      isPinned={pinnedParticipantId === p.id}
      onPinToggle={() => setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)}
      aspectClass=""
      hostMenu={
        isHost && !p.isLocal
          ? [
              { label: p.audioEnabled ? "Mute microphone" : "Microphone is off", onClick: () => hostAction("mute", [p.id]), disabled: !p.audioEnabled },
              { label: p.videoEnabled ? "Stop video" : "Video is off", onClick: () => hostAction("stop_video", [p.id]), disabled: !p.videoEnabled },
              { label: spotlightId === p.id ? "Remove spotlight" : "Spotlight for everyone", onClick: () => setSpotlight(spotlightId === p.id ? null : p.id) },
              {
                label: "Remove from class",
                danger: true,
                onClick: () => {
                  if (window.confirm(`Remove ${p.name} from this class?`)) hostAction("remove", [p.id]);
                },
              },
            ]
          : undefined
      }
    />
  );

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex-1 flex flex-col bg-[#070b14] overflow-hidden select-none">
      {/* Connection & audio notices: the class keeps running underneath */}
      {(transportState.status === "reconnecting" || transportState.audioBlocked || mediaJoinError || transportState.error === "duplicate_identity") && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 w-[calc(100%-1rem)] max-w-md pointer-events-none">
          {transportState.status === "reconnecting" && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100 text-xs font-semibold flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Connection unstable, reconnecting… you're still in class
            </div>
          )}
          {transportState.error === "duplicate_identity" && (
            <div className="pointer-events-auto px-3 py-2.5 rounded-xl bg-slate-900/95 border border-white/15 text-slate-100 text-xs flex items-center gap-3 shadow-lg">
              <span>You joined this class from another tab or device.</span>
              <button onClick={() => classroomTransport.rejoin()} className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold">
                Use here
              </button>
            </div>
          )}
          {transportState.audioBlocked && (
            <button onClick={startAudioPlayback} className="pointer-events-auto px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg">
              Tap to turn on class sound
            </button>
          )}
          {mediaJoinError && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-100 text-xs">
              {mediaJoinError === "device_blocked"
                ? "This device isn't allowed for this class. Please rejoin from a laptop or desktop."
                : "Couldn't connect audio/video. Check your connection; we'll keep trying."}
            </div>
          )}
        </div>
      )}

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
        className="@container flex-1 min-h-0 p-2 sm:p-3 md:p-4 pb-14 overflow-y-auto flex flex-col relative"
        onClick={handleStageClick}
      >
        {/* Zoom & Google Meet Style Live Class Top Status HUD */}
        <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 rounded-2xl bg-slate-900/90 border border-white/10 mb-2 @md:mb-3 shadow-lg shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {classStatus === "in_progress" ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase text-rose-400 font-mono whitespace-nowrap">
                  Live
                </span>
                <span className="text-xs font-mono font-bold text-white bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/30">
                  {formatDuration(classDurationSeconds)}
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase text-amber-300 font-mono whitespace-nowrap">
                  Waiting room
                </span>
              </>
            )}
            <span className="w-px h-5 bg-white/10 shrink-0" />
            <ClassHeader roomSlug={roomId} fallbackTitle={roomTitle.split("·")[0]} compact={isCompact} />
          </div>

          <span className="hidden @lg:flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-xl border border-cyan-500/30 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI translation ready
          </span>
        </div>

        {/* End-of-Session Cloud Recording / Google Drive Archival Indicator */}
        {classStatus === "ended" && (
          <div className="p-4 mb-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-blue-950/80 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Cloud className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Demo & Sales Pitch Recordings Secured</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">Google Drive Synced</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Teacher lecture & admissions sales pitch audio/video archived to <code className="text-cyan-300">/21K-Dronacharya/Demos/2026-10-12-{roomId}.mp4</code>.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors shrink-0"
            >
              Close & Teardown Room
            </button>
          </div>
        )}

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
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={handleCopyStudentLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? "Student Link Copied!" : "Copy Student Invite Link"}</span>
                  </button>

                  {(currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep") && (
                    <button
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 border border-cyan-500/30 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-[#FFBB00]" />
                      <span>Manual Link & Room Builder (No CRM)</span>
                    </button>
                  )}
                </div>
              </div>
        ) : displayParticipants.length === 1 && displayParticipants[0].isLocal && classStatus === "waiting" && !presentation ? (
              /* Pre-Class Waiting State (Zoom/Meet Waiting Room & Launchpad) */
              <div className="w-full grid grid-cols-1 @2xl:grid-cols-2 gap-3 @2xl:gap-4 items-center max-w-4xl mx-auto my-auto p-1 @md:p-2">
                {/* Local User Tile */}
                <div className="w-full max-w-md @2xl:max-w-none mx-auto max-h-[38vh] @2xl:max-h-[380px]">
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

                {/* Pre-Class Launchpad & Status Card */}
                <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-4 @md:p-6 flex flex-col justify-between gap-4 shadow-2xl">
                  {currentRole === "student" ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                          Class Waiting Room · Room {roomId}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                        Waiting for Teacher to Start Class
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        Dr. Evelyn Vance hasn't started the live class yet. Your camera and microphone are tested and connected. You will automatically enter the live stage as soon as the teacher starts the lecture.
                      </p>
                      <div className="p-3 bg-blue-950/50 border border-blue-500/30 rounded-xl space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>AI Real-time Interpreter & Dual Subtitles Ready</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          When your teacher speaks in Hindi, English, Spanish or 50+ languages, live translated speech and captions will stream directly to your headphones.
                        </p>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Ready to learn as <strong className="text-white">{displayParticipants[0].name}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                            Classroom Ready · Room {roomId}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{roomTitle}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          Your camera, mic, and real-time AI interpreter are ready. Start the live class to lecture, or connect a test student right now.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <button
                          onClick={startClass}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Start Live Class (Zoom/Meet Mode)</span>
                        </button>

                        <button
                          onClick={connectDemoStudent}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-cyan-400" />
                          <span>Pair Demo Student (Sophia Chen)</span>
                        </button>

                        <button
                          onClick={handleCopyStudentLink}
                          className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedLink ? "Student Link Copied!" : "Copy Student Invite Link"}</span>
                        </button>

                        {(currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep") && (
                          <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 hover:from-blue-900/60 hover:to-indigo-900/60 border border-blue-500/30 text-cyan-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-[#FFBB00]" />
                            <span>Manual Link & Room Builder (No CRM)</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
        ) : (
          <StageLayout
            participants={displayParticipants}
            renderTile={renderTile}
            pinnedId={spotlightId || pinnedParticipantId}
            presentation={presentation}
            compact={isCompact}
            detailsPane={<TranscriptFeed />}
          />
        )}


        <LivePollCard isHost={isHost} />

        {/* Synchronized Room Break Countdown & Mindfulness Overlay */}
        <RoomBreakOverlay />
      </div>

      {/* Modern Redesigned Bottom Meeting Controls Dock */}
      {/* Live captions float just above the control bar, outside the scrolling stage */}
      <div className="relative shrink-0 h-0 z-30">
        <SubtitleOverlay />
      </div>
      <BottomMeetingControls />

      {/* Attention/audio audit drawer: auditors and admins only */}
      {currentRole === "admin" && <AttentionAuditDrawer />}

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
