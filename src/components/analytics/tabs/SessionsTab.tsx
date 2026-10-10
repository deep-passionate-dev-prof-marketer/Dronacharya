import React from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Search } from "lucide-react";
import { fmt } from "../../charts/scale";
import { Badge, Button, Card, CardHeader, Column, DataTable, EmptyState, ErrorState, ScoreMeter, Select, Skeleton } from "../../ui";
import type { SessionSummary } from "../analyticsClient";
import { apiParams, shortDate, useApi } from "../analyticsClient";
import { useAnalytics } from "../AnalyticsContext";

/** Every session in the period, with its score and the reasons behind it; opens the session drawer. */
export const SessionsTab: React.FC = () => {
  const { query, openSession, meta } = useAnalytics();
  const [q, setQ] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("recent");
  const [page, setPage] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => setPage(0), [search, sort, query]);
  const size = 25;
  const list = useApi<{ total: number; sessions: SessionSummary[] }>(`/api/analytics/sessions?${apiParams(query, { q: search, sort, page, pageSize: size })}`);
  const queue = useApi<{ lowest: SessionSummary[]; random: SessionSummary[]; unreviewed: number }>(`/api/reviews/queue?${apiParams(query)}`);
  const target = meta?.targets.quality ?? 75;
  const kind = (k: string) => meta?.filters.kind?.find((o) => o.value === k)?.label || k;

  const columns: Column<SessionSummary>[] = [
    { key: "when", header: "When", sticky: true, render: (s) => <span className="text-ink tabular-nums">{shortDate(s.startedAt, query.tz)}</span> },
    {
      key: "title",
      header: "Session",
      render: (s) => (
        <span className="block max-w-[18rem]">
          <span className="block truncate font-semibold text-ink">{s.title}</span>
          <span className="block truncate text-2xs text-ink-3">
            {kind(s.kind)} · {s.teacherName || "Unassigned"}
            {s.cohort ? ` · ${s.cohort}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "size",
      header: "Learners",
      align: "right",
      render: (s) => (s.attendanceTracked ? `${s.attended}${s.plannedSize ? ` / ${s.plannedSize}` : ""}` : <span className="text-ink-3" title="No join data received">Unknown</span>),
    },
    { key: "dur", header: "Length", align: "right", render: (s) => fmt(s.durationMin, "min") },
    { key: "delay", header: "Start", align: "right", render: (s) => (s.startDelayMin == null ? <span className="text-ink-3">Unscheduled</span> : s.startDelayMin <= 0.5 ? "On time" : `${fmt(s.startDelayMin, "num1")} min late`) },
    { key: "q", header: "Quality", render: (s) => <ScoreMeter compact score={s.quality} target={target} label="Quality" /> },
    { key: "why", header: "Why", render: (s) => <span className="block max-w-[16rem] truncate text-xs text-ink-3">{s.reasons[0] || (s.quality != null ? "On track" : "")}</span> },
  ];
  const pages = Math.max(1, Math.ceil((list.data?.total || 0) / size));

  return (
    <div className="flex flex-col gap-4">
      {queue.data && (queue.data.lowest.length > 0 || queue.data.random.length > 0) && (
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-ink-3" />
                Suggested for review
              </span>
            }
            description={`${queue.data.unreviewed} teaching sessions in this period have no auditor review. The lowest-scored come first, plus a few at random so reviews stay representative.`}
          />
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...queue.data.lowest.map((s) => ({ s, why: "Low score" })), ...queue.data.random.map((s) => ({ s, why: "Random sample" }))].map(({ s, why }) => (
              <li key={s.recordingId}>
                <button onClick={() => openSession(s.recordingId)} className="w-full text-left rounded-xl border border-line px-3 py-2.5 hover:bg-white/[0.03] flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-2xs text-ink-3">
                      {shortDate(s.startedAt, query.tz)} · {s.teacherName || "Unassigned"}
                    </span>
                  </span>
                  <Badge tone={why === "Low score" ? "warning" : "neutral"}>{why}</Badge>
                  <span className="text-sm font-bold tabular-nums text-ink w-9 text-right">{s.quality == null ? "—" : Math.round(s.quality)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card padded={false} className="p-4">
        <CardHeader
          title="Sessions"
          description={list.data ? `${fmt(list.data.total, "int")} sessions match.` : undefined}
          actions={
            <>
              <label className="flex items-center gap-2 px-3 min-h-9 rounded-lg bg-surface-sunken border border-line w-56 max-w-full">
                <Search className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, teacher, cohort" aria-label="Search sessions" className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-3 outline-none" />
              </label>
              <Select aria-label="Sort sessions" value={sort} onChange={(e) => setSort(e.target.value)} className="!min-h-9 !w-auto !text-xs">
                <option value="recent">Most recent</option>
                <option value="quality_asc">Lowest quality</option>
                <option value="quality_desc">Highest quality</option>
              </Select>
            </>
          }
        />
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className={list.loading ? "opacity-60 transition-opacity" : ""}>
            <DataTable
              caption="Sessions"
              rows={list.data.sessions}
              columns={columns}
              rowKey={(s) => s.recordingId}
              onRowClick={(s) => openSession(s.recordingId)}
              rowLabel={(s) => `Open ${s.title}, ${shortDate(s.startedAt, query.tz)}`}
              empty={<EmptyState title="No sessions match">Try a longer period or fewer filters.</EmptyState>}
            />
            {pages > 1 && (
              <nav className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-3" aria-label="Pages">
                <span>
                  Page {page + 1} of {pages}
                </span>
                <span className="flex gap-2">
                  <Button size="sm" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </span>
              </nav>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
