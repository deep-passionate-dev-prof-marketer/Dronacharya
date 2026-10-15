import React from "react";
import { Clock, DoorOpen, Loader2, LogIn, LogOut, Megaphone, Shuffle, Users2, X } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { breakoutsStore, useStore } from "../../services/classSlides";
import { api } from "../../services/apiClient";
import { confirmDialog, toast } from "../ui/Feedback";

const TIMERS = [0, 5, 10, 15, 20, 30, 45];

function useCountdown(endsAt: string | null) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return null;
  const s = Math.max(0, Math.round((new Date(endsAt).getTime() - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Breakout rooms (dock tab): hosts split admitted learners into groups (each its own video room),
 * with an optional timer; visit a group, message every group, move people, and bring everyone back.
 * Learners see their group and the time left.
 */
export const BreakoutManager: React.FC = () => {
  const { classHost } = useClassroom();
  const breakouts = useStore(breakoutsStore);
  if (!classHost?.isHost) return <LearnerView />;
  return breakouts.active ? <RunningView /> : <SetupView />;
};

const LearnerView: React.FC = () => {
  const { authenticatedUser } = useClassroom();
  const breakouts = useStore(breakoutsStore);
  const left = useCountdown(breakouts.active ? breakouts.endsAt : null);
  const mine = breakouts.active ? breakouts.groups.find((g) => g.members.some((m) => m.id === authenticatedUser?.id)) : null;
  return (
    <div className="flex-1 p-4 bg-canvas">
      {mine ? (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
          <div className="text-sm font-semibold text-white">You're in {mine.name}</div>
          {left && <div className="text-xs text-blue-100">Back to the main room in {left}</div>}
          <ul className="text-sm text-slate-200 space-y-1">
            {mine.members.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{breakouts.active ? "Breakout groups are running. You're in the main room." : "Your teacher hasn't opened breakout rooms."}</p>
      )}
    </div>
  );
};

const SetupView: React.FC = () => {
  const { participants, roomId, transportState } = useClassroom();
  const learners = participants.filter((p) => p.role === "student" && !p.waiting && !p.isLocal);
  const [count, setCount] = React.useState(2);
  const [minutes, setMinutes] = React.useState(10);
  const [assign, setAssign] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const groups = Math.max(1, Math.min(count, 20));
  // Even split by default; anyone not yet placed goes to the smallest group
  const placed = React.useMemo(() => {
    const out: Record<string, number> = {};
    const sizes = Array(groups).fill(0);
    learners.forEach((l) => {
      const want = assign[l.id];
      if (want && want <= groups) {
        out[l.id] = want;
        sizes[want - 1]++;
      }
    });
    learners.forEach((l) => {
      if (out[l.id]) return;
      const n = sizes.indexOf(Math.min(...sizes)) + 1;
      out[l.id] = n;
      sizes[n - 1]++;
    });
    return out;
  }, [learners.map((l) => l.id).join(","), assign, groups]);

  const shuffle = () => {
    const ids = learners.map((l) => l.id).sort(() => Math.random() - 0.5);
    setAssign(Object.fromEntries(ids.map((id, i) => [id, (i % groups) + 1])));
  };
  const start = async () => {
    setBusy(true);
    setError(null);
    const body = {
      groups: Array.from({ length: groups }, (_, i) => ({ name: `Group ${i + 1}`, members: learners.filter((l) => placed[l.id] === i + 1).map((l) => l.id) })),
      minutes: minutes || undefined,
    };
    const r = await api("POST", `/api/rooms/${encodeURIComponent(roomId)}/breakouts`, body);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast(`${groups} breakout group${groups === 1 ? "" : "s"} opened`);
  };

  if (transportState.mode === "mesh") {
    return <p className="flex-1 p-4 text-sm text-slate-400 bg-canvas">Breakout rooms need the school's media server, which isn't running right now.</p>;
  }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3 bg-canvas">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Groups
          <select value={groups} onChange={(e) => setCount(Number(e.target.value))} className="h-10 rounded-xl bg-slate-950 border border-white/15 px-3 text-sm text-white">
            {Array.from({ length: Math.max(1, Math.min(10, learners.length || 1)) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300 flex flex-col gap-1">
          Timer
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-10 rounded-xl bg-slate-950 border border-white/15 px-3 text-sm text-white">
            {TIMERS.map((m) => (
              <option key={m} value={m}>
                {m ? `${m} min` : "No timer"}
              </option>
            ))}
          </select>
        </label>
        <button onClick={shuffle} disabled={!learners.length} className="h-10 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40">
          <Shuffle className="w-3.5 h-3.5" /> Shuffle
        </button>
      </div>
      {learners.length === 0 ? (
        <p className="text-sm text-slate-400">No learners are in the class yet. Admit learners first, then split them into groups.</p>
      ) : (
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-2">
          {Array.from({ length: groups }, (_, i) => i + 1).map((n) => (
            <div key={n} className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
              <div className="text-xs font-semibold text-white mb-1.5">Group {n}</div>
              <ul className="space-y-1">
                {learners
                  .filter((l) => placed[l.id] === n)
                  .map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 text-sm text-slate-200">
                      <span className="truncate">{l.name}</span>
                      <select
                        value={n}
                        onChange={(e) => setAssign((a) => ({ ...a, [l.id]: Number(e.target.value) }))}
                        aria-label={`Group for ${l.name}`}
                        className="h-8 rounded-lg bg-slate-950 border border-white/15 px-1.5 text-xs text-white"
                      >
                        {Array.from({ length: groups }, (_, j) => j + 1).map((g) => (
                          <option key={g} value={g}>
                            Group {g}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
      <button onClick={start} disabled={busy || !learners.length} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />} Open breakout rooms
      </button>
      <p className="text-2xs text-slate-500">Each group gets its own video room. Recording, attendance and class notes stay with the main class.</p>
    </div>
  );
};

const RunningView: React.FC = () => {
  const { roomId, mediaRoom, visitBreakout } = useClassroom();
  const breakouts = useStore(breakoutsStore);
  const left = useCountdown(breakouts.active ? breakouts.endsAt : null);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  if (!breakouts.active) return null;
  const base = `/api/rooms/${encodeURIComponent(roomId)}/breakouts`;

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => {
    setBusy(key);
    const r: any = await fn();
    setBusy(null);
    if (!r.ok) toast(r.error, "critical");
    else if (done) toast(done);
    return r.ok;
  };
  const broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (await run("msg", () => api("POST", `${base}/broadcast`, { message }), "Sent to every group")) setMessage("");
  };
  const closeAll = async () => {
    if (!(await confirmDialog({ title: "Close all breakout rooms?", body: "Everyone returns to the main room.", confirmLabel: "Close rooms" }))) return;
    await run("close", () => api("POST", `${base}/close`), "Everyone is back in the main room");
    visitBreakout(null);
  };
  const move = (userId: string, group: number | null) => run(`mv-${userId}`, () => api("POST", `${base}/move`, { userId, group }));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3 bg-canvas">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
          <DoorOpen className="w-4 h-4 text-blue-300" /> {breakouts.groups.length} groups open
        </span>
        {left && (
          <span className="text-xs text-amber-200 inline-flex items-center gap-1 tabular-nums">
            <Clock className="w-3.5 h-3.5" /> {left}
          </span>
        )}
      </div>
      {mediaRoom !== roomId && (
        <button onClick={() => visitBreakout(null)} className="h-10 rounded-xl bg-white/10 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Back to the main room
        </button>
      )}
      <ul className="flex flex-col gap-2">
        {breakouts.groups.map((g) => (
          <li key={g.n} className={`rounded-xl border p-2.5 ${mediaRoom === g.room ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-slate-900/60"}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-sm font-semibold text-white">{g.name}</span>
              {mediaRoom === g.room ? (
                <span className="text-2xs text-blue-200">You're here</span>
              ) : (
                <button onClick={() => visitBreakout(g.room)} className="h-8 px-2.5 rounded-lg bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5" /> Visit
                </button>
              )}
            </div>
            <ul className="space-y-1">
              {g.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm text-slate-200">
                  <span className="truncate">{m.name}</span>
                  <select
                    value={g.n}
                    disabled={busy === `mv-${m.id}`}
                    onChange={(e) => move(m.id, e.target.value === "main" ? null : Number(e.target.value))}
                    aria-label={`Move ${m.name}`}
                    className="h-8 rounded-lg bg-slate-950 border border-white/15 px-1.5 text-xs text-white"
                  >
                    {breakouts.groups.map((x) => (
                      <option key={x.n} value={x.n}>
                        {x.name}
                      </option>
                    ))}
                    <option value="main">Main room</option>
                  </select>
                </li>
              ))}
              {!g.members.length && <li className="text-xs text-slate-500">Empty</li>}
            </ul>
          </li>
        ))}
      </ul>
      <form onSubmit={broadcast} className="flex gap-2">
        <label htmlFor="bo-msg" className="sr-only">
          Message every group
        </label>
        <input id="bo-msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder="Message every group…" className="flex-1 min-w-0 h-10 rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 text-sm text-white placeholder-slate-500" />
        <button type="submit" disabled={busy === "msg" || !message.trim()} className="h-10 px-3 rounded-xl bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40">
          <Megaphone className="w-3.5 h-3.5" /> Send
        </button>
      </form>
      <button onClick={closeAll} disabled={busy === "close"} className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {busy === "close" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Close all and bring everyone back
      </button>
    </div>
  );
};
