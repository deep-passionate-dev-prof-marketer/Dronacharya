import React from "react";
import { AlertTriangle, ChevronRight, DoorOpen, GraduationCap, OctagonAlert, PlayCircle } from "lucide-react";
import { BarList, ChartFrame, ColumnChart, LegendItem, LineChart, StackedBar } from "../../charts";
import { fmt } from "../../charts/scale";
import { Card, CardHeader, EmptyState } from "../../ui";
import type { Summary } from "../analyticsClient";
import { periodLabel } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";
import { KIND_COLOR } from "../metrics";

const SEVERITY = {
  critical: { icon: OctagonAlert, text: "text-critical", label: "Critical" },
  serious: { icon: AlertTriangle, text: "text-serious", label: "Serious" },
  warning: { icon: AlertTriangle, text: "text-warning", label: "Watch" },
};
const TYPE_ICON = { class: PlayCircle, teacher: GraduationCap, room: DoorOpen };

export const OverviewTab: React.FC<{ summary: Summary }> = ({ summary }) => {
  const { openSession, openTeacher, addFilter } = useAnalytics();
  const pts = summary.trend.points;
  const t = summary.targets;
  const cur = summary.kpis.current;
  const scored = summary.distribution.reduce((a, b) => a + b.sessions, 0);
  const below = Math.round((cur.belowTargetShare ?? 0) * scored);
  const d = summary.delivery;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <ChartFrame
        className="xl:col-span-6"
        title="Class quality over time"
        description={`Average quality of scored sessions per ${summary.trend.granularity}. Target ${t.quality}.`}
        table={{ columns: ["Period", "Quality", "Sessions"], rows: pts.map((p) => [periodLabel(p.period, summary.trend.granularity), fmt(p.avgQuality, "score"), p.sessions]) }}
        legend={
          <>
            <LegendItem color="var(--color-series-1)" label="Average quality" kind="line" />
            <LegendItem color="var(--color-ink-2)" label="Target" kind="line" />
          </>
        }
      >
        <LineChart
          points={pts.map((p) => ({ label: periodLabel(p.period, summary.trend.granularity), value: p.avgQuality, detail: `${p.sessions} sessions` }))}
          format="score"
          ariaLabel={`Class quality by ${summary.trend.granularity}; average ${fmt(cur.avgQuality, "score")}`}
          refLines={[{ value: t.quality, label: `Target ${t.quality}`, kind: "target" }]}
        />
      </ChartFrame>

      <ChartFrame
        className="xl:col-span-6"
        title="Occupancy over time"
        description={`Learners who came ÷ seats planned, per ${summary.trend.granularity}. Target ${Math.round(t.occupancy * 100)}%.`}
        table={{ columns: ["Period", "Occupancy", "Attendance"], rows: pts.map((p) => [periodLabel(p.period, summary.trend.granularity), fmt(p.avgOccupancy, "pct"), fmt(p.attendanceRate, "pct")]) }}
        legend={
          <>
            <LegendItem color="var(--color-series-1)" label="Occupancy" kind="line" />
            <LegendItem color="var(--color-ink-2)" label="Target" kind="line" />
          </>
        }
      >
        <LineChart
          points={pts.map((p) => ({ label: periodLabel(p.period, summary.trend.granularity), value: p.avgOccupancy, detail: `Attendance ${fmt(p.attendanceRate, "pct")}` }))}
          format="pct"
          ariaLabel={`Occupancy by ${summary.trend.granularity}; average ${fmt(cur.avgOccupancy, "pct")}`}
          refLines={[{ value: t.occupancy, label: `Target ${Math.round(t.occupancy * 100)}%`, kind: "target" }]}
          domain={[0, 1]}
        />
      </ChartFrame>

      <Card className="xl:col-span-7">
        <CardHeader title="Needs attention" description="Classes well below target, teachers whose recent classes got worse, and rooms running empty." />
        {summary.attention.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {summary.attention.map((a) => {
              const s = SEVERITY[a.severity];
              const Icon = TYPE_ICON[a.type];
              const SevIcon = s.icon;
              const open = () => (a.type === "class" ? openSession(a.recordingId!) : a.type === "teacher" ? openTeacher(a.id) : addFilter("room", a.id));
              return (
                <li key={`${a.type}:${a.id}`}>
                  <button onClick={open} className="w-full flex items-start gap-3 py-2.5 text-left rounded-lg hover:bg-white/[0.03] px-1">
                    <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${s.text}`} aria-label={s.label} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <Icon className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden="true" />
                        <span className="line-clamp-2 sm:truncate">{a.title}</span>
                      </span>
                      <span className="block text-xs text-ink-3 mt-0.5">{a.detail}</span>
                    </span>
                    <span className={`shrink-0 text-2xs font-semibold ${s.text}`}>{s.label}</span>
                    <ChevronRight className="w-4 h-4 text-ink-3 shrink-0 mt-0.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState compact title="Nothing needs attention">
            Every scored class is at or near target and no teacher is trending down.
          </EmptyState>
        )}
      </Card>

      <div className="xl:col-span-5 flex flex-col gap-4">
        <Card>
          <CardHeader title="Scheduled classes delivered" description="Classes scheduled in this period that have already started (counselling desks and drop-in rooms aren't scheduled)." />
          {d.scheduled ? (
            <BarList
              compact
              ariaLabel="Delivery funnel"
              format="int"
              max={d.scheduled}
              rows={[
                { key: "scheduled", label: "Scheduled", value: d.scheduled, meta: "100%" },
                { key: "held", label: "Held", value: d.held, meta: fmt(d.held / d.scheduled, "pct") },
                { key: "onTime", label: "Started on time", value: d.onTime, meta: fmt(d.onTime / d.scheduled, "pct") },
                { key: "full", label: "Ran full length", value: d.fullLength, meta: fmt(d.fullLength / d.scheduled, "pct") },
              ]}
            />
          ) : (
            <p className="text-xs text-ink-3">No scheduled classes in this period.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Families who enrolled after counselling" description="Seen in a counselling, admission or demo session, then attended a regular class within 30 days." />
          {summary.conversion.prospects ? (
            <div className="flex items-end gap-4">
              <span className="text-3xl font-bold text-ink tabular-nums">{fmt(summary.conversion.rate, "pct")}</span>
              <span className="text-xs text-ink-3 pb-1">
                {summary.conversion.converted} of {summary.conversion.prospects} families
              </span>
            </div>
          ) : (
            <p className="text-xs text-ink-3">No counselling or demo sessions in this period.</p>
          )}
        </Card>
      </div>

      <ChartFrame
        className="xl:col-span-6"
        title="What kind of sessions ran"
        description="Sessions by type."
        table={{ columns: ["Type", "Sessions"], rows: summary.mix.map((m) => [m.label, m.sessions]) }}
      >
        <StackedBar
          ariaLabel="Sessions by type"
          segments={summary.mix.map((m) => ({ key: m.kind, label: m.label, value: m.sessions, color: KIND_COLOR[m.kind] || "var(--color-series-8)" }))}
        />
      </ChartFrame>

      <ChartFrame
        className="xl:col-span-6"
        title="How classes scored"
        description={`${scored} scored sessions; ${below} (${scored ? Math.round((below / scored) * 100) : 0}%) below the target of ${t.quality}.`}
        table={{ columns: ["Quality", "Sessions"], rows: summary.distribution.map((b) => [`${b.from}–${b.to}`, b.sessions]) }}
      >
        <ColumnChart
          ariaLabel="Number of sessions by quality score"
          columns={summary.distribution.map((b) => ({ label: `${b.from}–${b.to}`, value: b.sessions, color: b.to <= t.quality ? "var(--color-seq-4)" : "var(--color-series-1)", detail: b.to <= t.quality ? "Below target" : undefined }))}
        />
      </ChartFrame>
    </div>
  );
};
