import React from "react";
import { ShieldCheck } from "lucide-react";
import { BarList, ChartFrame, StackedBar } from "../../charts";
import { fmt, Format } from "../../charts/scale";
import { ErrorState, Skeleton } from "../../ui";
import type { Breakdown, Summary } from "../analyticsClient";
import { apiParams, plural, useApi } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";

const STATUS: Record<string, { label: string; color: string }> = {
  present: { label: "On time", color: "var(--color-series-1)" },
  late: { label: "Late", color: "var(--color-series-4)" },
  left_early: { label: "Left early", color: "var(--color-series-7)" },
  absent: { label: "Absent", color: "var(--color-series-2)" },
};

const LearnerCard: React.FC<{ dim: string; title: string; description: string; metricKey: string; format: Format; filterKey?: string; className?: string }> = ({ dim, title, description, metricKey, format, filterKey, className }) => {
  const { query, addFilter } = useAnalytics();
  const { data, error, reload } = useApi<Breakdown>(`/api/analytics/breakdown?${apiParams(query, { dim })}`);
  const rows = [...(data?.rows || [])].sort((a, b) => (dim === "learner_grade" ? (a.order ?? 0) - (b.order ?? 0) : b.n - a.n));
  return (
    <ChartFrame
      className={className}
      title={title}
      description={description}
      table={{ columns: [title, "Learners", "Attendance", "Late", "Engagement"], rows: rows.map((r) => [r.label, r.n, fmt(r.metrics.attendanceRate, "pct"), fmt(r.metrics.lateRate, "pct"), fmt(r.metrics.avgAttention, "pct")]) }}
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length ? (
        <BarList
          ariaLabel={title}
          format={format}
          max={format === "pct" ? 1 : undefined}
          onSelect={filterKey ? (r) => r.key !== "__small__" && r.key !== "unknown" && addFilter(filterKey, r.key) : undefined}
          rows={rows.map((r) => ({ key: r.key, label: r.label, value: r.metrics[metricKey], meta: plural(r.n, "learner"), lowConfidence: r.lowConfidence }))}
          limit={10}
        />
      ) : (
        <p className="text-xs text-ink-3">No learners in this period.</p>
      )}
    </ChartFrame>
  );
};

/** Where learners are, when they join and how they take part (privacy-safe groups). */
export const LearnersTab: React.FC<{ summary: Summary }> = ({ summary }) => {
  const seats = summary.learnerStatus.reduce((a, s) => a + s.seats, 0);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-12 flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-ink-3">
        <ShieldCheck className="w-4 h-4 shrink-0 text-good mt-px" aria-hidden="true" />
        <span>
          Learner groups smaller than 3 are combined into “Other” or hidden, and engagement only counts learners who agreed to it. Nothing here shows an individual learner.
        </span>
      </div>
      <ChartFrame
        className="xl:col-span-12"
        title="How learners joined"
        description={`${fmt(seats, "int")} learner seats in scheduled and drop-in sessions.`}
        table={{ columns: ["Status", "Seats"], rows: summary.learnerStatus.map((s) => [STATUS[s.status]?.label || s.status, s.seats]) }}
      >
        <StackedBar ariaLabel="Learner seats by join status" unit="seats" segments={summary.learnerStatus.map((s) => ({ key: s.status, label: STATUS[s.status]?.label || s.status, value: s.seats, color: STATUS[s.status]?.color || "var(--color-series-8)" }))} />
      </ChartFrame>
      <LearnerCard className="xl:col-span-6" dim="country" title="Attendance by country" description="Where learners live (from booking and their device)." metricKey="attendanceRate" format="pct" filterKey="country" />
      <LearnerCard className="xl:col-span-6" dim="learner_timezone" title="Attendance by learner timezone" description="Late-night and early-morning classes for a timezone show up here." metricKey="attendanceRate" format="pct" filterKey="timezone" />
      <LearnerCard className="xl:col-span-6" dim="learner_grade" title="Attendance by grade" description="Learners' grade level." metricKey="attendanceRate" format="pct" />
      <LearnerCard className="xl:col-span-6" dim="device" title="Engagement by device" description="Learners who joined, by the device they used." metricKey="avgAttention" format="pct" filterKey="device" />
    </div>
  );
};
