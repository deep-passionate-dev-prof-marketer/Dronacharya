import React from "react";
import { cx } from "./cx";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

/** Page tabs (WAI-ARIA tabs: arrow keys move, Home/End jump). Scrolls sideways on phones. */
export function Tabs<T extends string>({ items, value, onChange, label, idPrefix = "tab" }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; idPrefix?: string }) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (i: number) => {
    const next = items[(i + items.length) % items.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto no-scrollbar border-b border-line -mx-4 px-4 sm:mx-0 sm:px-0">
      {items.map((t, i) => {
        const active = t.id === value;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            id={`${idPrefix}-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i + 1);
              else if (e.key === "ArrowLeft") move(i - 1);
              else if (e.key === "Home") move(0);
              else if (e.key === "End") move(items.length - 1);
              else return;
              e.preventDefault();
            }}
            className={cx(
              "relative shrink-0 inline-flex items-center gap-2 min-h-11 px-3 text-sm font-semibold transition-colors",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2"
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {t.label}
            {t.count !== undefined && <span className="text-2xs font-mono text-ink-3">{t.count}</span>}
            <span className={cx("absolute inset-x-2 -bottom-px h-0.5 rounded-full", active ? "bg-accent" : "bg-transparent")} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/** A small set of mutually exclusive options (radio group look-alike). */
export function SegmentedControl<T extends string>({ options, value, onChange, label, size = "sm" }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-0.5 rounded-xl bg-surface-sunken border border-line">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-[10px] font-semibold transition-colors whitespace-nowrap",
              size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-3.5 text-sm",
              active ? "bg-white/10 text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
