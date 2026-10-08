import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, ScanFace, Eye, Clock, Mic, Info } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";

interface PersonRollup {
  participant: { id: string; name: string; role: string };
  latest: { dominant: string; states: Array<{ label: string; score: number }>; eyeContact: number; presence: number; blinkPerMin: number; talkRatio: number };
  lastSeen: string;
  presentMinutes: number;
  avgEyeContact: number;
  avgTalkRatio: number;
  stateDistribution: Array<{ label: string; share: number }>;
  timeline: Array<{ at: string; dominant: string; eyeContact: number; presence: number }>;
  alerts: string[];
}

/** Colour family per state, so the timeline reads at a glance. */
const TONE: Record<string, string> = {
  focused: "bg-emerald-500", engaged: "bg-emerald-400", curious: "bg-teal-400", excited: "bg-lime-400", "loving it": "bg-pink-400",
  happy: "bg-yellow-300", warm: "bg-yellow-300", rapport: "bg-yellow-300", energetic: "bg-lime-400", enthusiastic: "bg-lime-400",
  calm: "bg-sky-400", confident: "bg-sky-400", listening: "bg-sky-300", interested: "bg-emerald-400",
  confused: "bg-amber-400", hesitant: "bg-amber-400", sceptical: "bg-amber-500", bored: "bg-orange-400", distracted: "bg-orange-500",
  "low energy": "bg-orange-400", tired: "bg-orange-600", sleepy: "bg-red-500", overwhelmed: "bg-rose-500", anxious: "bg-rose-500",
  nervous: "bg-rose-400", stressed: "bg-rose-500", frustrated: "bg-red-500", defensive: "bg-red-400", sad: "bg-indigo-400",
  shy: "bg-violet-400", away: "bg-slate-500", "camera off": "bg-slate-600",
};
const tone = (l: string) => TONE[l] || "bg-slate-400";
const pct = (x: number) => `${Math.round(x * 100)}%`;

export const EngagementInsightsPanel: React.FC<{ roomSlug?: string }> = ({ roomSlug }) => {
  const { currentRole, roomId } = useClassroom();
  const [rooms, setRooms] = useState<Array<{ roomSlug: string; participants: number; lastActivity: string }>>([]);
  const [room, setRoom] = useState(roomSlug || roomId);
  const [people, setPeople] = useState<PersonRollup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const headers = { "x-actor-role": currentRole };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        fetch("/api/engagement/rooms", { headers }).then((x) => x.json().then((b) => (x.ok ? b : Promise.reject(b)))),
        fetch(`/api/engagement/rooms/${encodeURIComponent(room)}`, { headers }).then((x) => x.json().then((b) => (x.ok ? b : Promise.reject(b)))),
      ]);
      setRooms(r.rooms || []);
      setPeople(d.participants || []);
      setError(null);
    } catch (e: any) {
      setError(e?.error || "Engagement service unavailable on this deployment.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, currentRole]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ScanFace className="w-5 h-5 text-violet-300 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Live engagement</h2>
            <p className="text-xs text-slate-400">Visible to auditors and analysts only · updates every 5s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-9 max-w-[220px] rounded-lg bg-slate-950 border border-white/10 px-2 text-sm text-slate-200" aria-label="Room">
            {[room, ...rooms.map((r) => r.roomSlug).filter((s) => s !== room)].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button onClick={load} className="icon-btn" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 flex gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
        Estimated from facial expression and head/eye movement on each participant's own device, with their (or their guardian's) consent. Signals, not diagnoses. Don't use them alone to judge a person.
      </p>

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!error && people.length === 0 && (
        <p className="text-sm text-slate-500 py-6 text-center">No consented participants have reported in this room in the last 2 hours.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {people.map((p) => (
          <article key={p.participant.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{p.participant.name}</div>
                <div className="text-[11px] text-slate-500 capitalize">{p.participant.role.replace("_", " ")} · seen {new Date(p.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold text-slate-950 capitalize ${tone(p.latest.dominant)}`}>{p.latest.dominant}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {p.latest.states.map((s) => (
                <span key={s.label} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 capitalize">
                  {s.label} <span className="text-slate-500">{pct(s.score)}</span>
                </span>
              ))}
            </div>

            {/* State timeline (oldest → newest, ~5s per segment) */}
            <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5" aria-label="State timeline">
              {p.timeline.map((t, i) => (
                <span key={i} title={`${new Date(t.at).toLocaleTimeString()} · ${t.dominant}`} className={`flex-1 ${tone(t.dominant)}`} />
              ))}
            </div>

            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-slate-500 flex items-center gap-1"><Eye className="w-3 h-3" /> Eye contact</dt>
                <dd className="text-slate-200 font-semibold tabular-nums">{pct(p.avgEyeContact)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Present</dt>
                <dd className="text-slate-200 font-semibold tabular-nums">{p.presentMinutes} min</dd>
              </div>
              <div>
                <dt className="text-slate-500 flex items-center gap-1"><Mic className="w-3 h-3" /> Talk time</dt>
                <dd className="text-slate-200 font-semibold tabular-nums">{pct(p.avgTalkRatio)}</dd>
              </div>
            </dl>

            {p.alerts.length > 0 && (
              <p className="text-xs text-amber-200 flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {p.alerts.join(" · ")}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};
