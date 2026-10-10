import React from "react";
import { LegendItem } from "./ChartFrame";

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Parts of a whole as one bar (2px surface gaps), with a labelled legend underneath. */
export const StackedBar: React.FC<{ segments: Segment[]; ariaLabel: string; unit?: string }> = ({ segments, ariaLabel, unit = "sessions" }) => {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const [active, setActive] = React.useState<string | null>(null);
  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="flex h-6 w-full gap-[2px] rounded-md overflow-hidden">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              title={`${s.label}: ${s.value} ${unit} (${Math.round((s.value / total) * 100)}%)`}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
              className="h-full first:rounded-l-md last:rounded-r-md transition-opacity"
              style={{ width: `${(s.value / total) * 100}%`, background: s.color, opacity: active && active !== s.key ? 0.5 : 1, minWidth: 3 }}
            />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 text-xs" onMouseEnter={() => setActive(s.key)} onMouseLeave={() => setActive(null)}>
            <span className="text-ink-2 min-w-0 truncate">
              <LegendItem color={s.color} label={s.label} />
            </span>
            <span className="tabular-nums text-ink shrink-0">
              {s.value} <span className="text-ink-3">· {Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
