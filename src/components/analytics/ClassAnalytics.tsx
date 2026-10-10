import React from "react";
import { BookOpenCheck, CalendarRange, Clock3, Download, Bookmark, Settings2, Trash2, X } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { Badge, Button, ErrorState, Page, PageHeader, Popover, SegmentedControl, Select, Tabs } from "../ui";
import type { TabItem } from "../ui";
import { AnalyticsContext, AnalyticsCtx } from "./AnalyticsContext";
import {
  AnalyticsQuery,
  apiParams,
  browserTz,
  clearApiCache,
  clearQuery,
  loadSavedViews,
  Meta,
  period,
  RANGES,
  RangeId,
  readQuery,
  SavedView,
  storeSavedViews,
  Summary,
  useApi,
  writeQuery,
} from "./analyticsClient";
import { FilterBar } from "./FilterBar";
import { KpiRow } from "./KpiRow";
import { OverviewTab } from "./tabs/OverviewTab";
import { BreakdownTab } from "./tabs/BreakdownTab";
import { TeachersTab } from "./tabs/TeachersTab";
import { ScheduleTab } from "./tabs/ScheduleTab";
import { LearnersTab } from "./tabs/LearnersTab";
import { CounsellingTab } from "./tabs/CounsellingTab";
import { SessionsTab } from "./tabs/SessionsTab";
import { SessionDrawer } from "./SessionDrawer";
import { TeacherDrawer } from "./TeacherDrawer";
import { SettingsDrawer } from "./SettingsDrawer";
import { DefinitionsDrawer } from "./DefinitionsDrawer";

const EngagementInsightsPanel = React.lazy(() => import("../engagement/EngagementInsightsPanel").then((m) => ({ default: m.EngagementInsightsPanel })));

const TABS: TabItem<string>[] = [
  { id: "overview", label: "Overview" },
  { id: "breakdown", label: "Breakdown" },
  { id: "teachers", label: "Teachers" },
  { id: "schedule", label: "Schedule" },
  { id: "learners", label: "Learners & geography" },
  { id: "counselling", label: "Counselling" },
  { id: "sessions", label: "Sessions" },
  { id: "live", label: "Live engagement" },
];

/**
 * Class analytics for auditors and admins: quality, occupancy, duration, punctuality and
 * attendance, sliced by teacher, room, time slot, timezone, course, cohort, grade, class size,
 * country and more. Every filter and tab lives in the address bar, so a view can be bookmarked
 * or shared with another auditor.
 */
