import React, { useState } from "react";
import { UserCheck, X, Check, Loader2, BarChart3 } from "lucide-react";
import { useClassroom } from "../../../context/ClassroomContext";

/** Host-only: learners waiting to be let in. Hidden when nobody is waiting. */
export const WaitingRoomButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { participants, hostAction } = useClassroom();
  const waiting = participants.filter((p) => p.waiting && !p.isLocal);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!waiting.length) return null;

  const act = async (action: "admit" | "deny", ids: string[], key: string) => {
    setBusy(key);
    setError(await hostAction(action, ids));
    setBusy(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-11 inline-flex items-center gap-2 px-3 rounded-2xl text-xs font-semibold border bg-amber-500/15 text-amber-100 border-amber-500/40 hover:bg-amber-500/25 animate-pulse ${className}`}
        aria-label={`${waiting.length} waiting to join`}
      >
        <UserCheck className="w-[18px] h-[18px]" />
        <span>{waiting.length}</span>
        <span className="hidden @3xl:inline">waiting</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 sm:bg-transparent" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-14 sm:left-0 sm:w-80 rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 shadow-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-sheetUp sm:animate-fadeIn max-h-[70dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-sm font-semibold text-white">Waiting to join ({waiting.length})</span>
              <button onClick={() => act("admit", waiting.map((w) => w.id), "all")} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                {busy === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Admit all"}
              </button>
            </div>
            {error && <p className="text-xs text-rose-300 px-1 pb-2">{error}</p>}
            <ul className="space-y-1.5">
              {waiting.map((w) => (
                <li key={w.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: w.avatarColor }}>
                    {w.name.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm text-slate-100">{w.name}</span>
                  <button onClick={() => act("deny", [w.id], `d-${w.id}`)} className="h-8 w-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 flex items-center justify-center" aria-label={`Deny ${w.name}`}>
                    {busy === `d-${w.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" />}
                  </button>
                  <button onClick={() => act("admit", [w.id], `a-${w.id}`)} className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1" aria-label={`Admit ${w.name}`}>
                    {busy === `a-${w.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Admit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

const TEMPLATES: Array<{ label: string; options: string[] }> = [
  { label: "Yes / No", options: ["Yes", "No"] },
  { label: "A–D", options: ["A", "B", "C", "D"] },
  { label: "Understood?", options: ["Got it", "Partly", "Lost"] },
  { label: "1–5", options: ["1", "2", "3", "4", "5"] },
];

/** Host-only sheet to launch a quick poll from the control bar. */
export const QuickPollSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { startPoll } = useClassroom();
  const [question, setQuestion] = useState("");
  const [template, setTemplate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    const err = await startPoll(question.trim() || "Quick check", TEMPLATES[template].options);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/60" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-5 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))] animate-sheetUp sm:animate-fadeIn">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-300" /> Quick poll
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question (e.g. Which force acts on the ball?)"
          className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white placeholder-slate-500"
        />
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTemplate(i)}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${template === i ? "bg-blue-600/25 border-blue-500/50 text-white" : "bg-white/5 border-white/10 text-slate-300"}`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-[11px] text-slate-400 truncate">{t.options.join(" · ")}</div>
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <button onClick={start} disabled={busy} className="btn-primary w-full">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Start poll
        </button>
      </div>
    </div>
  );
};

/** Live poll card for everyone in class: learners vote, hosts watch results and close it. */
export const LivePollCard: React.FC<{ isHost: boolean }> = ({ isHost }) => {
  const { activePoll, myPollVote, voteLivePoll, closePoll, dismissPoll } = useClassroom();
  const [error, setError] = useState<string | null>(null);
  if (!activePoll) return null;
  const showResults = isHost || myPollVote !== null || activePoll.closed;
  const max = Math.max(1, ...activePoll.counts);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-40 w-[calc(100%-1rem)] max-w-sm rounded-2xl border border-blue-500/30 bg-slate-900/95 shadow-2xl p-3 space-y-2 animate-fadeIn">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">{activePoll.closed ? "Poll closed" : "Quick poll"}</div>
          <div className="text-sm font-semibold text-white">{activePoll.question}</div>
        </div>
        <button onClick={dismissPoll} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 shrink-0" aria-label="Hide poll">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {activePoll.options.map((o, i) => {
          const pct = Math.round((activePoll.counts[i] / Math.max(1, activePoll.total)) * 100);
          return (
            <button
              key={i}
              disabled={isHost || activePoll.closed}
              onClick={async () => setError(await voteLivePoll(i))}
              className={`relative w-full overflow-hidden rounded-xl border text-left px-3 py-2 text-sm ${myPollVote === i ? "border-blue-400 text-white" : "border-white/10 text-slate-200"} ${isHost || activePoll.closed ? "" : "hover:bg-white/5"}`}
            >
              {showResults && <span className="absolute inset-y-0 left-0 bg-blue-500/20" style={{ width: `${(activePoll.counts[i] / max) * 100}%` }} />}
              <span className="relative flex justify-between gap-2">
                <span>{o}</span>
                {showResults && <span className="tabular-nums text-slate-400">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{activePoll.total} vote{activePoll.total === 1 ? "" : "s"}</span>
        {isHost && !activePoll.closed && (
          <button onClick={closePoll} className="h-7 px-2.5 rounded-lg bg-white/10 text-white text-xs font-semibold">
            Close poll
          </button>
        )}
      </div>
    </div>
  );
};
