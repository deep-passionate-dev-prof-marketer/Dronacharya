import React from "react";
import { axisLabel, fmt, Format, linear, niceTicks } from "./scale";
import { useWidth } from "./useSize";

export interface Column {
  label: string;
  value: number;
  color?: string;
  detail?: string;
}

/** Vertical bars from a common baseline (distributions, bins). 4px rounded data ends, 2px gaps. */
export const ColumnChart: React.FC<{ columns: Column[]; format?: Format; ariaLabel: string; height?: number; valueLabel?: string }> = ({
  columns,
  format = "int",
  ariaLabel,
  height = 180,
  valueLabel = "Sessions",
}) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const m = { l: 36, r: 8, t: 10, b: 30 };
  const hi = Math.max(1, ...columns.map((c) => c.value));
  const ticks = niceTicks(0, hi, 4);
  const y = linear(0, ticks[ticks.length - 1], height - m.b, m.t);
  const band = (width - m.l - m.r) / Math.max(1, columns.length);
  const barW = Math.max(4, Math.min(56, band - 2));
  const rotate = band < 44;
  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-2xs tabular-nums">
              {axisLabel(t, format)}
            </text>
          </g>
        ))}
        {columns.map((c, i) => {
          const x0 = m.l + i * band + (band - barW) / 2;
          const top = y(c.value);
          const h = Math.max(0, height - m.b - top);
          const r = Math.min(4, barW / 2, h);
          return (
            <g
              key={c.label}
              tabIndex={0}
              role="img"
              aria-label={`${c.label}: ${fmt(c.value, format)} ${valueLabel.toLowerCase()}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            >
              {/* Hit area bigger than the bar */}
              <rect x={m.l + i * band} y={m.t} width={band} height={height - m.b - m.t} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x0},${height - m.b} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${height - m.b} Z`}
                  fill={c.color || "var(--color-series-1)"}
                  opacity={active == null || active === i ? 1 : 0.55}
                />
              )}
              <text
                x={x0 + barW / 2}
                y={height - m.b + 14}
                textAnchor={rotate ? "end" : "middle"}
                transform={rotate ? `rotate(-35 ${x0 + barW / 2} ${height - m.b + 14})` : undefined}
                className="fill-ink-3 text-2xs"
              >
                {rotate && i % 2 ? "" : c.label}
              </text>
            </g>
          );
        })}
      </svg>
      {active != null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg border border-line-strong bg-surface-overlay px-2.5 py-1.5 text-xs shadow-overlay"
          style={{ left: Math.min(Math.max(0, m.l + active * band + band / 2 - 70), width - 150), top: 0, minWidth: 140 }}
        >
          <div className="text-ink-3">{columns[active].label}</div>
          <div className="font-bold text-ink tabular-nums">
            {fmt(columns[active].value, format)} {valueLabel.toLowerCase()}
          </div>
          {columns[active].detail && <div className="text-ink-3">{columns[active].detail}</div>}
        </div>
      )}
    </div>
  );
};
