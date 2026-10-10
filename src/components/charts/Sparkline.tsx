import React from "react";

/** Tiny trend line for a stat tile or table row (gaps where there's no data). */
export const Sparkline: React.FC<{ values: Array<number | null>; width?: number; height?: number; color?: string; label?: string }> = ({
  values,
  width = 96,
  height = 28,
  color = "var(--color-series-1)",
  label,
}) => {
  const vals = values.filter((v): v is number => v != null);
  if (vals.length < 2) return <span className="inline-block text-2xs text-ink-3" style={{ width }}>{vals.length ? "" : "No trend yet"}</span>;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = 3;
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
  const y = (v: number) => (hi === lo ? height / 2 : height - pad - ((v - lo) / (hi - lo)) * (height - pad * 2));
  let d = "";
  let lastIdx = -1;
  values.forEach((v, i) => {
    if (v == null) return;
    d += `${lastIdx === i - 1 && d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    lastIdx = i;
  });
  const last = values.length - 1 - [...values].reverse().findIndex((v) => v != null);
  return (
    <svg width={width} height={height} role="img" aria-label={label || "Trend"} className="shrink-0 overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last]!)} r={2.5} fill={color} />
    </svg>
  );
};
