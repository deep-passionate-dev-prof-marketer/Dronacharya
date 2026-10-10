import React from "react";
import { BarList, ChartFrame, ColumnChart, Heatmap } from "../../charts";
import { fmt } from "../../charts/scale";
import { ErrorState, SegmentedControl, Skeleton } from "../../ui";
import type { Breakdown } from "../analyticsClient";
import { apiParams, plural, useApi } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type HeatMetric = "sessions" | "avgQuality" | "avgOccupancy";

/** When classes happen and how well they start and run, in the chosen timezone. */
export const ScheduleTab: React.FC = () => {
  const { query } = useAnalytics();
  const heat = useApi<{ cells: Array<{ weekday: number; hour: number; sessions: number; avgQuality: number | null; avgOccupancy: number | null }>; startDelay: Array<{ label: string; sessions: number }>; adherence: Array<{ label: string; sessions: number }>; tz: string }>(
    `/api/analytics/heatmap?${apiParams(query)}`
  );
  const slots = useApi<Breakdown>(`/api/analytics/breakdown?${apiParams(query, { dim: "slot" })}`);
  const [hm, setHm] = React.useState<HeatMetric>("sessions");
  if (heat.error) return <ErrorState message={heat.error} onRetry={heat.reload} />;
  if (!heat.data) return <Skeleton className="h-96 w-full" />;
  const h = heat.data;
  const fmtOf = hm === "sessions" ? "int" : hm === "avgQuality" ? "score" : "pct";
  const slotRows = [...(slots.data?.rows || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <ChartFrame
        className="xl:col-span-12"
        title="When classes run"
        description={`Weekday and hour in ${query.tz}. Lighter means more.`}
        actions={
          <SegmentedControl
            label="Heatmap measure"
            value={hm}
            onChange={setHm}
            options={[
              { value: "sessions", label: "Sessions" },
              { value: "avgQuality", label: "Quality" },
              { value: "avgOccupancy", label: "Occupancy" },
            ]}
          />
        }
        table={{
          columns: ["Day", "Hour", "Sessions", "Quality", "Occupancy"],
          rows: [...h.cells].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour).map((c) => [DAYS[c.weekday], `${String(c.hour).padStart(2, "0")}:00`, c.sessions, fmt(c.avgQuality, "score"), fmt(c.avgOccupancy, "pct")]),
        }}
      >
        <Heatmap
          ariaLabel="Sessions by weekday and hour"
          format={fmtOf}
          valueLabel={hm === "sessions" ? "sessions" : hm === "avgQuality" ? "quality" : "occupancy"}
          cells={h.cells.map((c) => ({ weekday: c.weekday, hour: c.hour, value: c[hm], detail: hm === "sessions" ? `quality ${fmt(c.avgQuality, "score")}` : `${c.sessions} sessions` }))}
        />
      </ChartFrame>

      <ChartFrame
        className="xl:col-span-6"
        title="How late classes start"
        description="Scheduled classes by minutes between the slot and the host starting."
        table={{ columns: ["Start", "Sessions"], rows: h.startDelay.map((b) => [b.label, b.sessions]) }}
      >
        <ColumnChart ariaLabel="Sessions by start delay" columns={h.startDelay.map((b, i) => ({ label: b.label, value: b.sessions, color: i >= 2 ? "var(--color-seq-4)" : "var(--color-series-1)" }))} />
      </ChartFrame>

      <ChartFrame
        className="xl:col-span-6"
        title="Actual vs scheduled length"
        description="Scheduled sessions by how much of their planned time they ran. 85–110% counts as on schedule."
        table={{ columns: ["Ran", "Sessions"], rows: h.adherence.map((b) => [b.label, b.sessions]) }}
      >
        <ColumnChart ariaLabel="Sessions by share of scheduled time" columns={h.adherence.map((b) => ({ label: b.label, value: b.sessions, color: b.label === "85–110%" ? "var(--color-series-1)" : "var(--color-seq-4)" }))} />
      </ChartFrame>

      <ChartFrame
        className="xl:col-span-12"
        title="Occupancy by time slot"
        description={`30-minute slots in ${query.tz}. Dashed line: all sessions.`}
        table={{ columns: ["Slot", "Sessions", "Occupancy", "Quality"], rows: slotRows.map((r) => [r.label, r.n, fmt(r.metrics.avgOccupancy, "pct"), fmt(r.metrics.avgQuality, "score")]) }}
      >
        {slots.data ? (
          <BarList
            ariaLabel="Occupancy by time slot"
            format="pct"
            max={1}
            average={slots.data.overall?.avgOccupancy ?? null}
            target={slots.data.targets.occupancy}
            rows={slotRows.map((r) => ({ key: r.key, label: r.label, value: r.metrics.avgOccupancy, meta: plural(r.n, "session"), lowConfidence: r.lowConfidence }))}
            limit={12}
          />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </ChartFrame>
    </div>
  );
};
