import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, HelpCircle, ClipboardList, ListTree, Loader2, Sparkles, FileText, RefreshCw } from "lucide-react";
import { describeClass, ClassKind } from "../../services/classLabels";

export interface ClassNotesEntry {
  id: string;
  roomSlug: string;
  recordingId: string | null;
  generator: "gemini" | "local" | "extractive";
  createdAt: string;
  classStartedAt: string | null;
  class: { kind: ClassKind; subject: string; topic?: string | null; course?: string | null; teacherName?: string | null } | null;
  notes: {
    summary: string;
    keyConcepts: string[];
    questions: Array<{ question: string; askedBy?: string }>;
    homework: string[];
    outline: Array<{ minute: number; title: string }>;
    stats: { lines: number; speakers: number; minutes: number };
  };
}

export function useClassNotes() {
  const [notes, setNotes] = useState<ClassNotesEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/notes");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't load class notes");
      setNotes(body.notes || []);
    } catch (e: any) {
      setError(e.message);
      setNotes([]);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return { notes, error, reload: load };
}

export const notesWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export function notesTitle(n: ClassNotesEntry) {
  if (!n.class) return n.roomSlug;
  return describeClass({ ...n.class, topic: n.class.topic || undefined, scheduledStart: n.classStartedAt || n.createdAt } as any).title;
}

/** One class's notes. */
export const ClassNotesDetail: React.FC<{ entry: ClassNotesEntry }> = ({ entry }) => {
  const n = entry.notes;
  return (
    <div className="space-y-4 min-w-0">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-2xs">
          {entry.class && <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-200 border border-blue-500/30 font-semibold">{describeClass({ ...entry.class, scheduledStart: entry.classStartedAt || entry.createdAt } as any).badge}</span>}
          {entry.generator === "gemini" || entry.generator === "local" ? (
            <span
              className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-200 border border-violet-500/30 inline-flex items-center gap-1"
              title={entry.generator === "local" ? "Written by the school's own AI server" : "Written by Google Gemini"}
            >
              <Sparkles className="w-3 h-3" /> AI notes{entry.generator === "local" ? " · school server" : ""}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 inline-flex items-center gap-1" title="Sentences picked from what was said in class; no AI rewriting">
              <FileText className="w-3 h-3" /> From the transcript
            </span>
          )}
          <span className="text-slate-400">{notesWhen(entry.classStartedAt || entry.createdAt)}</span>
        </div>
        <h2 className="text-lg font-bold text-white">{notesTitle(entry)}</h2>
        {entry.class?.teacherName && <p className="text-xs text-slate-400">{entry.class.teacherName}</p>}
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Summary
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed">{n.summary}</p>
        {n.keyConcepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {n.keyConcepts.map((k) => (
              <span key={k} className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-100 text-xs">
                {k}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 @3xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Homework
          </h3>
          {n.homework.length ? (
            <ul className="space-y-1.5 text-sm text-slate-200 list-disc pl-5">
              {n.homework.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No homework was set in class.</p>
          )}
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Questions asked
          </h3>
          {n.questions.length ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {n.questions.map((q, i) => (
                <li key={i}>
                  {q.question}
                  {q.askedBy && <span className="text-slate-500 text-xs"> · {q.askedBy}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No questions were captured.</p>
          )}
        </section>
      </div>

      {n.outline.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <ListTree className="w-3.5 h-3.5" /> Outline
          </h3>
          <ol className="space-y-1.5 text-sm text-slate-200">
            {n.outline.map((o, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-xs font-mono text-slate-500 w-12 shrink-0 pt-0.5">{o.minute} min</span>
                <span>{o.title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <p className="text-2xs text-slate-500">
        Based on {n.stats.lines} transcript line{n.stats.lines === 1 ? "" : "s"} from {n.stats.speakers} speaker{n.stats.speakers === 1 ? "" : "s"}.
      </p>
    </div>
  );
};

/** Notebook tab: notes from the classes this person may see. */
export const ClassNotesPanel: React.FC<{ emptyHint?: string }> = ({ emptyHint }) => {
  const { notes, error, reload } = useClassNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => notes?.find((n) => n.id === selectedId) || notes?.[0] || null, [notes, selectedId]);

  if (!notes) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading class notes…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100 flex items-center justify-between gap-3">
        <span>{error}</span>
        <button onClick={reload} className="h-8 px-3 rounded-lg bg-white/10 text-xs inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }
  if (!notes.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center space-y-2">
        <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
        <p className="text-sm text-slate-200 font-semibold">No class notes yet</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">{emptyHint || "Notes appear here a minute or two after each class ends, built from what was said in class."}</p>
      </div>
    );
  }

  return (
    <div className="@container grid gap-4 @3xl:grid-cols-[16rem_minmax(0,1fr)] min-w-0">
      {/* Phones: a picker; wider screens: a list */}
      <label className="@3xl:hidden block">
        <span className="sr-only">Choose a class</span>
        <select
          value={selected?.id || ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl bg-slate-900 border border-white/15 px-3 py-2.5 text-sm text-white"
        >
          {notes.map((n) => (
            <option key={n.id} value={n.id}>
              {notesTitle(n)} · {notesWhen(n.classStartedAt || n.createdAt)}
            </option>
          ))}
        </select>
      </label>
      <ul className="hidden @3xl:block space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
        {notes.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => setSelectedId(n.id)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 ${selected?.id === n.id ? "bg-blue-600/20 border-blue-500/40" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"}`}
            >
              <div className="text-sm font-semibold text-white truncate">{notesTitle(n)}</div>
              <div className="text-2xs text-slate-400">{notesWhen(n.classStartedAt || n.createdAt)}</div>
            </button>
          </li>
        ))}
      </ul>
      {selected && <ClassNotesDetail entry={selected} />}
    </div>
  );
};
