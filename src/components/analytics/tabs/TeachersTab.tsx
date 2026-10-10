import React from "react";
import { Info } from "lucide-react";
import { Sparkline } from "../../charts";
import { fmt } from "../../charts/scale";
import { Badge, Card, CardHeader, Column, DataTable, EmptyState, ErrorState, ScoreMeter, Skeleton } from "../../ui";
import type { TeacherRow, Targets } from "../analyticsClient";
import { apiParams, useApi } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";

/** Teacher leaderboard (teaching sessions only; counselling has its own tab). */
export const TeachersTab: React.FC = () => {
  const { query, openTeacher } = useAnalytics();
  const { data, error, loading, reload } = useApi<{ teachers: TeacherRow[]; targets: Targets }>(`/api/analytics/teachers?${apiParams(query)}`);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-96 w-full" />;
  const target = data.targets.quality;
  const columns: Column<TeacherRow>[] = [
    {
      key: "name",
      header: "Teacher",
      sticky: true,
      sortValue: (r) => r.label,
      render: (r) => (
        <span className="flex flex-col items-start gap-1 max-w-[14rem]">
          <span className="truncate font-semibold text-ink max-w-full">{r.label}</span>
          {r.lowConfidence && <Badge>Fewer than 5 classes</Badge>}
        </span>
      ),
    },
    {
      key: "tq",
      header: "Teacher quality",
      sortValue: (r) => r.teacherQuality ?? null,
      render: (r) =>
        r.teacherQuality == null ? (
          <span className="text-xs text-ink-3">Not ranked yet</span>
        ) : (
          <span className="flex flex-col gap-0.5">
            <ScoreMeter score={r.teacherQuality} target={target} label="Teacher quality" />
            {r.metrics.teacherQualityLow != null && (
              <span className="text-2xs text-ink-3 tabular-nums">
                likely {fmt(r.metrics.teacherQualityLow, "score")}–{fmt(r.metrics.teacherQualityHigh, "score")}
              </span>
            )}
          </span>
        ),
    },
    { key: "trend", header: "Trend", render: (r) => <Sparkline values={r.spark} label={`${r.label} quality trend`} /> },
    { key: "n", header: "Classes", align: "right", sortValue: (r) => r.n, render: (r) => fmt(r.n, "int") },
    { key: "hours", header: "Hours", align: "right", sortValue: (r) => r.metrics.hours, render: (r) => fmt(r.metrics.hours, "num1") },
    { key: "onTime", header: "On-time starts", align: "right", sortValue: (r) => r.metrics.onTimeRate, render: (r) => fmt(r.metrics.onTimeRate, "pct") },
    { key: "att", header: "Attendance", align: "right", sortValue: (r) => r.metrics.attendanceRate, render: (r) => fmt(r.metrics.attendanceRate, "pct") },
    { key: "occ", header: "Occupancy", align: "right", sortValue: (r) => r.metrics.avgOccupancy, render: (r) => fmt(r.metrics.avgOccupancy, "pct") },
    { key: "eng", header: "Engagement", align: "right", sortValue: (r) => r.metrics.avgAttention, render: (r) => fmt(r.metrics.avgAttention, "pct") },
    { key: "q", header: "Questions / class", align: "right", sortValue: (r) => r.metrics.questionsPerClass, render: (r) => fmt(r.metrics.questionsPerClass, "num1") },
    {
      key: "rev",
      header: "Auditor reviews",
      align: "right",
      sortValue: (r) => r.observedQuality,
      render: (r) => (r.reviews ? `${fmt(r.observedQuality, "num1")} / 4 · ${r.reviews}` : <span className="text-ink-3">None</span>),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card padded={false} className="p-4">
        <CardHeader
          title="Teachers"
          description="Teaching sessions only. Click a teacher for their classes and score breakdown."
          actions={
            <span className="inline-flex items-start gap-1.5 text-2xs text-ink-3 max-w-md">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Teacher quality is the hours-weighted class quality, pulled toward the school average when a teacher has few classes, so one bad (or great) class can't decide a ranking. Teachers are ranked from 5 classes.
            </span>
          }
        />
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          <DataTable
            caption="Teachers ranked by teacher quality"
            rows={data.teachers}
            columns={columns}
            rowKey={(r) => r.key}
            onRowClick={(r) => r.key !== "unknown" && openTeacher(r.key)}
            rowLabel={(r) => `Open ${r.label}`}
            empty={<EmptyState title="No teaching sessions in this period" />}
            maxHeight="36rem"
          />
        </div>
      </Card>
    </div>
  );
};
