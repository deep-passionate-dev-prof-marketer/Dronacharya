import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Users,
  CheckCircle,
  XCircle,
  Video,
  Mic,
  MicOff,
  VideoOff,
  ShieldAlert,
  Volume2,
} from "lucide-react";

export const WaitingLobby: React.FC = () => {
  const {
    waitingList,
    admitParticipant,
    rejectParticipant,
    admitAllWaiting,
    currentRole,
  } = useClassroom();

  const [micLevel, setMicLevel] = useState(30);

  // Mic test animation
  useEffect(() => {
    const timer = setInterval(() => {
      setMicLevel(Math.floor(15 + Math.random() * 55));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-white">Pre-Flight Waiting Lobby</span>
        </div>

        {currentRole === "instructor" && waitingList.length > 0 && (
          <button
            onClick={admitAllWaiting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Admit All ({waitingList.length})</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Hardware Pre-Flight Self-Check Station */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-3 shadow-lg">
          <div className="text-xs font-semibold text-white">Hardware Diagnostic & Pre-Entry Check</div>
          <p className="text-2xs text-slate-400">
            Verify your local camera resolution, acoustic echo cancellation, and encryption keys before entering the live lecture hall.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Audio Check */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Microphone</span>
                </span>
                <span className="text-2xs font-mono text-emerald-400">OK</span>
              </div>
              {/* Level meter */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>

            {/* Video Check */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Camera Stream</span>
                </span>
                <span className="text-2xs font-mono text-indigo-400">1080p 60fps</span>
              </div>
              <div className="text-2xs text-slate-400">Hardware accelerated</div>
            </div>
          </div>
        </div>

        {/* Waiting Queue List */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Students in Waiting Queue</span>
            <span className="text-2xs font-mono text-indigo-400">{waitingList.length} Pending</span>
          </div>

          {waitingList.length === 0 ? (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 text-center text-xs text-slate-400">
              No students currently waiting. All participants have been admitted to the live lecture hall.
            </div>
          ) : (
            waitingList.map((waiter) => (
              <div
                key={waiter.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold text-white">
                    {waiter.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{waiter.name}</div>
                    <div className="text-2xs text-slate-400 font-mono">
                      Requested {waiter.requestedAt} · Devices Ready
                    </div>
                  </div>
                </div>

                {currentRole === "instructor" ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => admitParticipant(waiter.id)}
                      className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors shadow-sm"
                    >
                      Admit
                    </button>
                    <button
                      onClick={() => rejectParticipant(waiter.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Decline"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-2xs text-slate-400 italic">Waiting for host</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
