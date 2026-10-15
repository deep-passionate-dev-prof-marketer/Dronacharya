import React from "react";
import { BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { toast } from "../ui/Feedback";

const TEMPLATES: Array<{ label: string; options: string[] }> = [
  { label: "Yes / No", options: ["Yes", "No"] },
  { label: "A–D", options: ["A", "B", "C", "D"] },
  { label: "Understood?", options: ["Got it", "Partly", "Lost"] },
];

/**
 * Dock "Polls": hosts ask a question (live results, one vote per person, stored with the class);
 * learners vote here or on the card over the stage.
 */
export const PollsPanel: React.FC = () => {
  const { classHost, activePoll, myPollVote, startPoll, voteLivePoll, closePoll, classStatus } = useClassroom();
  const isHost = Boolean(classHost?.isHost);
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState<string[]>(["", ""]);
  const [busy, setBusy] = React.useState(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 2) return toast("Add a question and at least two options.", "critical");
    setBusy(true);
    const err = await startPoll(question.trim(), opts);
    setBusy(false);
    if (err) return toast(err, "critical");
    setQuestion("");
    setOptions(["", ""]);
  };
  const vote = async (i: number) => {
    const err = await voteLivePoll(i);
    if (err) toast(err, "critical");
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3 bg-canvas">
      {activePoll ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 space-y-2" aria-label="Current poll">
          <div className="text-2xs uppercase tracking-wider text-blue-300 font-semibold">{activePoll.closed ? "Poll closed" : "Live poll"}</div>
          <div className="text-sm font-semibold text-white">{activePoll.question}</div>
          {activePoll.options.map((o, i) => {
            const pct = Math.round((activePoll.counts[i] / Math.max(1, activePoll.total)) * 100);
            const showResults = isHost || myPollVote !== null || activePoll.closed;
            return (
              <button
                key={i}
                disabled={isHost || activePoll.closed}
                onClick={() => vote(i)}
                aria-pressed={myPollVote === i}
                className={`relative w-full overflow-hidden rounded-xl border text-left px-3 py-2 text-sm ${myPollVote === i ? "border-blue-400 text-white" : "border-white/10 text-slate-200"} ${isHost || activePoll.closed ? "" : "hover:bg-white/5"}`}
              >
                {showResults && <span className="absolute inset-y-0 left-0 bg-blue-500/20" style={{ width: `${pct}%` }} />}
                <span className="relative flex justify-between gap-2">
                  <span>{o}</span>
                  {showResults && (
                    <span className="tabular-nums text-slate-400">
                      {activePoll.counts[i]} · {pct}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <div className="flex items-center justify-between text-2xs text-slate-400">
            <span>
              {activePoll.total} vote{activePoll.total === 1 ? "" : "s"}
            </span>
            {isHost && !activePoll.closed && (
              <button onClick={closePoll} className="h-8 px-3 rounded-lg bg-white/10 text-white text-xs font-semibold">
                Close poll
              </button>
            )}
          </div>
        </section>
      ) : (
        !isHost && <p className="text-sm text-slate-400">No poll right now. When your teacher asks one, it appears here and on your screen.</p>
      )}

      {isHost && (!activePoll || activePoll.closed) && (
        <form onSubmit={start} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 flex flex-col gap-2" aria-label="New poll">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-300" /> Ask the class
          </h3>
          {classStatus !== "in_progress" && <p className="text-2xs text-amber-200">The class hasn't started; learners can still answer once they're in.</p>}
          <label htmlFor="poll-q" className="sr-only">
            Question
          </label>
          <input id="poll-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder="Question" className="h-10 rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 text-sm text-white placeholder-slate-500" />
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button key={t.label} type="button" onClick={() => setOptions(t.options)} className="h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 hover:bg-white/10">
                {t.label}
              </button>
            ))}
          </div>
          {options.map((o, i) => (
            <div key={i} className="flex gap-1.5">
              <label htmlFor={`poll-o-${i}`} className="sr-only">
                Option {i + 1}
              </label>
              <input
                id={`poll-o-${i}`}
                value={o}
                onChange={(e) => setOptions((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                maxLength={80}
                placeholder={`Option ${i + 1}`}
                className="flex-1 min-w-0 h-9 rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 text-sm text-white placeholder-slate-500"
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions((cur) => cur.filter((_, j) => j !== i))} className="h-9 w-9 rounded-xl bg-white/5 text-slate-400 hover:text-rose-300 inline-flex items-center justify-center" aria-label={`Remove option ${i + 1}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button type="button" onClick={() => setOptions((cur) => [...cur, ""])} className="self-start h-8 px-2.5 rounded-lg text-xs text-blue-300 hover:bg-white/5 inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          )}
          <button type="submit" disabled={busy} className="h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Start poll
          </button>
        </form>
      )}
    </div>
  );
};
