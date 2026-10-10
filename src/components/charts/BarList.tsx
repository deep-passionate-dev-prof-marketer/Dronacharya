import React from "react";
import { fmt, Format } from "./scale";

export interface BarRow {
  key: string;
  label: string;
  detail?: string;
  value: number | null;
  /** Shown after the value, e.g. "42 sessions" */
  meta?: string;
  /** Few sessions: shown faded with a note */
  lowConfidence?: boolean;
}

/**
 * Ranked horizontal bars (one hue). A dashed tick marks the school average and a solid tick the
 * target, so every row reads against both. Rows are buttons when `onSelect` is set (drill down).
 */
export const BarList: React.FC<{
  rows: BarRow[];
  format: Format;
  ariaLabel: string;
  average?: number | null;
  target?: number | null;
  /** Fixed scale maximum (e.g. 100 for scores, 1 for rates) */
  max?: number;
  onSelect?: (row: BarRow) => void;
  selectLabel?: string;
  limit?: number;
  /** Narrow label column for small cards */
  compact?: boolean;
}> = ({ rows, format, ariaLabel, average, target, max, onSelect, selectLabel = "Filter to", limit, compact }) => {
  const [showAll, setShowAll] = React.useState(false);
  const top = Math.max(max ?? 0, ...rows.map((r) => r.value ?? 0), average ?? 0, target ?? 0) || 1;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / top) * 100))}%`;
  const shown = limit && !showAll ? rows.slice(0, limit) : rows;
  // Narrow cards: name and value on one line, the bar full width underneath; wider cards: one row
  const rowLayout = compact ? "flex items-center gap-3" : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @md:flex";
  return (
    <div className="@container">
      <ul aria-label={ariaLabel} className="flex flex-col gap-1">
        {shown.map((r) => {
          const body = (
            <>
              <span className={`min-w-0 text-left ${compact ? "w-28 shrink-0" : "@md:w-36 @md:shrink-0 @2xl:w-52"}`}>
                <span className="block truncate text-xs font-semibold text-ink-2">{r.label}</span>
                {(r.detail || r.lowConfidence) && (
                  <span className="block truncate text-2xs text-ink-3">{[r.detail, r.lowConfidence ? "few sessions" : null].filter(Boolean).join(" · ")}</span>
                )}
              </span>
              <span className={`relative h-5 min-w-12 ${compact ? "flex-1" : "order-last col-span-2 @md:order-none @md:col-span-1 @md:flex-1"}`} aria-hidden="true">
                <span className="absolute inset-y-1.5 left-0 right-0 rounded-full bg-white/[0.04]" />
                {r.value != null && <span className="absolute inset-y-1 left-0 rounded-r-[4px] rounded-l-[2px] bg-series-1" style={{ width: pct(r.value), opacity: r.lowConfidence ? 0.5 : 1 }} />}
                {average != null && <span className="absolute -inset-y-0.5 w-0 border-l border-dashed border-ink-3" style={{ left: pct(average) }} />}
                {target != null && <span className="absolute -inset-y-0.5 w-px bg-ink-2" style={{ left: pct(target) }} />}
              </span>
              <span className={`shrink-0 text-right ${compact ? "w-16" : "@md:w-24"}`}>
                <span className="block text-xs font-bold text-ink tabular-nums">{fmt(r.value, format)}</span>
                {r.meta && <span className="block text-2xs text-ink-3 truncate">{r.meta}</span>}
              </span>
            </>
          );
          return (
            <li key={r.key}>
              {onSelect ? (
                <button
                  onClick={() => onSelect(r)}
                  aria-label={`${selectLabel} ${r.label}: ${fmt(r.value, format)}${r.meta ? `, ${r.meta}` : ""}`}
                  className={`w-full ${rowLayout} rounded-lg px-2 py-1.5 hover:bg-white/[0.04] text-left`}
                >
                  {body}
                </button>
              ) : (
                <div className={`${rowLayout} px-2 py-1.5`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {limit && rows.length > limit && (
        <button onClick={() => setShowAll((s) => !s)} className="mt-2 min-h-9 px-2 text-xs font-semibold text-accent hover:underline">
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
};
