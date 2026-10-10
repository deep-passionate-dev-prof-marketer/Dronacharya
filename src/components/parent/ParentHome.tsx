import React, { useEffect, useState } from "react";
import { Loader2, CalendarCheck, Clock, BookOpen, ClipboardList, Star, ShieldCheck, Video, ScanFace, ChevronDown, RefreshCw, CalendarDays } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { describeClass, ClassKind } from "../../services/classLabels";

interface Child {
  id: string;
  name: string;
  studentCode: string | null;
  gradeLevel: number | null;
  avatarColor: string | null;
}

interface ConsentState {
  granted: boolean;
  at: string;
  decidedBy: string;
}

interface Overview {
  child: Child;
  classes: Array<{ id: string; kind: ClassKind; subject: string; topic: string | null; course: string | null; scheduledStart: string; teacherName: string | null; roomSlug: string }>;
  attendance: Array<{
    recordingId: string;
    class: { kind: ClassKind; subject: string; topic: string | null; teacherName: string | null } | null;
    roomSlug: string;
    startedAt: string;
    running: boolean;
    status: "present" | "late" | "left_early" | "absent";
    minutesPresent: number;
    sessionMinutes: number;
  }>;
  summary: { held: number; attended: number; late: number; minutesPresent: number; notesAvailable: number };
  homework: Array<{ recordingId: string; classTitle: string; date: string; items: string[] }>;
  remarks: Array<{ id: string; kind: string; stars: number; note: string; at: string; teacherName: string | null }>;
  consents: { analytics: ConsentState | null; recording: ConsentState | null; recordingDefault: "included" | "excluded" };
  consentHistory: Array<{ kind: string; granted: boolean; decidedBy: string; guardianName: string | null; at: string }>;
}

