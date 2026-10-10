import React from "react";
import { Table2, BarChart3 } from "lucide-react";
import { Card, CardHeader } from "../ui/Card";

export interface TableSpec {
  columns: string[];
  rows: Array<Array<string | number>>;
}

/**
 * A chart card: title, one-line description, the chart, and a "View as table" toggle so every
 * chart can be read without seeing colour or shape.
 */
export const ChartFrame: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  table: TableSpec;
  legend?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}> = ({ title, description, actions, table, legend, children, footer, className }) => {
  const [asTable, setAsTable] = React.useState(false);
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={description}
        actions={
          <>
            {actions}
            <button
              onClick={() => setAsTable((t) => !t)}
              className="inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-lg text-xs font-semibold text-ink-3 hover:text-ink hover:bg-white/5"
              aria-pressed={asTable}
            >
              {asTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
              {asTable ? "View as chart" : "View as table"}
            </button>
          </>
        }
      />
      {legend && !asTable && <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">{legend}</div>}
      {asTable ? (
        <div className="overflow-auto max-h-80 rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={c} scope="col" className={`sticky top-0 bg-surface-raised px-3 py-2 font-semibold text-ink-3 ${i ? "text-right" : "text-left"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-line">
                  {r.map((v, i) => (
                    <td key={i} className={`px-3 py-1.5 text-ink-2 ${i ? "text-right tabular-nums" : ""}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
      {footer && <div className="mt-3 text-2xs text-ink-3 leading-relaxed">{footer}</div>}
    </Card>
  );
};

/** Legend entry: a mark (line or swatch) and its name in text ink (never the series colour). */
export const LegendItem: React.FC<{ color: string; label: string; kind?: "line" | "dash" | "swatch" }> = ({ color, label, kind = "swatch" }) => (
  <span className="inline-flex items-center gap-1.5">
    {kind === "swatch" ? (
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} aria-hidden="true" />
    ) : (
      <svg width="16" height="8" aria-hidden="true">
        <line x1="0" x2="16" y1="4" y2="4" stroke={color} strokeWidth="2" strokeDasharray={kind === "dash" ? "3 3" : undefined} />
      </svg>
    )}
    {label}
  </span>
);
