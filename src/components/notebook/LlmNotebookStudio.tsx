import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Layers, MessageCircleQuestion, Volume2, Square, Copy, Check, Video, Loader2, Send, RotateCcw, RefreshCw } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { ClassNotesDetail, ClassNotesEntry, notesTitle, notesWhen, useClassNotes } from "./ClassNotesPanel";

type Tab = "notes" | "flashcards" | "ask";

/** Concept → the sentence from the notes that explains it (only cards we can back with class content). */
function flashcardsFor(entry: ClassNotesEntry) {
  const sentences = [...entry.notes.summary.split(/(?<=[.!?])\s+/), ...entry.notes.outline.map((o) => o.title)].map((s) => s.trim()).filter(Boolean);
  return entry.notes.keyConcepts
    .map((concept) => {
      const re = new RegExp(`\\b${concept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      const back = sentences.find((s) => re.test(s));
      return back ? { front: concept, back } : null;
    })
    .filter(Boolean) as Array<{ front: string; back: string }>;
}

function notesMarkdown(e: ClassNotesEntry) {
  const n = e.notes;
  return [
    `# ${notesTitle(e)}`,
    `${notesWhen(e.classStartedAt || e.createdAt)}${e.class?.teacherName ? ` · ${e.class.teacherName}` : ""}`,
    "",
    "## Summary",
    n.summary,
    n.keyConcepts.length ? `\n**Key concepts:** ${n.keyConcepts.join(", ")}` : "",
    "",
    "## Homework",
    ...(n.homework.length ? n.homework.map((h) => `- ${h}`) : ["- None set"]),
    "",
    "## Questions asked",
    ...(n.questions.length ? n.questions.map((q) => `- ${q.question}${q.askedBy ? ` (${q.askedBy})` : ""}`) : ["- None captured"]),
    ...(n.outline.length ? ["", "## Outline", ...n.outline.map((o) => `- ${o.minute} min: ${o.title}`)] : []),
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

const Flashcards: React.FC<{ entry: ClassNotesEntry }> = ({ entry }) => {
  const cards = useMemo(() => flashcardsFor(entry), [entry]);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  useEffect(() => setFlipped({}), [entry.id]);
  if (!cards.length) return <p className="text-sm text-slate-400 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center">Not enough in this class's notes to make flashcards.</p>;
  return (
    <div className="grid gap-3 grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3">
      {cards.map((c, i) => (
        <button
          key={i}
          onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
          className={`min-h-36 rounded-2xl border p-4 text-left transition-colors ${flipped[i] ? "bg-blue-600/15 border-blue-500/40" : "bg-slate-900/70 border-white/10 hover:bg-slate-900"}`}
          aria-pressed={Boolean(flipped[i])}
        >
          <div className="text-2xs uppercase tracking-wider text-slate-400 mb-2">{flipped[i] ? "From the class" : "Concept · tap to reveal"}</div>
          <div className={flipped[i] ? "text-sm text-slate-100 leading-relaxed" : "text-lg font-bold text-white capitalize"}>{flipped[i] ? c.back : c.front}</div>
        </button>
      ))}
    </div>
  );
};

const AskClass: React.FC<{ entry: ClassNotesEntry }> = ({ entry }) => {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ question: string; answer: string | null; generator: string; quotes: Array<{ minute: number; speakerName: string | null; text: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [entry.id]);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(entry.id)}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't answer right now");
      setResult({ question: q, ...body });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 max-w-3xl">
      <form onSubmit={ask} className="flex gap-2">
        <label htmlFor="ask-class" className="sr-only">
          Ask about this class
        </label>
        <input
          id="ask-class"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this class, e.g. What are coherent sources?"
          className="flex-1 min-w-0 rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white placeholder-slate-500"
          maxLength={500}
        />
        <button type="submit" disabled={busy || question.trim().length < 3} className="btn-primary shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
      <p className="text-2xs text-slate-500">Answers come only from what was said in this class.</p>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {result && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
          <div className="text-xs text-slate-400">{result.question}</div>
          {result.answer ? (
            <p className="text-sm text-slate-100 leading-relaxed">{result.answer}</p>
          ) : (
            <p className="text-sm text-slate-300">{result.quotes.length ? "Here's what was said in class about that:" : "Nothing in this class's transcript matches your question."}</p>
          )}
          {result.quotes.length > 0 && (
            <ul className="space-y-2">
              {result.quotes.map((q, i) => (
                <li key={i} className="text-sm text-slate-200 border-l-2 border-blue-500/50 pl-3">
                  <span className="text-2xs font-mono text-slate-500 mr-2">{q.minute} min</span>
                  {q.speakerName && <span className="text-slate-400">{q.speakerName}: </span>}
                  {q.text}
                </li>
              ))}
            </ul>
          )}
          {result.generator === "search" && result.quotes.length > 0 && <p className="text-2xs text-slate-500">AI answers aren't available right now, so these are the matching parts of the transcript.</p>}
          {result.generator === "local" && <p className="text-2xs text-slate-500">Answered by the school's own AI server.</p>}
        </div>
      )}
    </div>
  );
};

/** Listen to the notes with the device's own text-to-speech. */
function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const utter = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);
  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };
  const speak = (text: string, lang?: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (lang) u.lang = lang;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utter.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return { supported, speaking, speak, stop };
}

export const LlmNotebookStudio: React.FC = () => {
  const { setActiveView, currentRole, authenticatedUser } = useClassroom();
  const { notes, error, reload } = useClassNotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("notes");
  const [copied, setCopied] = useState(false);
  const voice = useReadAloud();
  const selected = useMemo(() => notes?.find((n) => n.id === selectedId) || notes?.[0] || null, [notes, selectedId]);

  useEffect(() => voice.stop(), [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(notesMarkdown(selected));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const listen = () => {
    if (!selected) return;
    if (voice.speaking) return voice.stop();
    const n = selected.notes;
    voice.speak(
      [`${notesTitle(selected)}.`, n.summary, n.homework.length ? `Homework: ${n.homework.join(". ")}` : ""].filter(Boolean).join(" "),
      authenticatedUser?.languageTag
    );
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "notes", label: "Notes", icon: BookOpen },
    { id: "flashcards", label: "Flashcards", icon: Layers },
    { id: "ask", label: "Ask about this class", icon: MessageCircleQuestion },
  ];

  return (
    <div className="@container flex-1 flex flex-col bg-canvas overflow-y-auto font-sans min-w-0">
      <div className="bg-slate-900/70 border-b border-white/10 px-4 sm:px-6 py-4 flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="font-headline font-bold text-xl text-white">Class notebook</h1>
          <p className="text-xs text-slate-400">Notes from your classes, made from what was said in class.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected && voice.supported && (
            <button onClick={listen} className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-slate-200 hover:bg-white/10 inline-flex items-center gap-1.5" aria-pressed={voice.speaking}>
              {voice.speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {voice.speaking ? "Stop" : "Listen"}
            </button>
          )}
          {selected && (
            <button onClick={copy} className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-slate-200 hover:bg-white/10 inline-flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy notes"}
            </button>
          )}
          <button onClick={reload} className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/10 inline-flex items-center justify-center" aria-label="Refresh notes" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {currentRole !== "parent" && (
            <button onClick={() => setActiveView("classroom")} className="h-9 px-3 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-ink inline-flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" /> Live class
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 min-w-0">
        {!notes ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading class notes…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={reload} className="h-8 px-3 rounded-lg bg-white/10 text-xs inline-flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : !notes.length || !selected ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center space-y-2 max-w-lg mx-auto">
            <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm text-slate-200 font-semibold">No class notes yet</p>
            <p className="text-xs text-slate-400">Notes appear here a minute or two after a class ends, built from what was said in class.</p>
          </div>
        ) : (
          <div className="grid gap-4 @4xl:grid-cols-[16rem_minmax(0,1fr)] min-w-0">
            <label className="@4xl:hidden block">
              <span className="sr-only">Choose a class</span>
              <select value={selected.id} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded-xl bg-slate-900 border border-white/15 px-3 py-2.5 text-sm text-white">
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {notesTitle(n)} · {notesWhen(n.classStartedAt || n.createdAt)}
                  </option>
                ))}
              </select>
            </label>
            <ul className="hidden @4xl:block space-y-1.5 max-h-[75vh] overflow-y-auto pr-1">
              {notes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => setSelectedId(n.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 ${selected.id === n.id ? "bg-blue-600/20 border-blue-500/40" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"}`}
                  >
                    <div className="text-sm font-semibold text-white truncate">{notesTitle(n)}</div>
                    <div className="text-2xs text-slate-400">{notesWhen(n.classStartedAt || n.createdAt)}</div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="min-w-0 space-y-4">
              <div role="tablist" aria-label="Notebook" className="flex gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar w-fit max-w-full">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${tab === id ? "bg-brand-navy text-white" : "text-slate-300 hover:bg-white/10"}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              {tab === "notes" && <ClassNotesDetail entry={selected} />}
              {tab === "flashcards" && <Flashcards entry={selected} />}
              {tab === "ask" && <AskClass entry={selected} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
