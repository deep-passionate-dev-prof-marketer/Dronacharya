import React from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, OctagonAlert } from "lucide-react";
import { cx } from "./cx";
import type { Tone } from "./Badge";

/** Quality band for a 0–100 score against a target (status colours always come with an icon). */
export function scoreBand(score: number | null | undefined, target = 75): { tone: Tone; label: string; icon: React.ComponentType<{ className?: string }> } {
  if (score == null) return { tone: "neutral", label: "Not scored", icon: CircleAlert };
  if (score >= target) return { tone: "good", label: "On target", icon: CheckCircle2 };
  if (score >= target - 10) return { tone: "warning", label: "Slightly below", icon: AlertTriangle };
  if (score >= target - 20) return { tone: "serious", label: "Below target", icon: AlertTriangle };
  return { tone: "critical", label: "Well below", icon: OctagonAlert };
}

const BAR: Record<Tone, string> = { neutral: "bg-ink-3", accent: "bg-accent", good: "bg-good", warning: "bg-warning", serious: "bg-serious", critical: "bg-critical" };
const TEXT: Record<Tone, string> = { neutral: "text-ink-3", accent: "text-accent", good: "text-good", warning: "text-warning", serious: "text-serious", critical: "text-critical" };

/** A 0–100 score as a number, a thin bar and a status icon; the target is a tick on the bar. */
export const ScoreMeter: React.FC<{ score: number | null | undefined; target?: number; compact?: boolean; label?: string }> = ({ score, target = 75, compact, label }) => {
  const band = scoreBand(score, target);
  const Icon = band.icon;
  return (
    <div className={cx("flex items-center gap-2 min-w-0", compact ? "w-32" : "w-44")} title={`${label ? `${label}: ` : ""}${score ?? "not scored"} (${band.label}, target ${target})`}>
      <span className={cx("tabular-nums font-bold text-sm w-9 text-right", score == null ? "text-ink-3" : "text-ink")}>{score == null ? "—" : Math.round(score)}</span>
      <span className="relative flex-1 h-1.5 rounded-full bg-white/8" aria-hidden="true">
        {score != null && <span className={cx("absolute inset-y-0 left-0 rounded-full", BAR[band.tone])} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />}
        <span className="absolute -top-0.5 -bottom-0.5 w-px bg-ink-2" style={{ left: `${target}%` }} />
      </span>
      <Icon className={cx("w-3.5 h-3.5 shrink-0", TEXT[band.tone])} aria-label={band.label} />
    </div>
  );
};
