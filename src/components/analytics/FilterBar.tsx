import React from "react";
import { Check, ChevronDown, ListFilter, Search, X } from "lucide-react";
import { Popover } from "../ui";
import { FILTERS } from "./metrics";
import { optionLabel, useAnalytics } from "./AnalyticsContext";

/**
 * One row of filters above the charts: "Add filter" picks a dimension and values; active filters
 * show as chips (click to edit, × to remove). Every chart and table below follows them.
 */
export const FilterBar: React.FC = () => {
  const { query, setQuery, meta } = useAnalytics();
  const active = Object.entries(query.filters).filter(([, v]) => v.length);
  const setValues = (key: string, values: string[]) => {
    const next = { ...query.filters };
    if (values.length) next[key] = values;
    else delete next[key];
    setQuery({ filters: next });
  };
  const available = FILTERS.filter((f) => (meta?.filters[f.id]?.length || 0) > 0 && !query.filters[f.id]?.length);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filters" role="group">
      {active.map(([key, values]) => {
        const def = FILTERS.find((f) => f.id === key);
        const summary = values.length === 1 ? optionLabel(meta, key, values[0]) : `${values.length} selected`;
        return (
          <div key={key} className="inline-flex items-stretch rounded-xl border border-accent/40 bg-accent/10 text-xs">
            <Popover
              trigger={({ toggle, ref, open, id }) => (
                <button ref={ref} onClick={toggle} aria-expanded={open} aria-controls={id} className="inline-flex items-center gap-1.5 min-h-9 pl-3 pr-2 text-ink max-w-[16rem]">
                  <span className="text-ink-3">{def?.label}:</span>
                  <span className="font-semibold truncate">{summary}</span>
                  <ChevronDown className="w-3 h-3 shrink-0 text-ink-3" />
                </button>
              )}
            >
              {(close) => <ValuePicker filterKey={key} values={values} onChange={(v) => setValues(key, v)} onDone={close} />}
            </Popover>
            <button onClick={() => setValues(key, [])} aria-label={`Remove ${def?.label} filter`} className="px-2 min-h-9 border-l border-accent/30 text-ink-3 hover:text-ink rounded-r-xl">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
      {available.length > 0 && (
        <Popover
          trigger={({ toggle, ref, open, id }) => (
            <button
              ref={ref}
              onClick={toggle}
              aria-expanded={open}
              aria-controls={id}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl border border-dashed border-line-strong text-xs font-semibold text-ink-2 hover:text-ink hover:border-ink-3"
            >
              <ListFilter className="w-3.5 h-3.5" />
              Add filter
            </button>
          )}
        >
          {(close) => <AddFilter options={available} onPick={(key, values) => (setValues(key, values), close())} />}
        </Popover>
      )}
      {active.length > 0 && (
        <button onClick={() => setQuery({ filters: {} })} className="min-h-9 px-2 text-xs font-semibold text-ink-3 hover:text-ink">
          Clear all
        </button>
      )}
    </div>
  );
};

const AddFilter: React.FC<{ options: Array<{ id: string; label: string }>; onPick: (key: string, values: string[]) => void }> = ({ options, onPick }) => {
  const [key, setKey] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<string[]>([]);
  if (!key)
    return (
      <ul className="max-h-80 overflow-y-auto" aria-label="Filter by">
        {options.map((o) => (
          <li key={o.id}>
            <button onClick={() => setKey(o.id)} className="w-full text-left min-h-10 px-3 rounded-lg text-sm text-ink-2 hover:bg-white/5 hover:text-ink">
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    );
  return <ValuePicker filterKey={key} values={values} onChange={setValues} onDone={() => onPick(key, values)} doneLabel="Apply" />;
};

const ValuePicker: React.FC<{ filterKey: string; values: string[]; onChange: (v: string[]) => void; onDone: () => void; doneLabel?: string }> = ({ filterKey, values, onChange, onDone, doneLabel = "Done" }) => {
  const { meta } = useAnalytics();
  const [q, setQ] = React.useState("");
  const options = (meta?.filters[filterKey] || []).filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const label = FILTERS.find((f) => f.id === filterKey)?.label || filterKey;
  return (
    <div className="flex flex-col gap-2 w-72 max-w-full">
      <div className="px-1 text-2xs font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      {(meta?.filters[filterKey]?.length || 0) > 8 && (
        <label className="flex items-center gap-2 px-2 min-h-9 rounded-lg bg-surface-sunken border border-line">
          <Search className="w-3.5 h-3.5 text-ink-3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}`} aria-label={`Search ${label}`} className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none" />
        </label>
      )}
      <ul className="max-h-64 overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label={label}>
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <li key={o.value} role="option" aria-selected={on}>
              <button onClick={() => toggle(o.value)} className="w-full flex items-center gap-2 text-left min-h-9 px-2 rounded-lg text-sm text-ink-2 hover:bg-white/5">
                <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${on ? "bg-accent border-accent text-white" : "border-line-strong"}`}>{on && <Check className="w-3 h-3" />}</span>
                <span className="truncate">{o.label}</span>
              </button>
            </li>
          );
        })}
        {!options.length && <li className="px-2 py-3 text-xs text-ink-3">Nothing matches.</li>}
      </ul>
      <div className="flex justify-between gap-2 pt-1 border-t border-line">
        <button onClick={() => onChange([])} className="min-h-9 px-2 text-xs font-semibold text-ink-3 hover:text-ink">
          Clear
        </button>
        <button onClick={onDone} className="min-h-9 px-3 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-strong">
          {doneLabel}
        </button>
      </div>
    </div>
  );
};
