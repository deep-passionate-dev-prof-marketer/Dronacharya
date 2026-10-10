import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "../charts/Sparkline";
import { fmt } from "../charts/scale";
import { Skeleton, scoreBand } from "../ui";
import type { Summary, Targets } from "./analyticsClient";
import { metric } from "./metrics";

const KPIS: Array<{ key: string; spark?: keyof Summary["trend"]["points"][number]; sub?: (m: Record<string, number | null>) => string | null }> = [
  { key: "sessions", spark: "sessions", sub: (m) => `${fmt(m.hours, "hours")} · ${fmt(m.counsellingSessions, "int")} counselling` },
  { key: "avgQuality", spark: "avgQuality", sub: (m) => (m.scoredShare != null ? `${fmt(m.scoredShare, "pct")} of sessions scored` : null) },
  { key: "avgTeacherQuality" },
  { key: "avgOccupancy", spark: "avgOccupancy", sub: (m) => (m.avgClassSize != null ? `Avg ${fmt(m.avgClassSize, "num1")} learners at once` : null) },
  { key: "attendanceRate", spark: "attendanceRate", sub: (m) => (m.learnersReached != null ? `${fmt(m.learnersReached, "int")} learners reached` : null) },
  { key: "avgDurationMin", spark: "avgDurationMin", sub: (m) => (m.medianDurationMin != null ? `Median ${fmt(m.medianDurationMin, "min")}` : null) },
  { key: "avgCounsellingMin", spark: "avgCounsellingMin", sub: (m) => (m.counsellingNoShowRate != null ? `${fmt(m.counsellingNoShowRate, "pct")} no-shows` : null) },
  { key: "onTimeRate", spark: "onTimeRate", sub: (m) => (m.avgStartDelayMin != null ? `Avg delay ${fmt(m.avgStartDelayMin, "min")}` : null) },
];

function targetFor(key: string, t: Targets): number | null {
  const d = metric(key);
  if (d.target === "quality") return t.quality;
  if (d.target === "occupancy") return t.occupancy;
  if (d.target === "attendance") return t.attendance;
  return null;
}

/** The headline numbers: value, change against the previous period, trend, and target status. */
export const KpiRow: React.FC<{ summary: Summary | null; loading: boolean; periodDays: number }> = ({ summary, loading, periodDays }) => {
  if (!summary)
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <div key={k.key} className="rounded-card border border-line bg-surface p-4 flex flex-col gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  const cur = summary.kpis.current;
  const prev = summary.kpis.previous;
  const hasPrev = Boolean(prev && (prev.sessions || 0) > 0);
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {KPIS.map((k) => {
        const d = metric(k.key);
        const v = cur[k.key];
        const p = hasPrev ? prev![k.key] : null;
        const delta = v != null && p != null ? v - p : null;
        const target = targetFor(k.key, summary.targets);
        const onTime = k.key === "onTimeRate";
        const band = d.format === "score" ? scoreBand(v, target ?? 75) : null;
        const metTarget = target != null && v != null ? v >= target : null;
        const good = delta == null || d.better == null || Math.abs(delta) < 1e-9 ? null : (delta > 0) === (d.better === "up");
        const DeltaIcon = delta == null || Math.abs(delta) < 1e-9 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
        const deltaText =
          delta == null ? null : d.format === "pct" ? `${delta > 0 ? "+" : ""}${Math.round(delta * 1000) / 10} pts` : `${delta > 0 ? "+" : ""}${fmt(delta, d.format === "int" ? "int" : "num1")}${d.format === "min" ? " min" : ""}`;
        return (
          <section key={k.key} className="@container rounded-card border border-line bg-surface p-3.5 sm:p-4 flex flex-col gap-1 min-w-0" aria-label={d.label}>
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <h3 className="text-xs font-semibold text-ink-3 leading-snug" title={d.definition}>
                {d.label}
              </h3>
              {(target != null || onTime) && v != null && (
                <span
                  className={`shrink-0 text-2xs font-semibold px-1.5 py-0.5 rounded-md border ${
                    onTime ? "text-ink-2 border-line-strong bg-white/5" : (band ? band.tone === "good" : metTarget) ? "text-good border-good/30 bg-good/10" : "text-warning border-warning/30 bg-warning/10"
                  }`}
                >
                  {onTime ? `Target ≤ ${summary.targets.startDelayMin} min` : `${metTarget ? "On" : "Below"} target ${fmt(target, d.format)}`}
                </span>
              )}
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-2xl font-bold text-ink tabular-nums leading-tight">{fmt(v, d.format)}</span>
              {k.spark && summary.trend.points.length > 2 && (
                <span className="hidden @[14rem]:block">
                  <Sparkline values={summary.trend.points.map((pt) => pt[k.spark!] as number | null)} label={`${d.label} trend`} />
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-ink-3 min-h-4">
              {deltaText && (
                <span className={`inline-flex items-center gap-0.5 font-semibold ${good == null ? "text-ink-2" : good ? "text-good" : "text-critical"}`}>
                  <DeltaIcon className="w-3 h-3" aria-hidden="true" />
                  {deltaText}
                  <span className="sr-only">{good == null ? "" : good ? "(better)" : "(worse)"}</span>
                </span>
              )}
              {deltaText && <span>vs previous {periodDays} days</span>}
              {!deltaText && k.sub && <span className="truncate">{k.sub(cur)}</span>}
            </div>
            {deltaText && k.sub && k.sub(cur) && <div className="text-2xs text-ink-3 truncate">{k.sub(cur)}</div>}
          </section>
        );
      })}
    </div>
  );
};
