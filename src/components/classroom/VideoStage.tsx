import React, { useRef, useEffect } from "react";
import { confirmDialog, toast } from "../ui/Feedback";
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
import { SubtitleOverlay } from "./SubtitleOverlay";
import { ClassHeader, useClassInfo } from "./ClassHeader";
import { LivePollCard } from "./controls/TeacherControls";
import { ClassEndedCard } from "./ClassEndedCard";
import { useClassContent } from "./slides/SlidesAndNotes";
import { slidesStore, useStore } from "../../services/classSlides";
import { AccessProblemCard, ConnectionBanners, HostedByNote, StartClassButton, useAccessProblem, VideoModeBadge } from "./SessionControls";
import { classroomTransport } from "../../services/media/classroomTransport";
import { StageLayout, Presentation } from "./stage/StageLayout";
import { TranscriptFeed } from "./TranscriptFeed";
import { RoomBreakOverlay } from "./RoomBreakOverlay";
import { MultiDeviceRemoteConsole } from "./MultiDeviceRemoteConsole";
import { RemoteAccessOfferModal } from "./RemoteAccessOfferModal";
import { HelpEscalationModals } from "./HelpEscalationModals";
import { ChildFeedbackModal } from "./ChildFeedbackModal";
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
    classHost,
    classRecording,
    recordingExcludedMe,
    classSessionError,
    setLowBandwidth,
    dismissLowBandwidthSuggestion,
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
    demoFeatures,
    setActiveFeedbackTarget,
    setIsFeedbackModalOpen,
  } = useClassroom();
  // The server decides who hosts this class (its teacher, admins, counsellors on their sessions)
  const isHost = Boolean(classHost?.isHost);
  const accessProblem = useAccessProblem();
  useClassContent();
  const slides = useStore(slidesStore);
  const classInfo = useClassInfo(roomId);
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

  /** The class's own link: learners on the class list sign in and wait in the lobby until admitted */
  const handleCopyStudentLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast(`Copy this class link: ${roomLink}`, "neutral");
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
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
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

  // Not on the class list, wrong breakout group, parent account, or signed out
  if (accessProblem) return <AccessProblemCard problem={accessProblem} />;

  // Removed by the host, or not admitted from the waiting room
  if (transportState.error === "removed" || transportState.error === "denied") {
    const denied = transportState.error === "denied";
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
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
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
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

  // Filter participants based on showSelfView setting
  // Learners in the waiting room never appear on stage (hosts admit them from the bar)
  const displayParticipants = participants.filter((p) => {
    if (p.waiting) return false;
    // Auditors observe hidden: no tile of their own
    if (currentRole === "auditor" && p.isLocal) return false;
    if (!showSelfView && p.isLocal) return false;
    return true;
  });


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
      : slides?.onStage
      ? { kind: "slides" }
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
              ...(p.role === "student"
                ? [
                    {
                      label: "Give feedback or a remark",
                      onClick: () => {
                        setActiveFeedbackTarget(p);
                        setIsFeedbackModalOpen(true);
                      },
                    },
                  ]
                : []),
              {
                label: "Remove from class",
                danger: true,
                onClick: async () => {
                  if (await confirmDialog({ title: `Remove ${p.name} from this class?`, body: "They can ask to join again; you'll see them in the lobby.", confirmLabel: "Remove", tone: "critical" })) {
                    const err = await hostAction("remove", [p.id]);
                    if (err) toast(err, "critical");
                  }
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
    <div className="relative flex-1 flex flex-col bg-canvas overflow-hidden select-none">
      {/* Connection & audio notices: the class keeps running underneath */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 w-[calc(100%-1rem)] max-w-md pointer-events-none">
          <ConnectionBanners />
          {transportState.suggestLowBandwidth && !transportState.lowBandwidth && (
            <div className="pointer-events-auto px-3 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100 text-xs flex flex-wrap items-center gap-2 shadow-lg" role="status">
              <span>Your connection is weak. Switch to audio and slides only?</span>
              <span className="flex gap-1.5 ml-auto">
                <button onClick={() => setLowBandwidth(true)} className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold">
                  Switch
                </button>
                <button onClick={dismissLowBandwidthSuggestion} className="px-2.5 py-1 rounded-lg bg-white/10 text-amber-100">
                  Not now
                </button>
              </span>
            </div>
          )}
          {transportState.lowBandwidth && (
            <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 text-xs flex items-center gap-2 shadow-lg" role="status">
              <span>Low-bandwidth mode · audio and slides only</span>
              <button onClick={() => setLowBandwidth(false)} className="px-2 py-0.5 rounded-md bg-white/10 font-semibold">
                Turn off
              </button>
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
          {mediaJoinError === "device_blocked" && (
            <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-100 text-xs" role="alert">
              This device isn't allowed for this class. Please rejoin from a laptop or desktop.
            </div>
          )}
      </div>


      {/* Main Video Viewport Area */}
      <div
        className="@container flex-1 min-h-0 p-2 sm:p-3 md:p-4 pb-14 overflow-y-auto flex flex-col relative"
      >
        {/* Live class top status bar */}
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
                {classRecording?.status === "recording" && (
                  <span
                    className="inline-flex items-center gap-1 text-2xs font-black tracking-wider text-white bg-rose-600 px-1.5 py-0.5 rounded-md whitespace-nowrap"
                    title={
                      recordingExcludedMe
                        ? "This class is being recorded. You're not included in the recording."
                        : classRecording.mode === "video"
                        ? "This class is being recorded (video and transcript)."
                        : "This class is being recorded as a transcript (video recording isn't available)."
                    }
                    role="status"
                    aria-label={recordingExcludedMe ? "Recording; you are not included" : "This class is being recorded"}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    REC
                    {recordingExcludedMe ? <span className="font-semibold normal-case tracking-normal hidden @md:inline"> · not you</span> : classRecording.mode === "transcript_only" ? <span className="font-semibold normal-case tracking-normal hidden @md:inline"> · transcript</span> : null}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase text-amber-300 font-mono whitespace-nowrap">
                  {classStatus === "ended" ? "Class ended" : "Not started"}
                </span>
              </>
            )}
            <span className="w-px h-5 bg-white/10 shrink-0" />
            <ClassHeader roomSlug={roomId} fallbackTitle={roomTitle.split("·")[0]} compact={isCompact} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {classStatus === "waiting" && <StartClassButton variant="compact" />}
            <VideoModeBadge className="hidden @lg:inline-flex" />
          </div>
        </div>

        {/* Class ended: what happened to the recording and notes */}
        {classStatus === "ended" && <ClassEndedCard isHost={isHost} />}

        {displayParticipants.length === 0 && currentRole === "auditor" ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-line flex items-center justify-center text-ink-3 mb-4">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-ink mb-1">{classStatus === "in_progress" ? "Waiting for video" : "The class hasn't started yet"}</h3>
                <p className="text-sm text-ink-3 max-w-sm">You're observing without camera or microphone, and nobody in the class can see you. The teacher and learners appear here when they join.</p>
              </div>
        ) : displayParticipants.length === 0 ? (
              /* Completely Empty Stage */
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-3xl border border-white/5 my-auto">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Nobody's here yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Share the class link. Learners on the class list sign in and wait in the lobby until the host lets them in.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={handleCopyStudentLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? "Class link copied" : "Copy class link"}</span>
                  </button>

                  {(currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep") && (
                    <button
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 border border-cyan-500/30 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-brand-yellow" />
                      <span>Schedule a class</span>
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
                        {classInfo?.teacherName || "Your teacher"} hasn't started the class yet. Your camera and microphone are ready. The class opens here automatically when it starts.
                      </p>
                      <div className="p-3 bg-blue-950/50 border border-blue-500/30 rounded-xl space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>AI Real-time Interpreter & Dual Subtitles Ready</span>
                        </div>
                        <p className="text-2xs text-slate-400 leading-normal">
                          Turn on captions (CC) in the control bar to read what's said, translated into your language if you like.
                        </p>
                      </div>
                      <div className="text-2xs text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Ready to learn as <strong className="text-white">{displayParticipants[0].name}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            {isHost ? "Ready to start" : "Waiting for the host"}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">{roomTitle}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          {isHost
                            ? "Your camera and microphone are ready. Learners wait in the lobby until you let them in; start the class when you're ready."
                            : "Your camera and microphone are ready."}
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {isHost ? (
                          <>
                            <StartClassButton variant="hero" />
                            <p className="text-2xs text-slate-400 text-center">Starting the class also starts its recording.</p>
                          </>
                        ) : classHost ? (
                          <HostedByNote className="text-center" />
                        ) : (
                          <p className="text-2xs text-slate-400 text-center inline-flex items-center justify-center gap-1.5 w-full">
                            <span className="w-3 h-3 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" /> Checking the class…
                          </p>
                        )}


                        <button
                          onClick={handleCopyStudentLink}
                          className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedLink ? "Class link copied" : "Copy class link"}</span>
                        </button>

                        {(currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep") && (
                          <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 hover:from-blue-900/60 hover:to-indigo-900/60 border border-blue-500/30 text-cyan-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-brand-yellow" />
                            <span>Schedule a class</span>
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
            layout={layoutMode}
            columns={manualGridColumns}
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

      {/* Live engagement for auditors and admins is real data: Class analytics → Live engagement, and the observer panel */}

      {/* Remote device control is an illustrative demo (mounted once, only when demos are on) */}
      {demoFeatures && (
        <>
          <MultiDeviceRemoteConsole />
          <RemoteAccessOfferModal />
        </>
      )}

      {/* Instant Single-Click Parent & CX Help Escalations */}
      <HelpEscalationModals />

      {/* Direct In-Room Student Formative Feedback & Star Praise */}
      <ChildFeedbackModal />
    </div>
  );
};