export const ClassAnalytics: React.FC = () => {
  const { authenticatedUser, setActiveView } = useClassroom();
  const isAdmin = authenticatedUser?.role === "admin";
  const [query, setQueryState] = React.useState<AnalyticsQuery>(() => readQuery());
  const setQuery = React.useCallback((patch: Partial<AnalyticsQuery>) => setQueryState((q) => ({ ...q, ...patch })), []);
  React.useEffect(() => writeQuery(query), [query]);
  React.useEffect(() => () => clearQuery(), []);

  const [metaNonce, setMetaNonce] = React.useState(0);
  const meta = useApi<Meta>(`/api/analytics/meta?tz=${encodeURIComponent(query.tz)}&n=${metaNonce}`);
  const summary = useApi<Summary>(`/api/analytics/summary?${apiParams(query)}`);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [teacherId, setTeacherId] = React.useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [defsOpen, setDefsOpen] = React.useState(false);

  const ctx: AnalyticsCtx = React.useMemo(
    () => ({
      query,
      setQuery,
      meta: meta.data,
      isAdmin,
      addFilter: (key, value) =>
        setQueryState((q) => {
          const cur = q.filters[key] || [];
          return cur.includes(value) ? q : { ...q, filters: { ...q.filters, [key]: [...cur, value] } };
        }),
      openSession: (id) => {
        setTeacherId(null);
        setSessionId(id);
      },
      openTeacher: (id) => {
        setSessionId(null);
        setTeacherId(id);
      },
    }),
    [query, setQuery, meta.data, isAdmin]
  );

  const p = period(query);
  const exportView = query.tab === "breakdown" ? "breakdown" : "sessions";
  const exportHref = `/api/analytics/export.csv?${apiParams(query, { view: exportView, dim: exportView === "breakdown" ? query.dim : undefined })}`;
  const tzOptions = React.useMemo(() => {
    const set = new Set([browserTz(), "UTC", query.tz, ...(meta.data?.filters.timezone || []).map((o) => o.value), "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York"]);
    return [...set].filter(Boolean).sort();
  }, [meta.data, query.tz]);

  return (
    <AnalyticsContext.Provider value={ctx}>
      <Page wide>
        <PageHeader
          eyebrow="Auditors and admins only"
          title="Class analytics"
          description="How classes are going: quality, occupancy, length, punctuality and attendance, by teacher, room, time, cohort, class size and place."
          actions={
            <>
              <Button size="sm" variant="ghost" icon={BookOpenCheck} onClick={() => setDefsOpen(true)}>
                How we measure
              </Button>
              <SavedViews />
              <a href={exportHref} className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg border border-line-strong bg-white/5 hover:bg-white/10 text-xs font-semibold text-ink" download>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </a>
              {isAdmin && meta.data && (
                <Button size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>
                  Targets & weights
                </Button>
              )}
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl<RangeId>
              label="Period"
              value={query.range}
              onChange={(range) => setQuery({ range })}
              options={[...RANGES.map((r) => ({ value: r.id as RangeId, label: r.label })), { value: "custom", label: "Custom" }]}
            />
            {query.range === "custom" && <CustomRange />}
            <label className="inline-flex items-center gap-1.5 text-xs text-ink-3">
              <Clock3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Timezone</span>
              <Select aria-label="Timezone for time slots and days" value={query.tz} onChange={(e) => setQuery({ tz: e.target.value })} className="!min-h-9 !w-auto !text-xs !py-0">
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz === browserTz() ? `${tz} (yours)` : tz}
                  </option>
                ))}
              </Select>
            </label>
            <span className="text-xs text-ink-3 inline-flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
              {p.from.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – {new Date(p.to.getTime() - 1).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <FilterBar />
          <Freshness meta={meta.data} />
        </PageHeader>

        {meta.data?.hasDemo && (
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs ${query.includeDemo ? "border-warning/30 bg-warning/10" : "border-line bg-surface"}`} role="note">
            <span className="text-ink-2">
              <Badge tone="warning" className="mr-2">
                Demo data
              </Badge>
              {query.includeDemo ? "This page includes generated demo history (development only). Remove it with npm run demo:analytics -- --remove." : "Demo history is hidden: only real classes are shown."}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setQuery({ includeDemo: !query.includeDemo })}>
              {query.includeDemo ? "Show real classes only" : "Include demo history"}
            </Button>
          </div>
        )}

        {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
        <KpiRow summary={summary.data} loading={summary.loading} periodDays={p.days} />

        <div className="flex flex-col gap-4">
          <Tabs label="Analytics sections" items={TABS} value={query.tab} onChange={(tab) => setQuery({ tab })} idPrefix="analytics" />
          <div id="analytics-panel" role="tabpanel" aria-labelledby={`analytics-${query.tab}`}>
            {query.tab === "overview" && summary.data && <OverviewTab summary={summary.data} />}
            {query.tab === "breakdown" && <BreakdownTab />}
            {query.tab === "teachers" && <TeachersTab />}
            {query.tab === "schedule" && <ScheduleTab />}
            {query.tab === "learners" && summary.data && <LearnersTab summary={summary.data} />}
            {query.tab === "counselling" && summary.data && <CounsellingTab summary={summary.data} />}
            {query.tab === "sessions" && <SessionsTab />}
            {query.tab === "live" && (
              <React.Suspense fallback={null}>
                <EngagementInsightsPanel />
              </React.Suspense>
            )}
          </div>
        </div>
      </Page>

      <SessionDrawer
        recordingId={sessionId}
        onClose={() => setSessionId(null)}
        viewerId={authenticatedUser?.id || ""}
        onOpenRecording={(id) => {
          const params = new URLSearchParams(window.location.search);
          params.set("recording", id);
          window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
          setActiveView("recordings");
        }}
      />
      <TeacherDrawer teacherId={teacherId} onClose={() => setTeacherId(null)} />
      <DefinitionsDrawer open={defsOpen} onClose={() => setDefsOpen(false)} meta={meta.data} />
      {isAdmin && meta.data && (
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          meta={meta.data}
          onSaved={() => {
            clearApiCache();
            setMetaNonce((n) => n + 1);
            summary.reload();
          }}
        />
      )}
    </AnalyticsContext.Provider>
  );
};

const Freshness: React.FC<{ meta: Meta | null }> = ({ meta }) => {
  if (!meta) return null;
  const at = meta.freshness.computedAt ? new Date(meta.freshness.computedAt) : null;
  return (
    <p className="text-2xs text-ink-3">
      {at ? `Class data updated ${at.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : "No finished classes yet."} Finished classes are added a few seconds after they end and refreshed 10 minutes later.
      {meta.freshness.pending > 0 && ` ${meta.freshness.pending} finished ${meta.freshness.pending === 1 ? "class is" : "classes are"} still being processed.`}
    </p>
  );
};

const CustomRange: React.FC = () => {
  const ctx = React.useContext(AnalyticsContext)!;
  const today = new Date().toISOString().slice(0, 10);
  const from = ctx.query.from || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const to = ctx.query.to || today;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
      <label className="sr-only" htmlFor="an-from">
        From
      </label>
      <input id="an-from" type="date" max={to} value={from} onChange={(e) => ctx.setQuery({ from: e.target.value, to })} className="min-h-9 rounded-lg bg-surface-sunken border border-line-strong px-2 text-ink" />
      <span aria-hidden="true">to</span>
      <label className="sr-only" htmlFor="an-to">
        To
      </label>
      <input id="an-to" type="date" min={from} max={today} value={to} onChange={(e) => ctx.setQuery({ from, to: e.target.value })} className="min-h-9 rounded-lg bg-surface-sunken border border-line-strong px-2 text-ink" />
    </span>
  );
};

/** Bookmarks of the current filters and tab, kept in this browser. */
const SavedViews: React.FC = () => {
  const ctx = React.useContext(AnalyticsContext)!;
  const [views, setViews] = React.useState<SavedView[]>(() => loadSavedViews());
  const [name, setName] = React.useState("");
  const save = () => {
    const n = name.trim();
    if (!n) return;
    const next = [{ name: n, search: window.location.search }, ...views.filter((v) => v.name !== n)];
    setViews(next);
    storeSavedViews(next);
    setName("");
  };
  const remove = (n: string) => {
    const next = views.filter((v) => v.name !== n);
    setViews(next);
    storeSavedViews(next);
  };
  return (
    <Popover
      align="end"
      trigger={({ toggle, ref, open, id }) => (
        <Button ref={ref} size="sm" variant="ghost" icon={Bookmark} onClick={toggle} aria-expanded={open} aria-controls={id}>
          Saved views
        </Button>
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-2 w-72 max-w-full">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this view" aria-label="Name for the current view" maxLength={60} className="flex-1 min-w-0 min-h-9 rounded-lg bg-surface-sunken border border-line-strong px-2 text-sm text-ink placeholder:text-ink-3" />
            <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </form>
          {views.length ? (
            <ul className="flex flex-col">
              {views.map((v) => (
                <li key={v.name} className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      ctx.setQuery(readQuery(v.search));
                      close();
                    }}
                    className="flex-1 min-w-0 text-left min-h-9 px-2 rounded-lg text-sm text-ink-2 hover:bg-white/5 truncate"
                  >
                    {v.name}
                  </button>
                  <button onClick={() => remove(v.name)} aria-label={`Delete saved view ${v.name}`} className="h-9 w-9 rounded-lg text-ink-3 hover:text-critical hover:bg-white/5 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-xs text-ink-3">Save the current filters and tab to come back to them. Saved in this browser only.</p>
          )}
          <button onClick={close} className="sr-only">
            <X /> Close
          </button>
        </div>
      )}
    </Popover>
  );
};
