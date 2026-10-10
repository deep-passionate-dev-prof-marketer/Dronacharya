import React from "react";
import { axisLabel, fmt, Format, linear, niceTicks } from "./scale";
import { useWidth } from "./useSize";

export interface LinePoint {
  label: string;
  value: number | null;
  /** Extra tooltip line, e.g. "12 sessions" */
  detail?: string;
}
export interface RefLine {
  value: number;
  label: string;
  /** target = solid thin; average/previous = dashed */
  kind: "target" | "average";
}

/**
 * One series over time. One y-axis, gaps where there's no data, reference lines for the target or
 * the average, and a crosshair tooltip (mouse, touch and arrow keys).
 */
export const LineChart: React.FC<{
  points: LinePoint[];
  format: Format;
  ariaLabel: string;
  color?: string;
  refLines?: RefLine[];
  domain?: [number, number];
  height?: number;
}> = ({ points, format, ariaLabel, color = "var(--color-series-1)", refLines = [], domain, height = 200 }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const m = { l: 40, r: 12, t: 12, b: 26 };
  const vals = points.map((p) => p.value).filter((v): v is number => v != null);
  const lo = domain ? domain[0] : Math.min(...vals, ...refLines.map((r) => r.value), format === "pct" ? 0 : Infinity);
  const hi = domain ? domain[1] : Math.max(...vals, ...refLines.map((r) => r.value));
  const ticks = vals.length ? niceTicks(Math.min(lo, hi), hi, 4) : [0, 1];
  const y = linear(ticks[0], ticks[ticks.length - 1], height - m.b, m.t);
  const n = points.length;
  const x = (i: number) => (n <= 1 ? (m.l + width - m.r) / 2 : m.l + (i / (n - 1)) * (width - m.l - m.r));
  // Break the line where there's no data
  const segments: string[] = [];
  let cur = "";
  points.forEach((p, i) => {
    if (p.value == null) {
      if (cur) segments.push(cur);
      cur = "";
    } else cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  if (cur) segments.push(cur);
  const isolated = points.map((p, i) => p.value != null && points[i - 1]?.value == null && points[i + 1]?.value == null);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((width - m.l) / 72))));
  const pick = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const i = Math.round(((px - m.l) / Math.max(1, width - m.l - m.r)) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };
  const a = active != null ? points[active] : null;
  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
        onMouseMove={(e) => pick(e.clientX, e.currentTarget)}
        onTouchMove={(e) => pick(e.touches[0].clientX, e.currentTarget)}
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((i) => Math.min(n - 1, (i ?? -1) + 1));
          else if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? n) - 1));
          else return;
          e.preventDefault();
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-2xs tabular-nums">
              {axisLabel(t, format)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-ink-3 text-2xs">
              {i === n - 1 || (n - 1 - i) >= labelEvery * 0.6 ? p.label : ""}
            </text>
          ) : null
        )}
        {refLines.map((r) => (
          <g key={r.label}>
            <line x1={m.l} x2={width - m.r} y1={y(r.value)} y2={y(r.value)} stroke={r.kind === "target" ? "var(--color-ink-2)" : "var(--color-ink-3)"} strokeWidth={1} strokeDasharray={r.kind === "target" ? undefined : "4 4"} />
            <text x={width - m.r} y={y(r.value) - 5} textAnchor="end" className="fill-ink-2 text-2xs">
              {r.label}
            </text>
          </g>
        ))}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) => (isolated[i] ? <circle key={i} cx={x(i)} cy={y(p.value!)} r={4} fill={color} stroke="var(--color-surface)" strokeWidth={2} /> : null))}
        {a && active != null && (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={m.t} y2={height - m.b} stroke="var(--color-line-strong)" />
            {a.value != null && <circle cx={x(active)} cy={y(a.value)} r={5} fill={color} stroke="var(--color-surface)" strokeWidth={2} />}
          </g>
        )}
      </svg>
      {a && active != null && (
        <div
          role="status"
          className="pointer-events-none absolute top-1 z-10 rounded-lg border border-line-strong bg-surface-overlay px-2.5 py-1.5 text-xs shadow-overlay"
          style={{ left: Math.min(Math.max(0, x(active) - 70), width - 150), minWidth: 140 }}
        >
          <div className="text-ink-3">{a.label}</div>
          <div className="font-bold text-ink tabular-nums">{fmt(a.value, format)}</div>
          {a.detail && <div className="text-ink-3">{a.detail}</div>}
        </div>
      )}
    </div>
  );
};
