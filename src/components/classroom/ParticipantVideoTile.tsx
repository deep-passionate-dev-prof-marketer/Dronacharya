import React, { useEffect, useRef } from "react";
import { Participant } from "../../types";
import { Mic, MicOff, Video, VideoOff, Pin, PinOff, Hand, Volume2 } from "lucide-react";

interface Props {
  participant: Participant;
  isLocal: boolean;
  localStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isPinned: boolean;
  onPinToggle: () => void;
  aspectClass?: string;
}

export const ParticipantVideoTile: React.FC<Props> = ({
  participant,
  isLocal,
  localStream,
  isAudioMuted,
  isVideoOff,
  isPinned,
  onPinToggle,
  aspectClass = "aspect-video",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeStream = isLocal ? localStream : participant.stream;
  const showVideo = isLocal ? !isVideoOff : participant.videoEnabled;
  const isMicMuted = isLocal ? isAudioMuted : !participant.audioEnabled;
  const hasMedia = Boolean(participant.attachVideo || activeStream);
  const speaking = participant.isSpeaking || (!isMicMuted && participant.audioLevel > 20);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !showVideo) return;
    // LiveKit tracks attach themselves (this also drives adaptive quality for this tile's size)
    if (participant.attachVideo) return participant.attachVideo(el);
    if (activeStream && el.srcObject !== activeStream) el.srcObject = activeStream;
    el.play().catch(() => {});
  }, [participant.attachVideo, activeStream, showVideo]);

  return (
    <div
      className={`relative w-full h-full rounded-2xl bg-slate-900/90 border overflow-hidden flex flex-col items-center justify-center group transition-all duration-300 select-none shadow-lg ${aspectClass} ${
        isPinned
          ? "border-blue-500 ring-2 ring-blue-500/50 shadow-blue-500/20"
          : speaking
          ? "border-emerald-400/80 ring-2 ring-emerald-400/40"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Live Video Feed */}
      {showVideo && hasMedia ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          // Audio is played by separate <audio> elements so it never stops when tiles move or unmount
          muted
          className={`w-full h-full object-cover ${isLocal ? "-scale-x-100" : ""}`}
        />
      ) : (
        /* Avatar Placeholder when video is paused/off */
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="relative">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-xl transition-all duration-300 ${
                speaking
                  ? "ring-4 ring-emerald-400/80 scale-105"
                  : ""
              }`}
              style={{ backgroundColor: participant.avatarColor || "#0082FF" }}
            >
              {participant.name ? participant.name.charAt(0).toUpperCase() : "U"}
            </div>
            {speaking && (
              <span className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-40 pointer-events-none" />
            )}
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-white mt-3 truncate max-w-[85%] text-center">
            {participant.name}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 capitalize">
            {participant.role === "instructor" ? "Teacher / Faculty" : participant.role === "student" ? "Student / Scholar" : participant.role}
          </span>
        </div>
      )}

      {/* Floating Hand Raise Notification */}
      {participant.handRaised && (
        <div className="absolute top-2.5 right-2.5 z-20 px-2 py-1 rounded-lg bg-amber-500/90 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-lg animate-bounce">
          <Hand className="w-3.5 h-3.5" />
          <span>Hand Raised</span>
        </div>
      )}

      {/* Pin / Spotlight Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPinToggle();
        }}
        title={isPinned ? "Unpin participant" : "Pin participant to spotlight"}
        className={`absolute top-2.5 left-2.5 z-20 p-1.5 rounded-lg backdrop-blur-md transition-all ${
          isPinned
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/40 opacity-100"
            : "bg-black/50 text-slate-300 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100"
        }`}
      >
        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </button>

      {/* Bottom Identity & Telemetry Bar */}
      <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-white text-[11px]">
        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              !isMicMuted ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span className="font-semibold truncate">
            {participant.name} {isLocal && <span className="text-slate-400 text-[10px]">(You)</span>}
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-mono hidden sm:inline">
            {participant.role === "instructor" ? "Teacher" : participant.role === "student" ? "Student" : participant.role}
          </span>
        </div>

        {/* Media Status Icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isMicMuted ? (
            <div className="p-1 rounded bg-rose-500/20 text-rose-400" title="Microphone Muted">
              <MicOff className="w-3 h-3" />
            </div>
          ) : (
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400" title="Microphone Active">
              <Mic className="w-3 h-3" />
            </div>
          )}

          {!showVideo && (
            <div className="p-1 rounded bg-rose-500/20 text-rose-400" title="Camera Stopped">
              <VideoOff className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
