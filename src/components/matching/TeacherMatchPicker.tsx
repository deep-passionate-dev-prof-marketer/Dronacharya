import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, ChevronDown, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import type { MatchCandidate, MatchRequest, Booking } from "../../services/matching/teacherMatcher";

export interface PickedTeacher {
  id: string;
  name: string;
}

interface Props {
  request: MatchRequest;
  value: PickedTeacher | null;
  onChange: (t: PickedTeacher | null) => void;
}

/**
 * Live teacher matching for a booking: shows the best eligible teacher with the reasons, lets staff
 * pick an alternative, and explains why other teachers can't take the class.
 */
export const TeacherMatchPicker: React.FC<Props> = ({ request, value, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<MatchCandidate[]>([]);
  const [excluded, setExcluded] = useState<MatchCandidate[]>([]);
  const [openSection, setOpenSection] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWhyNot, setShowWhyNot] = useState(false);
  const key = JSON.stringify(request);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/match/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request }),
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        setRanked(body.ranked || []);
        setExcluded(body.excluded || []);
        setOpenSection(body.openSection || null);
        setError(null);
        const stillValid = value && (body.ranked || []).some((c: MatchCandidate) => c.teacherId === value.id);
        if (!stillValid) {
          const top = body.ranked?.[0];
          onChange(top ? { id: top.teacherId, name: top.teacherName } : null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message?.includes("HTTP 404") ? "Matching service isn't running on this deployment." : err?.message || "Matching failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const selected = ranked.find((c) => c.teacherId === value?.id) || ranked[0];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Matched teacher
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
      </div>

      {error && <p className="text-xs text-rose-300">{error}</p>}

      {openSection && (
        <p className="text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-2 flex gap-1.5">
          <Users className="w-3.5 h-3.5 shrink-0 mt-px" />
          An open {`1:${openSection.classSize}`} section already exists at this time ({openSection.studentKeys.length}/{openSection.classSize} seats); the student will join it.
        </p>
      )}

      {!error && !loading && ranked.length === 0 && (
        <p className="text-xs text-amber-200 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> No teacher can take this class at this time. Try another time, language or class size.
        </p>
      )}

      {selected && (
        <div className="space-y-2">
          <select
            value={selected.teacherId}
            onChange={(e) => {
              const c = ranked.find((r) => r.teacherId === e.target.value);
              if (c) onChange({ id: c.teacherId, name: c.teacherName });
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            aria-label="Teacher"
          >
            {ranked.map((c, i) => (
              <option key={c.teacherId} value={c.teacherId}>
                {i === 0 ? "★ " : ""}
                {c.teacherName} · score {c.score}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {selected.reasons.map((r) => (
              <span key={r} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {excluded.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowWhyNot((v) => !v)} className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhyNot ? "rotate-180" : ""}`} /> Why not the other {excluded.length}?
          </button>
          {showWhyNot && (
            <ul className="mt-1.5 space-y-1 text-[11px]">
              {excluded.map((c) => (
                <li key={c.teacherId} className="text-slate-400">
                  <span className="text-slate-200">{c.teacherName}:</span> {c.blockers.join("; ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
