import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { Check, CheckCircle, DoorOpen, Loader2, X } from "lucide-react";

/** Dock "Lobby" tab: learners waiting to be let in (the same list as the bar's waiting button). */
export const WaitingLobby: React.FC = () => {
  const { waitingList, admitParticipant, rejectParticipant, admitAllWaiting, classHost } = useClassroom();
  const isHost = Boolean(classHost?.isHost);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    setError(null);
    setError(await fn());
    setBusy(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden">
      <div className="h-12 border-b border-white/10 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-blue-300" />
          <span className="text-xs font-semibold text-white">Lobby</span>
          <span className="text-2xs text-slate-400">{waitingList.length} waiting</span>
        </div>
        {isHost && waitingList.length > 1 && (
          <button
            onClick={() => run("all", admitAllWaiting)}
            disabled={busy !== null}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {busy === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            <span>Admit all ({waitingList.length})</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {error && (
          <p className="text-xs text-rose-300 px-1" role="alert">
            {error}
          </p>
        )}
        {waitingList.length === 0 ? (
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6 text-center text-xs text-slate-400">
            Nobody is waiting. Learners who join appear here until {isHost ? "you let them in" : "the host lets them in"}.
          </div>
        ) : (
          waitingList.map((w) => (
            <div key={w.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: w.avatarColor || "#0082FF" }}>
                  {w.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{w.name}</div>
                  {w.requestedAt && <div className="text-2xs text-slate-400">Waiting since {w.requestedAt}</div>}
                </div>
              </div>
              {isHost ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => run(`d-${w.id}`, () => rejectParticipant(w.id))}
                    disabled={busy !== null}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 flex items-center justify-center disabled:opacity-60"
                    aria-label={`Deny ${w.name}`}
                  >
                    {busy === `d-${w.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => run(`a-${w.id}`, () => admitParticipant(w.id))}
                    disabled={busy !== null}
                    className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-60"
                    aria-label={`Admit ${w.name}`}
                  >
                    {busy === `a-${w.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Admit
                  </button>
                </div>
              ) : (
                <span className="text-2xs text-slate-400 italic shrink-0">Waiting for host</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