const STATUS_CHIP: Record<string, { label: string; tone: string }> = {
  present: { label: "Present", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" },
  late: { label: "Late", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  left_early: { label: "Left early", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  absent: { label: "Absent", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
  running: { label: "In class now", tone: "bg-blue-500/15 text-blue-200 border-blue-500/30" },
};

const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 min-w-0">
    <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-slate-400">
      {icon}
      {label}
    </div>
    <div className="text-xl font-bold text-white mt-1">{value}</div>
    {sub && <div className="text-2xs text-slate-500">{sub}</div>}
  </div>
);

const ConsentCard: React.FC<{
  kind: "analytics" | "recording";
  state: ConsentState | null;
  defaultLabel?: string;
  parentName: string;
  onSave: (kind: "analytics" | "recording", granted: boolean, guardianName: string) => Promise<string | null>;
}> = ({ kind, state, defaultLabel, parentName, onSave }) => {
  const [pending, setPending] = useState<boolean | null>(null);
  const [name, setName] = useState(parentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy =
    kind === "analytics"
      ? {
          icon: <ScanFace className="w-4 h-4" />,
          title: "Engagement analytics",
          body: "During class, your child's camera image is analysed on their own device (video isn't uploaded for this). Only estimates like attention and expression go to the school, and only auditors can see them, to improve teaching. Never used for grades.",
        }
      : {
          icon: <Video className="w-4 h-4" />,
          title: "Class recording",
          body: "Classes are recorded so teachers and auditors can review teaching quality and lecture notes can be made. If you don't allow it, your child is left out of the recording: they aren't shown or heard, and what they say isn't kept.",
        };
  const current = state ? (state.granted ? "Allowed" : "Not allowed") : defaultLabel || "Not decided yet";
  const currentTone = state ? (state.granted ? "text-emerald-300" : "text-rose-300") : "text-slate-400";

  const save = async () => {
    if (pending === null) return;
    setBusy(true);
    setError(null);
    const err = await onSave(kind, pending, name);
    setBusy(false);
    if (err) setError(err);
    else setPending(null);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          {copy.icon}
          {copy.title}
        </div>
        <span className={`text-xs font-semibold ${currentTone}`}>{current}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{copy.body}</p>
      {state && <p className="text-2xs text-slate-500">Last changed {dateTime(state.at)}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setPending(true)} aria-pressed={pending === true} className={`h-9 px-3 rounded-xl text-xs font-semibold border ${pending === true ? "bg-emerald-600 text-white border-emerald-400/50" : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"}`}>
          Allow
        </button>
        <button onClick={() => setPending(false)} aria-pressed={pending === false} className={`h-9 px-3 rounded-xl text-xs font-semibold border ${pending === false ? "bg-rose-600 text-white border-rose-400/50" : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"}`}>
          Don't allow
        </button>
      </div>
      {pending !== null && (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2">
          <label className="block text-xs text-slate-300" htmlFor={`guardian-${kind}`}>
            Confirm with your full name (parent or legal guardian)
          </label>
          <input id={`guardian-${kind}`} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" maxLength={120} />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !name.trim()} className="btn-primary h-9 text-xs">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save: {pending ? "allow" : "don't allow"}
            </button>
            <button onClick={() => setPending(null)} className="h-9 px-3 rounded-xl text-xs text-slate-300 hover:bg-white/10">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ParentHome: React.FC = () => {
  const { authenticatedUser, setActiveView } = useClassroom();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/parent/children")
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || "Couldn't load your children");
        setChildren(b.children || []);
        if (b.children?.[0]) setChildId(b.children[0].id);
      })
      .catch((e) => {
        setError(e.message);
        setChildren([]);
      });
  }, []);

  const load = (id: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/parent/children/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || "Couldn't load this child's progress");
        setData(b);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (childId) load(childId);
  }, [childId]);

  const saveConsent = async (kind: "analytics" | "recording", granted: boolean, guardianName: string) => {
    if (!childId) return "No child selected";
    try {
      const r = await fetch(`/api/parent/children/${encodeURIComponent(childId)}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, granted, guardianName }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) return b.error || "Couldn't save your decision";
      setData(b);
      return null;
    } catch {
      return "Couldn't reach the school server";
    }
  };

  const upcoming = (data?.classes || []).filter((c) => new Date(c.scheduledStart).getTime() > Date.now() - 60 * 60000).slice(0, 5);

  return (
    <div className="@container flex-1 overflow-y-auto bg-canvas">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Hello{authenticatedUser?.name ? `, ${authenticatedUser.name.split(" ")[0]}` : ""}</h1>
            <p className="text-xs text-slate-400">Attendance, progress and privacy choices for your children.</p>
          </div>
          {childId && (
            <button onClick={() => load(childId)} className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>

        {children && children.length > 1 && (
          <div role="tablist" aria-label="Choose a child" className="flex gap-2 overflow-x-auto no-scrollbar">
            {children.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={childId === c.id}
                onClick={() => setChildId(c.id)}
                className={`h-10 px-3 rounded-xl border inline-flex items-center gap-2 text-sm whitespace-nowrap ${childId === c.id ? "bg-blue-600/20 border-blue-500/40 text-white" : "bg-white/[0.03] border-white/10 text-slate-300"}`}
              >
                <span className="w-6 h-6 rounded-full text-2xs font-bold text-white flex items-center justify-center" style={{ background: c.avatarColor || "#1d4ed8" }}>
                  {c.name.charAt(0)}
                </span>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
        {children && children.length === 0 && !error && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">No children are linked to your account yet. Please contact the school office.</div>
        )}
        {(!children || (loading && !data)) && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {data && (
          <>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full text-sm font-bold text-white flex items-center justify-center" style={{ background: data.child.avatarColor || "#1d4ed8" }}>
                {data.child.name.charAt(0)}
              </span>
              <div>
                <div className="text-base font-semibold text-white">{data.child.name}</div>
                <div className="text-xs text-slate-400">
                  {data.child.gradeLevel ? `Grade ${data.child.gradeLevel}` : ""} {data.child.studentCode ? `· ID ${data.child.studentCode}` : ""}
                </div>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 @3xl:grid-cols-4">
              <Stat icon={<CalendarCheck className="w-3.5 h-3.5" />} label="Attended" value={`${data.summary.attended} / ${data.summary.held}`} sub="classes (last 90 days)" />
              <Stat icon={<Clock className="w-3.5 h-3.5" />} label="Late" value={String(data.summary.late)} sub="joined 5+ min after start" />
              <Stat icon={<Clock className="w-3.5 h-3.5" />} label="Time in class" value={hm(data.summary.minutesPresent)} />
              <Stat icon={<BookOpen className="w-3.5 h-3.5" />} label="Class notes" value={String(data.summary.notesAvailable)} sub="ready to read" />
            </div>

            <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 min-w-0">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4" /> Attendance
                </h2>
                {data.attendance.length ? (
                  <ul className="divide-y divide-white/5">
                    {data.attendance.slice(0, 20).map((a) => {
                      const chip = STATUS_CHIP[a.running ? "running" : a.status];
                      const t = a.class ? describeClass({ ...a.class, scheduledStart: a.startedAt } as any).title : a.roomSlug;
                      return (
                        <li key={a.recordingId} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-100 truncate">{t}</div>
                            <div className="text-2xs text-slate-500">
                              {dateTime(a.startedAt)} · {a.minutesPresent} of {a.sessionMinutes} min
                            </div>
                          </div>
                          <span className={`text-2xs px-2 py-0.5 rounded-md border whitespace-nowrap ${chip.tone}`}>{chip.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No classes have been held yet.</p>
                )}
              </section>

              <div className="space-y-4 min-w-0">
                <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" /> Upcoming classes
                  </h2>
                  {upcoming.length ? (
                    <ul className="space-y-2">
                      {upcoming.map((c) => {
                        const d = describeClass({ ...c, topic: c.topic || undefined } as any);
                        return (
                          <li key={c.id} className="text-sm">
                            <div className="text-slate-100">{d.title}</div>
                            <div className="text-2xs text-slate-500">
                              {d.badge} · {dateTime(c.scheduledStart)}
                              {c.teacherName ? ` · ${c.teacherName}` : ""}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Nothing scheduled.</p>
                  )}
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4" /> Homework
                  </h2>
                  {data.homework.length ? (
                    <ul className="space-y-3">
                      {data.homework.slice(0, 6).map((h) => (
                        <li key={h.recordingId}>
                          <div className="text-2xs text-slate-500">
                            {h.classTitle} · {dateTime(h.date)}
                          </div>
                          <ul className="list-disc pl-5 text-sm text-slate-200 space-y-0.5">
                            {h.items.map((i, k) => (
                              <li key={k}>{i}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No homework set in recent classes.</p>
                  )}
                  <button onClick={() => setActiveView("notebook")} className="mt-3 text-xs text-blue-300 hover:underline inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Read the class notes
                  </button>
                </section>
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                <Star className="w-4 h-4" /> From the teachers
              </h2>
              {data.remarks.length ? (
                <ul className="space-y-3">
                  {data.remarks.slice(0, 10).map((r) => (
                    <li key={r.id} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200">{r.kind}</span>
                        {r.stars > 0 && <span className="text-amber-300 text-xs" aria-label={`${r.stars} stars`}>{"★".repeat(r.stars)}</span>}
                        <span className="text-2xs text-slate-500">
                          {r.teacherName || "Teacher"} · {dateTime(r.at)}
                        </span>
                      </div>
                      <p className="text-slate-200 mt-1">{r.note}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No remarks yet.</p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Privacy choices for {data.child.name.split(" ")[0]}
              </h2>
              <div className="grid gap-3 @3xl:grid-cols-2">
                <ConsentCard kind="analytics" state={data.consents.analytics} parentName={authenticatedUser?.name || ""} onSave={saveConsent} />
                <ConsentCard
                  kind="recording"
                  state={data.consents.recording}
                  defaultLabel={data.consents.recordingDefault === "included" ? "Included (school default)" : "Not included (school default)"}
                  parentName={authenticatedUser?.name || ""}
                  onSave={saveConsent}
                />
              </div>
              {data.consentHistory.length > 0 && (
                <details className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <summary className="text-xs text-slate-300 cursor-pointer inline-flex items-center gap-1">
                    <ChevronDown className="w-3.5 h-3.5" /> History of decisions ({data.consentHistory.length})
                  </summary>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
                    {data.consentHistory.map((h, i) => (
                      <li key={i}>
                        {dateTime(h.at)} · {h.kind === "analytics" ? "Engagement analytics" : "Class recording"}: <span className={h.granted ? "text-emerald-300" : "text-rose-300"}>{h.granted ? "allowed" : "not allowed"}</span>
                        {h.guardianName ? ` · by ${h.guardianName}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};
