import React from "react";
import { ListFilter } from "lucide-react";
import { LineChart } from "../charts";
import { fmt } from "../charts/scale";
import { Badge, Button, Drawer, ErrorState, ScoreMeter, Skeleton } from "../ui";
import type { SessionSummary, TeacherRow, Targets } from "./analyticsClient";
import { apiParams, periodLabel, plural, shortDate, useApi } from "./analyticsClient";
import { useAnalytics } from "./AnalyticsContext";

/** One teacher: their quality and what drives it, trend, key measures and recent classes. */
export const TeacherDrawer: React.FC<{ teacherId: string | null; onClose: () => void }> = ({ teacherId, onClose }) => {
  const { query, meta, openSession, addFilter } = useAnalytics();
  const teachers = useApi<{ teachers: TeacherRow[]; targets: Targets; periods: string[]; granularity: "day" | "week" }>(teacherId ? `/api/analytics/teachers?${apiParams(query)}` : null);
  const recent = useApi<{ total: number; sessions: SessionSummary[] }>(
    teacherId ? `/api/analytics/sessions?${apiParams({ ...query, filters: { ...query.filters, teacher: [teacherId] } }, { pageSize: 8, sort: "recent" })}` : null
  );
  const t = teachers.data?.teachers.find((x) => x.key === teacherId);
  const name = t?.label || meta?.filters.teacher?.find((o) => o.value === teacherId)?.label || "Teacher";
  const target = teachers.data?.targets.quality ?? 75;
  const comps = meta?.components || {};

  return (
    <Drawer
      open={Boolean(teacherId)}
      onClose={onClose}
      width="lg"
      title={name}
      description={t ? `${t.n} teaching sessions · ${fmt(t.metrics.hours, "hours")} in this period` : undefined}
      footer={
        teacherId ? (
          <Button
            size="sm"
            icon={ListFilter}
            onClick={() => {
              addFilter("teacher", teacherId);
              onClose();
            }}
          >
            Filter the dashboard to this teacher
          </Button>
        ) : undefined
      }
    >
      {teachers.error && <ErrorState message={teachers.error} onRetry={teachers.reload} />}
      {!teachers.data && !teachers.error && <Skeleton className="h-64" />}
      {teachers.data && !t && <p className="text-sm text-ink-3">No teaching sessions for this person in this period (counsellors appear in the Counselling tab).</p>}
      {t && (
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Teacher quality</h3>
            {t.teacherQuality == null ? (
              <p className="text-sm text-ink-2">
                Not ranked yet: {t.n} of 5 classes needed. Average class quality so far: <span className="font-semibold text-ink">{fmt(t.metrics.avgQuality, "score")}</span>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <ScoreMeter score={t.teacherQuality} target={target} label="Teacher quality" />
                {t.metrics.teacherQualityLow != null && (
                  <span className="text-xs text-ink-3">
                    Likely between {fmt(t.metrics.teacherQualityLow, "score")} and {fmt(t.metrics.teacherQualityHigh, "score")} · class scores vary ±{fmt(t.metrics.qualitySpread, "num1")}
                  </span>
                )}
              </div>
            )}
            <ul className="mt-4 flex flex-col gap-1.5" aria-label="Average score per signal">
              {Object.entries(t.components).map(([k, v]) => (
                <li key={k} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-xs">
                  <span className="text-ink-2 truncate">{comps[k] || k}</span>
                  <span className="relative h-1.5 rounded-full bg-white/[0.06]" aria-hidden="true">
                    {v != null && <span className="absolute inset-y-0 left-0 rounded-full bg-series-1" style={{ width: `${Math.round(v * 100)}%` }} />}
                  </span>
                  <span className="text-right tabular-nums text-ink">{v == null ? <span className="text-ink-3">n/a</span> : Math.round(v * 100)}</span>
                </li>
              ))}
            </ul>
          </section>

          {t.spark.filter((v) => v != null).length > 1 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Quality over time</h3>
              <LineChart
                height={160}
                points={t.spark.map((v, i) => ({ label: periodLabel(teachers.data!.periods[i] || "", teachers.data!.granularity), value: v }))}
                format="score"
                ariaLabel={`${name}'s class quality over the period`}
                refLines={[{ value: target, label: `Target ${target}`, kind: "target" }]}
              />
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Key measures</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {(
                [
                  ["On-time starts", fmt(t.metrics.onTimeRate, "pct")],
                  ["Avg start delay", fmt(t.metrics.avgStartDelayMin, "min")],
                  ["Attendance", fmt(t.metrics.attendanceRate, "pct")],
                  ["Occupancy", fmt(t.metrics.avgOccupancy, "pct")],
                  ["Engagement", fmt(t.metrics.avgAttention, "pct")],
                  ["Questions per class", fmt(t.metrics.questionsPerClass, "num1")],
                  ["Avg class length", fmt(t.metrics.avgDurationMin, "min")],
                  ["Auditor reviews", t.reviews ? `${fmt(t.observedQuality, "num1")} / 4 (${t.reviews})` : "None"],
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-ink tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Recent sessions</h3>
            {!recent.data ? (
              <Skeleton className="h-32" />
            ) : (
              <ul className="flex flex-col gap-1.5">
                {recent.data.sessions.map((s) => (
                  <li key={s.recordingId}>
                    <button onClick={() => openSession(s.recordingId)} className="w-full flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-left hover:bg-white/[0.03]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{s.title}</span>
                        <span className="block truncate text-2xs text-ink-3">
                          {shortDate(s.startedAt, query.tz)} · {s.attendanceTracked ? plural(s.attended, "learner") : "attendance unknown"}
                          {s.reasons[0] ? ` · ${s.reasons[0]}` : ""}
                        </span>
                      </span>
                      {s.demo && <Badge tone="warning">Demo</Badge>}
                      <span className="text-sm font-bold tabular-nums text-ink w-9 text-right">{s.quality == null ? "—" : Math.round(s.quality)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
};
