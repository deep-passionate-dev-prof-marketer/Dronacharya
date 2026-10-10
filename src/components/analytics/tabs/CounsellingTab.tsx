import React from "react";
import { BarList, ChartFrame, LegendItem, LineChart } from "../../charts";
import { fmt } from "../../charts/scale";
import { Card, ErrorState, Skeleton } from "../../ui";
import type { Breakdown, Summary } from "../analyticsClient";
import { apiParams, periodLabel, plural, useApi } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";

/**
 * Counselling and admission sessions (the admissions team's sales conversations): how long the
 * conversation lasted, how many families didn't show up, and how many went on to enrol.
 */
export const CounsellingTab: React.FC<{ summary: Summary }> = ({ summary }) => {
  const { query } = useAnalytics();
  const sales = { ...query, filters: { ...query.filters, kind: ["counselling", "admission"] } };
  const byPerson = useApi<Breakdown>(`/api/analytics/breakdown?${apiParams(sales, { dim: "teacher" })}`);
  const byDay = useApi<Breakdown>(`/api/analytics/breakdown?${apiParams(sales, { dim: "weekday" })}`);
  const k = summary.kpis.current;
  const pts = summary.trend.points;
  const tiles = [
    { label: "Counselling sessions", value: fmt(k.counsellingSessions, "int") },
    { label: "Average conversation", value: fmt(k.avgCounsellingMin, "min"), sub: `median ${fmt(k.medianCounsellingMin, "min")}` },
    { label: "Families who didn't join", value: fmt(k.counsellingNoShowRate, "pct") },
    { label: "Enrolled within 30 days", value: fmt(summary.conversion.rate, "pct"), sub: `${summary.conversion.converted} of ${summary.conversion.prospects} families` },
  ];
  const people = [...(byPerson.data?.rows || [])].sort((a, b) => b.n - a.n);
  const days = [...(byDay.data?.rows || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div className="xl:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="!p-4">
            <h3 className="text-xs font-semibold text-ink-3">{t.label}</h3>
            <div className="mt-1 text-2xl font-bold text-ink tabular-nums">{t.value}</div>
            {t.sub && <div className="text-2xs text-ink-3">{t.sub}</div>}
          </Card>
        ))}
      </div>
      <ChartFrame
        className="xl:col-span-7"
        title="Conversation length by counsellor"
        description="Minutes the counsellor and the family were talking (from join and leave times)."
        table={{ columns: ["Counsellor", "Sessions", "Avg length", "No-shows"], rows: people.map((r) => [r.label, r.n, fmt(r.metrics.avgCounsellingMin, "min"), fmt(r.metrics.counsellingNoShowRate, "pct")]) }}
      >
        {byPerson.error ? (
          <ErrorState message={byPerson.error} onRetry={byPerson.reload} />
        ) : !byPerson.data ? (
          <Skeleton className="h-40 w-full" />
        ) : people.length ? (
          <BarList
            ariaLabel="Average counselling length by counsellor"
            format="min"
            average={byPerson.data.overall?.avgCounsellingMin ?? null}
            rows={people.map((r) => ({ key: r.key, label: r.label, detail: `${fmt(r.metrics.counsellingNoShowRate, "pct")} no-shows`, value: r.metrics.avgCounsellingMin, meta: plural(r.n, "session"), lowConfidence: r.lowConfidence }))}
          />
        ) : (
          <p className="text-xs text-ink-3">No counselling sessions in this period.</p>
        )}
      </ChartFrame>
      <ChartFrame
        className="xl:col-span-5"
        title="No-shows by weekday"
        description={`Counselling sessions families didn't join, by weekday in ${query.tz}.`}
        table={{ columns: ["Day", "Sessions", "No-shows"], rows: days.map((r) => [r.label, r.n, fmt(r.metrics.counsellingNoShowRate, "pct")]) }}
      >
        {byDay.data ? (
          <BarList ariaLabel="No-show rate by weekday" format="pct" max={1} rows={days.map((r) => ({ key: r.key, label: r.label, value: r.metrics.counsellingNoShowRate, meta: plural(r.n, "session"), lowConfidence: r.lowConfidence }))} />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </ChartFrame>
      <ChartFrame
        className="xl:col-span-12"
        title="Average conversation length over time"
        description={`Per ${summary.trend.granularity}.`}
        table={{ columns: ["Period", "Avg length"], rows: pts.map((p) => [periodLabel(p.period, summary.trend.granularity), fmt(p.avgCounsellingMin, "min")]) }}
        legend={<LegendItem color="var(--color-series-3)" label="Average conversation (min)" kind="line" />}
      >
        <LineChart
          points={pts.map((p) => ({ label: periodLabel(p.period, summary.trend.granularity), value: p.avgCounsellingMin }))}
          format="min"
          color="var(--color-series-3)"
          ariaLabel="Average counselling length over time"
          refLines={k.avgCounsellingMin != null ? [{ value: k.avgCounsellingMin, label: `Average ${fmt(k.avgCounsellingMin, "min")}`, kind: "average" }] : []}
        />
      </ChartFrame>
    </div>
  );
};
