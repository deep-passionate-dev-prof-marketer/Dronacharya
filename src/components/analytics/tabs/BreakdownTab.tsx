import React from "react";
import { GitCompareArrows, X } from "lucide-react";
import { BarList, ChartFrame } from "../../charts";
import { fmt } from "../../charts/scale";
import { Button, Card, CardHeader, Column, DataTable, ErrorState, Field, Select, Skeleton } from "../../ui";
import type { Breakdown, BreakdownRow } from "../analyticsClient";
import { apiParams, useApi } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";
import { DIMENSIONS, dimension, LEARNER_METRIC_KEYS, metric, SESSION_METRIC_KEYS } from "../metrics";

/** Group sessions (or learners) by any dimension and compare every metric. */
export const BreakdownTab: React.FC = () => {
  const { query, setQuery, addFilter, openTeacher } = useAnalytics();
  const dim = dimension(query.dim);
  const keys = dim.level === "learner" ? LEARNER_METRIC_KEYS : SESSION_METRIC_KEYS;
  const metricKey = keys.includes(query.metric) ? query.metric : keys[0];
  const { data, error, loading, reload } = useApi<Breakdown>(`/api/analytics/breakdown?${apiParams(query, { dim: dim.id })}`);
  const [compare, setCompare] = React.useState<string[]>([]);
  React.useEffect(() => setCompare([]), [dim.id]);

  const m = metric(metricKey);
  const rows = React.useMemo(() => {
    const list = [...(data?.rows || [])];
    const v = (r: BreakdownRow) => (metricKey === "teacherQuality" ? r.teacherQuality ?? null : r.metrics[metricKey]);
    // Natural order for ordered dimensions (time, size, grade), otherwise best/worst first
    if (list.some((r) => r.order !== undefined) && ["slot", "weekday", "week", "class_size", "grade", "learner_grade"].includes(dim.id)) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    else list.sort((a, b) => (v(b) ?? -Infinity) - (v(a) ?? -Infinity));
    return list;
  }, [data, metricKey, dim.id]);
  const overall = data?.overall?.[metricKey] ?? null;
  const target = m.target === "quality" ? data?.targets.quality : m.target === "occupancy" ? data?.targets.occupancy : m.target === "attendance" ? data?.targets.attendance : null;
  const drill = (key: string) => {
    if (key === "__small__" || key === "unknown") return;
    if (dim.id === "teacher") return openTeacher(key);
    if (dim.filter) addFilter(dim.filter, key);
  };
  const columns: Column<BreakdownRow>[] = [
    {
      key: "label",
      header: dim.label,
      sticky: true,
      sortValue: (r) => r.label,
      render: (r) => (
        <span className="flex items-center gap-2 min-w-0 max-w-[16rem]">
          {dim.level === "session" && r.key !== "__small__" && (
            <input
              type="checkbox"
              aria-label={`Compare ${r.label}`}
              checked={compare.includes(r.key)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => setCompare((c) => (c.includes(r.key) ? c.filter((x) => x !== r.key) : [...c, r.key].slice(-2)))}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{r.label}</span>
            {r.detail && <span className={`block truncate text-2xs text-ink-3 ${dim.id === "room" ? "font-mono" : ""}`}>{r.detail}</span>}
          </span>
        </span>
      ),
    },
    { key: "n", header: dim.level === "learner" ? "Learners" : "Sessions", align: "right", sortValue: (r) => r.n, render: (r) => fmt(r.n, "int") },
    ...(dim.id === "teacher"
      ? [{ key: "tq", header: "Teacher quality", align: "right" as const, sortValue: (r: BreakdownRow) => r.teacherQuality ?? null, render: (r: BreakdownRow) => (r.detail === "Counselling" ? <span className="text-ink-3" title="Counsellors are judged in the Counselling tab">—</span> : r.teacherQuality == null ? <span className="text-ink-3">Too few</span> : fmt(r.teacherQuality, "score")) }]
      : []),
    ...keys
      .filter((k) => k !== "sessions" && k !== "learners")
      .map((k) => ({
        key: k,
        header: metric(k).label,
        align: "right" as const,
        sortValue: (r: BreakdownRow) => r.metrics[k],
        render: (r: BreakdownRow) => fmt(r.metrics[k], metric(k).format),
      })),
  ];
  const compared = compare.map((k) => rows.find((r) => r.key === k)).filter(Boolean) as BreakdownRow[];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Field label="Group by">
            {(id) => (
              <Select id={id} value={dim.id} onChange={(e) => setQuery({ dim: e.target.value })}>
                <optgroup label="Sessions">
                  {DIMENSIONS.filter((d) => d.level === "session").map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Learners">
                  {DIMENSIONS.filter((d) => d.level === "learner").map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
              </Select>
            )}
          </Field>
          <Field label="Measure">
            {(id) => (
              <Select id={id} value={metricKey} onChange={(e) => setQuery({ metric: e.target.value })}>
                {(dim.id === "teacher" ? ["teacherQuality", ...keys] : keys).map((k) => (
                  <option key={k} value={k}>
                    {metric(k).label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <p className="text-2xs text-ink-3 leading-relaxed lg:max-w-xs lg:pb-2">
            {dim.level === "learner" ? "Learner groups smaller than 3 are combined or hidden to protect privacy." : "Click a bar to filter everything to that group. Tick two rows in the table to compare them."}
          </p>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && loading && <Skeleton className="h-72 w-full" />}
      {data && (
        <>
          <ChartFrame
            title={`${m.label} by ${dim.label.toLowerCase()}`}
            description={
              <>
                {m.definition.split(". ")[0].replace(/\.$/, "")}.
                {overall != null && ` Dashed line: all sessions (${fmt(overall, m.format)}).`}
                {target != null && ` Solid line: target (${fmt(target, m.format)}).`}
              </>
            }
            table={{ columns: [dim.label, dim.level === "learner" ? "Learners" : "Sessions", m.label], rows: rows.map((r) => [r.label, r.n, fmt(metricKey === "teacherQuality" ? r.teacherQuality : r.metrics[metricKey], m.format)]) }}
          >
            {rows.length ? (
              <BarList
                ariaLabel={`${m.label} by ${dim.label}`}
                format={m.format}
                max={m.max}
                average={overall}
                target={target}
                limit={15}
                onSelect={dim.filter || dim.id === "teacher" ? (r) => drill(r.key) : undefined}
                selectLabel={dim.id === "teacher" ? "Open" : "Filter to"}
                rows={rows.map((r) => ({
                  key: r.key,
                  label: r.label,
                  detail: r.detail,
                  value: metricKey === "teacherQuality" ? r.teacherQuality ?? null : r.metrics[metricKey],
                  meta: `${r.n} ${dim.level === "learner" ? (r.n === 1 ? "learner" : "learners") : r.n === 1 ? "session" : "sessions"}`,
                  lowConfidence: r.lowConfidence,
                }))}
              />
            ) : (
              <p className="text-xs text-ink-3">No sessions match these filters.</p>
            )}
          </ChartFrame>

          {compared.length === 2 && <CompareCard a={compared[0]} b={compared[1]} keys={keys} onClose={() => setCompare([])} />}

          <Card padded={false} className="p-4">
            <CardHeader title={`Every measure by ${dim.label.toLowerCase()}`} description="Sort by any column. Faded rows have fewer than 3 sessions (or, for teachers, fewer than 5 classes)." />
            <DataTable
              caption={`All measures by ${dim.label}`}
              rows={rows}
              columns={columns}
              rowKey={(r) => r.key}
              dimRow={(r) => r.lowConfidence}
              onRowClick={dim.filter || dim.id === "teacher" ? (r) => drill(r.key) : undefined}
              rowLabel={(r) => `${dim.id === "teacher" ? "Open" : "Filter to"} ${r.label}`}
              maxHeight="32rem"
            />
          </Card>
        </>
      )}
    </div>
  );
};

/** Two groups side by side: every measure and the difference. */
const CompareCard: React.FC<{ a: BreakdownRow; b: BreakdownRow; keys: string[]; onClose: () => void }> = ({ a, b, keys, onClose }) => (
  <Card>
    <CardHeader
      title={
        <span className="inline-flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4 text-ink-3" />
          {a.label} vs {b.label}
        </span>
      }
      description="Differences are B minus A; green means B is better on that measure."
      actions={
        <Button size="sm" variant="ghost" icon={X} onClick={onClose}>
          Close
        </Button>
      }
    />
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-2xs uppercase tracking-wide text-ink-3">
            <th className="text-left font-semibold py-2 pr-3">Measure</th>
            <th className="text-right font-semibold py-2 px-3">A · {a.label}</th>
            <th className="text-right font-semibold py-2 px-3">B · {b.label}</th>
            <th className="text-right font-semibold py-2 pl-3">Difference</th>
          </tr>
        </thead>
        <tbody>
          {["n", ...keys].map((k) => {
            const def = k === "n" ? { label: "Sessions", format: "int" as const, better: null } : metric(k);
            const va = k === "n" ? a.n : a.metrics[k];
            const vb = k === "n" ? b.n : b.metrics[k];
            const diff = va != null && vb != null ? vb - va : null;
            const good = diff == null || !def.better || Math.abs(diff) < 1e-9 ? null : (diff > 0) === (def.better === "up");
            return (
              <tr key={k} className="border-t border-line">
                <td className="py-2 pr-3 text-ink-2">{def.label}</td>
                <td className="py-2 px-3 text-right tabular-nums text-ink">{fmt(va, def.format)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-ink">{fmt(vb, def.format)}</td>
                <td className={`py-2 pl-3 text-right tabular-nums font-semibold ${good == null ? "text-ink-3" : good ? "text-good" : "text-critical"}`}>
                  {diff == null ? "—" : `${diff > 0 ? "+" : ""}${def.format === "pct" ? `${Math.round(diff * 1000) / 10} pts` : fmt(diff, def.format === "int" ? "int" : "num1")}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Card>
);
