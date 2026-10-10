import React from "react";
import { CheckCircle2, Save, Send } from "lucide-react";
import { Button, ErrorState } from "../ui";

/** Anchored 1–4 rubrics: each level says what it looks like, so two auditors score alike. */
export const RUBRICS: Record<string, { title: string; criteria: Array<{ key: string; label: string; levels: [string, string, string, string] }> }> = {
  teaching_v1: {
    title: "Teaching",
    criteria: [
      { key: "clarity", label: "Explains clearly", levels: ["Confusing or wrong", "Partly clear", "Clear", "Clear, and checks understanding"] },
      { key: "pacing", label: "Pacing", levels: ["Rushed or dragging", "Uneven", "Suits most learners", "Adapts to the class"] },
      { key: "interaction", label: "Involves learners", levels: ["Lecture only", "Occasional questions", "Regular questions or activities", "Most learners take part"] },
      { key: "accuracy", label: "Subject accuracy", levels: ["Errors", "Minor slips", "Accurate", "Accurate and goes deeper"] },
      { key: "management", label: "Class management", levels: ["Disorderly", "Some disruption", "Orderly", "Calm, inclusive, on task"] },
    ],
  },
  counselling_v1: {
    title: "Counselling",
    criteria: [
      { key: "rapport", label: "Builds rapport", levels: ["Cold or rushed", "Polite", "Warm and attentive", "Family clearly at ease"] },
      { key: "needs", label: "Understands the family's needs", levels: ["Didn't ask", "Asked, didn't follow up", "Understood the main needs", "Understood needs and concerns in depth"] },
      { key: "clarity", label: "Explains the programme", levels: ["Unclear", "Partly clear", "Clear", "Clear and tailored to the family"] },
      { key: "accuracy", label: "Accurate information", levels: ["Wrong fees, dates or claims", "Minor inaccuracies", "Accurate", "Accurate, with sources or follow-up"] },
      { key: "nextSteps", label: "Agrees next steps", levels: ["None", "Vague", "Clear next step", "Clear next step with a date"] },
    ],
  },
};

export interface ReviewValue {
  rubric: string;
  scores: Record<string, number>;
  note: string;
  status?: "draft" | "submitted";
}

/**
 * Auditor review of one class. Drafts can be saved and changed; a submitted review is final and
 * counts toward the class's quality score.
 */
export const ReviewForm: React.FC<{ recordingId: string; rubric: "teaching_v1" | "counselling_v1"; initial?: ReviewValue | null; onSaved?: (status: "draft" | "submitted") => void; compact?: boolean }> = ({
  recordingId,
  rubric,
  initial,
  onSaved,
  compact,
}) => {
  const def = RUBRICS[initial?.rubric || rubric] || RUBRICS.teaching_v1;
  const [scores, setScores] = React.useState<Record<string, number>>(initial?.scores || {});
  const [note, setNote] = React.useState(initial?.note || "");
  const [busy, setBusy] = React.useState<"draft" | "submit" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  const submitted = initial?.status === "submitted";
  const complete = def.criteria.every((c) => scores[c.key]);

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "draft");
    setError(null);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId, rubric: initial?.rubric || rubric, scores, note, submit }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || "Couldn't save the review");
      setSaved(submit ? "Review submitted. It now counts toward this class's quality." : "Draft saved.");
      onSaved?.(submit ? "submitted" : "draft");
    } catch (e: any) {
      setError(e?.message || "Couldn't save the review");
    } finally {
      setBusy(null);
    }
  };

  if (submitted)
    return (
      <div className="rounded-xl border border-good/30 bg-good/10 px-4 py-3 text-sm text-ink flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-good shrink-0 mt-0.5" />
        <span>You reviewed this class. Submitted reviews can't be changed.</span>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(true);
      }}
      className="flex flex-col gap-4"
    >
      {def.criteria.map((c) => (
        <fieldset key={c.key} className="flex flex-col gap-2">
          <legend className="text-xs font-semibold text-ink-2 mb-1.5">{c.label}</legend>
          <div className={`grid gap-1.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
            {c.levels.map((label, i) => {
              const v = i + 1;
              const on = scores[c.key] === v;
              return (
                <label
                  key={v}
                  className={`flex flex-col gap-0.5 rounded-xl border px-2.5 py-2 cursor-pointer text-left transition-colors ${on ? "border-accent bg-accent/15" : "border-line hover:border-line-strong hover:bg-white/[0.03]"}`}
                >
                  <input type="radio" name={`${recordingId}-${c.key}`} value={v} checked={on} onChange={() => setScores((s) => ({ ...s, [c.key]: v }))} className="sr-only" />
                  <span className={`text-sm font-bold tabular-nums ${on ? "text-ink" : "text-ink-2"}`}>{v}</span>
                  <span className="text-2xs text-ink-3 leading-snug">{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${recordingId}-note`} className="text-xs font-semibold text-ink-2">
          Note for the record <span className="font-normal text-ink-3">(optional; teachers don't see reviews)</span>
        </label>
        <textarea
          id={`${recordingId}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-xl bg-surface-sunken border border-line-strong px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
          placeholder="What you saw, with times if useful"
        />
      </div>
      {error && <ErrorState message={error} />}
      {saved && (
        <p role="status" className="text-xs text-good">
          {saved}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="secondary" icon={Save} loading={busy === "draft"} onClick={() => save(false)} disabled={!Object.keys(scores).length}>
          Save draft
        </Button>
        <Button size="sm" variant="primary" type="submit" icon={Send} loading={busy === "submit"} disabled={!complete} title={complete ? undefined : "Score every line first"}>
          Submit review
        </Button>
      </div>
    </form>
  );
};
