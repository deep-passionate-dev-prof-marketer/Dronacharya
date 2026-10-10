import React from "react";
import { fmt, Format } from "./scale";

const SEQ = ["var(--color-seq-1)", "var(--color-seq-2)", "var(--color-seq-3)", "var(--color-seq-4)", "var(--color-seq-5)", "var(--color-seq-6)", "var(--color-seq-7)"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface HeatCell {
  weekday: number; // 0 = Mon
  hour: number;
  value: number | null;
  detail?: string;
}

/**
 * Weekday × hour grid in one blue ramp (light = more on this dark surface). Empty hours are
 * blank; only hours with any classes are shown. Scrolls sideways on phones, first column sticky.
 */
export const Heatmap: React.FC<{ cells: HeatCell[]; format: Format; ariaLabel: string; valueLabel: string }> = ({ cells, format, ariaLabel, valueLabel }) => {
  const [active, setActive] = React.useState<HeatCell | null>(null);
  const hours = [...new Set(cells.filter((c) => c.value != null).map((c) => c.hour))].sort((a, b) => a - b);
  if (!hours.length) return <p className="text-xs text-ink-3">No classes in this period.</p>;
  const span = Array.from({ length: hours[hours.length - 1] - hours[0] + 1 }, (_, i) => hours[0] + i);
  const vals = cells.map((c) => c.value).filter((v): v is number => v != null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const color = (v: number) => SEQ[hi === lo ? SEQ.length - 1 : Math.min(SEQ.length - 1, Math.floor(((v - lo) / (hi - lo)) * SEQ.length))];
  const at = new Map(cells.map((c) => [`${c.weekday}:${c.hour}`, c]));
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <table role="grid" aria-label={ariaLabel} className="border-separate w-full" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="sticky left-0 bg-surface" />
              {span.map((h) => (
                <th key={h} scope="col" className="text-2xs font-normal text-ink-3 min-w-7">
                  {h % 3 === 0 || span.length <= 12 ? String(h).padStart(2, "0") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d, w) => (
              <tr key={d}>
                <th scope="row" className="sticky left-0 bg-surface pr-2 text-left text-2xs font-semibold text-ink-3">
                  {d}
                </th>
                {span.map((h) => {
                  const c = at.get(`${w}:${h}`);
                  const v = c?.value ?? null;
                  return (
                    <td key={h} className="p-0">
                      <button
                        type="button"
                        aria-label={`${d} ${String(h).padStart(2, "0")}:00: ${v == null ? "no classes" : `${fmt(v, format)} ${valueLabel}`}`}
                        onMouseEnter={() => setActive(c || { weekday: w, hour: h, value: null })}
                        onFocus={() => setActive(c || { weekday: w, hour: h, value: null })}
                        onMouseLeave={() => setActive(null)}
                        onBlur={() => setActive(null)}
                        className="block w-full min-w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        style={{ background: v == null ? "var(--color-surface-sunken)" : color(v) }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-2xs text-ink-3">
        <span className="flex items-center gap-2" aria-hidden="true">
          <span>{fmt(lo, format)}</span>
          <span className="flex">
            {SEQ.map((c) => (
              <span key={c} className="w-5 h-2.5 first:rounded-l last:rounded-r" style={{ background: c }} />
            ))}
          </span>
          <span>{fmt(hi, format)}</span>
          <span className="ml-1">{valueLabel}</span>
        </span>
        <span role="status" className="min-h-4 text-ink-2">
          {active ? `${DAYS[active.weekday]} ${String(active.hour).padStart(2, "0")}:00 · ${active.value == null ? "no classes" : `${fmt(active.value, format)} ${valueLabel}`}${active.detail ? ` · ${active.detail}` : ""}` : ""}
        </span>
      </div>
    </div>
  );
};
