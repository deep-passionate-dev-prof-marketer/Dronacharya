import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cx } from "./cx";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Plain-text header for screen readers when `header` is an element */
  headerLabel?: string;
  render: (row: T) => React.ReactNode;
  /** Makes the column sortable */
  sortValue?: (row: T) => number | string | null | undefined;
  align?: "left" | "right";
  className?: string;
  /** Stays visible while the table scrolls sideways (first column) */
  sticky?: boolean;
}

/**
 * Sortable table with a sticky header and (optionally) a sticky first column; scrolls sideways
 * inside its card on narrow screens instead of stretching the page.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  rowLabel,
  initialSort,
  empty,
  caption,
  maxHeight,
  dimRow,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible name of the row's action, e.g. "Open session" */
  rowLabel?: (row: T) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  empty?: React.ReactNode;
  caption: string;
  maxHeight?: string;
  dimRow?: (row: T) => boolean;
}) {
  const [sort, setSort] = React.useState(initialSort || null);
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a);
      const y = col.sortValue!(b);
      // Missing values always sink to the bottom
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, columns, sort]);
  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="relative overflow-auto rounded-xl border border-line" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-sm border-separate border-spacing-0">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const Icon = active ? (sort!.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cx(
                    "sticky top-0 z-10 bg-surface-raised border-b border-line px-3 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-3 whitespace-nowrap",
                    c.align === "right" ? "text-right" : "text-left",
                    c.sticky && "left-0 z-20"
                  )}
                >
                  {c.sortValue ? (
                    <button onClick={() => toggle(c.key)} className={cx("inline-flex items-center gap-1 hover:text-ink", c.align === "right" && "flex-row-reverse", active && "text-ink")}>
                      {c.header}
                      <Icon className={cx("w-3 h-3", !active && "opacity-40")} aria-hidden="true" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const clickable = Boolean(onRowClick);
            return (
              <tr
                key={rowKey(row)}
                onClick={clickable ? () => onRowClick!(row) : undefined}
                onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick!(row)) : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                className={cx("group", clickable && "cursor-pointer", dimRow?.(row) && "opacity-60")}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx(
                      "border-b border-line px-3 py-2.5 align-middle text-ink-2 whitespace-nowrap",
                      c.align === "right" && "text-right tabular-nums",
                      clickable && "group-hover:bg-white/[0.03] group-focus-visible:bg-white/[0.05]",
                      c.sticky && "sticky left-0 z-[5] bg-surface",
                      c.className
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
