import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { Participant } from "../../types";
import {
  Mic,
  MicOff,
  UserX,
  MonitorPlay,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Eye,
  Volume2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { RemoteAccessRequestModal } from "./RemoteAccessRequestModal";

interface ParticipantTileActionsProps {
  participant: Participant;
}

export const ParticipantTileActions: React.FC<ParticipantTileActionsProps> = ({ participant }) => {
  const {
    currentRole,
    attentionAudits,
    audioMetrics,
    muteParticipant,
    unmuteParticipant,
    kickParticipant,
    requestRemoteAccess,
    markAttendanceQuick,
    setActiveFeedbackTarget,
    setIsFeedbackModalOpen,
    setSelectedAuditParticipantId,
    setIsAuditDrawerOpen,
  } = useClassroom();

  const [showAttendanceDropdown, setShowAttendanceDropdown] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const isTeacher = currentRole === "instructor";
  const isStudentTile = participant.role === "student";

  // Telemetry for this specific participant
  const attn = attentionAudits[participant.id];
  const audio = audioMetrics[participant.id];

  const attnScore = attn?.attentionScore ?? 88;
  const gaze = attn?.gaze ?? "center";
  const isDistracted = attn?.distractionAlert;

  const audioGrade = audio?.vocalClarityGrade ?? "A";
  const snr = audio?.snrDb ?? 28;

  return (
    <>
      {/* Top telemetry badges on video tile */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10 select-none">
        {/* Left: Attention Badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAuditParticipantId(participant.id);
            setIsAuditDrawerOpen(true);
          }}
          className={`pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-md backdrop-blur-md text-[10px] font-mono font-bold shadow transition-all cursor-pointer ${
            isDistracted
              ? "bg-rose-500/80 text-white animate-pulse border border-rose-300/50"
              : attnScore >= 85
              ? "bg-slate-900/80 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-900/80 text-amber-300 border border-amber-500/30"
          }`}
          title={`Gaze: ${gaze.toUpperCase()} · Click to inspect deep biometric facial attention audit`}
        >
          <Eye className="w-2.5 h-2.5" />
          <span>Attn {attnScore}%</span>
        </button>

        {/* Right: Audio Quality Badge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAuditParticipantId(participant.id);
            setIsAuditDrawerOpen(true);
          }}
          className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 text-cyan-300 border border-cyan-500/30 backdrop-blur-md text-[10px] font-mono font-semibold shadow hover:bg-slate-800 transition-all cursor-pointer"
          title={`SNR ${snr}dB · Vocal Clarity ${audioGrade}`}
        >
          <Volume2 className="w-2.5 h-2.5 text-cyan-400" />
          <span>Audio {audioGrade}</span>
        </button>
      </div>

      {/* Zero-Toggle Facilitator Action Hover Bar (Revealed on Tile Hover for Teachers) */}
      {isTeacher && isStudentTile && (
        <div className="absolute inset-x-2 bottom-10 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-[#001F40]/95 backdrop-blur-md border border-[#00C2E0]/40 shadow-2xl text-white">
            {/* 1. Instant Mute / Unmute */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (participant.audioEnabled) {
                  muteParticipant(participant.id);
                } else {
                  unmuteParticipant(participant.id);
                }
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                participant.audioEnabled
                  ? "bg-slate-800/80 hover:bg-rose-600 text-slate-200 hover:text-white"
                  : "bg-rose-600 hover:bg-rose-500 text-white"
              }`}
              title={participant.audioEnabled ? "Direct Mute Student" : "Direct Unmute Student"}
            >
              {participant.audioEnabled ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            {/* 2. Request Remote Access (Phone, Tablet, Laptop, Desktop PC) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRequestModalOpen(true);
              }}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              title="Request Remote System Access (Phone, Tablet, Laptop, Desktop PC)"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
            </button>

            {/* 3. Mark Attendance (Quick Toggle Pill) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAttendanceDropdown((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  participant.attendanceStatus === "present"
                    ? "bg-emerald-600/90 text-white"
                    : participant.attendanceStatus === "late"
                    ? "bg-amber-600/90 text-white"
                    : "bg-rose-600/90 text-white"
                }`}
                title="Mark Attendance Directly"
              >
                <span className="capitalize">{participant.attendanceStatus}</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {/* Attendance Quick Flyout */}
              {showAttendanceDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-8 left-0 w-28 bg-[#001F40] border border-slate-700 rounded-lg shadow-xl p-1 flex flex-col gap-1 z-30"
                >
                  <button
                    onClick={() => {
                      markAttendanceQuick(participant.id, "present");
                      setShowAttendanceDropdown(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-slate-200 hover:bg-emerald-900/50 hover:text-emerald-300 text-left cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Present</span>
                  </button>
                  <button
                    onClick={() => {
                      markAttendanceQuick(participant.id, "late");
                      setShowAttendanceDropdown(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-slate-200 hover:bg-amber-900/50 hover:text-amber-300 text-left cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Late</span>
                  </button>
                  <button
                    onClick={() => {
                      markAttendanceQuick(participant.id, "absent");
                      setShowAttendanceDropdown(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-slate-200 hover:bg-rose-900/50 hover:text-rose-300 text-left cursor-pointer"
                  >
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>Absent</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Direct Praise & Feedback */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveFeedbackTarget(participant);
                setIsFeedbackModalOpen(true);
              }}
              className="p-1.5 rounded-lg bg-[#FFBB00] hover:bg-amber-400 text-[#001F40] font-bold transition-colors cursor-pointer"
              title="Share Direct Positive / Formative Feedback for this child"
            >
              <Star className="w-3.5 h-3.5 fill-[#001F40]" />
            </button>

            {/* 5. Kick / Remove Student */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Kick ${participant.name} from current live room? They can be re-admitted anytime.`)) {
                  kickParticipant(participant.id, "Facilitator Zero-Toggle Intervention");
                }
              }}
              className="p-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white transition-colors cursor-pointer"
              title="Kick / Remove Student from Room"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Multi-Device Remote Access Request Dialog */}
      <RemoteAccessRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        targetStudentId={participant.id}
      />
    </>
  );
};
