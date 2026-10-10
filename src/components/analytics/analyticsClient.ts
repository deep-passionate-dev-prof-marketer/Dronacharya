/**
 * Class analytics: API types, the query kept in the address bar, and a small fetch hook.
 */
import React from "react";

export type Metrics = Record<string, number | null>;
export interface Option {
  value: string;
  label: string;
}
export interface Meta {
  filters: Record<string, Option[]>;
  dimensions: { session: string[]; learner: string[] };
  components: Record<string, string>;
  weights: { teaching: Record<string, number>; conversation: Record<string, number> };
  targets: Targets;
  hasDemo: boolean;
  freshness: { computedAt: string | null; pending: number };
  viewer: { tz: string; role: string };
}
export interface Targets {
  quality: number;
  occupancy: number;
  attendance: number;
  startDelayMin: number;
}
export interface TrendPoint {
  period: string;
  sessions: number;
  hours: number;
  avgQuality: number | null;
  avgOccupancy: number | null;
  avgDurationMin: number | null;
  avgCounsellingMin: number | null;
  onTimeRate: number | null;
  attendanceRate: number | null;
}
export interface AttentionItem {
  type: "class" | "teacher" | "room";
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "serious" | "warning";
  recordingId?: string;
}
export interface Summary {
  kpis: { current: Metrics; previous: Metrics | null };
  trend: { granularity: "day" | "week"; points: TrendPoint[] };
  mix: Array<{ kind: string; label: string; sessions: number }>;
  distribution: Array<{ from: number; to: number; sessions: number }>;
  attention: AttentionItem[];
  delivery: { scheduled: number; held: number; onTime: number; fullLength: number; deliveryRate: number | null };
  conversion: { prospects: number; converted: number; rate: number | null };
  learnerStatus: Array<{ status: string; seats: number }>;
  demoIncluded: boolean;
  targets: Targets;
}
export interface BreakdownRow {
  key: string;
  label: string;
  detail?: string;
  order?: number;
  n: number;
  lowConfidence: boolean;
  metrics: Metrics;
  teacherQuality?: number | null;
}
export interface Breakdown {
  dim: string;
  learnerLevel: boolean;
  rows: BreakdownRow[];
  overall: Metrics | null;
  targets: Targets;
}
export interface TeacherRow extends BreakdownRow {
  components: Record<string, number | null>;
  spark: Array<number | null>;
  reviews: number;
  observedQuality: number | null;
}
export interface SessionSummary {
  recordingId: string;
  roomSlug: string;
  kind: string;
  title: string;
  teacherId: string | null;
  teacherName: string | null;
  cohort: string | null;
  gradeLevel: number | null;
  startedAt: string;
  durationMin: number;
  contactMin: number | null;
  attendanceTracked: boolean;
  scheduledDurationMin: number | null;
  startDelayMin: number | null;
  plannedSize: number | null;
  enrolled: number;
  attended: number;
  peakLearners: number;
  attentionAvg: number | null;
  learnerQuestions: number;
  polls: number;
  quality: number | null;
  signals: number;
  profile: "teaching" | "conversation";
  breakdown: Array<{ key: string; label: string; value: number | null; weight: number }>;
  reasons: string[];
  demo: boolean;
}
export interface SessionDetail {
  session: SessionSummary | null;
  aborted: boolean;
  facts: Record<string, any>;
  learners: Array<{ learnerId: string; name: string | null; country: string | null; countryName: string; timezone: string | null; gradeLevel: number | null; deviceType: string | null; enrolled: boolean; status: string; minutesPresent: number; attention: number | null }>;
  reviews: Review[];
}
export interface Review {
  id: string;
  recordingId: string;
  auditorId: string;
  auditorName?: string;
  rubric: string;
  scores: Record<string, number>;
  total: number | null;
  note: string | null;
  status: "draft" | "submitted";
  submittedAt: string | null;
}

// ---------------- query in the URL ----------------
export const RANGES = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "ytd", label: "Year to date", days: 0 },
] as const;
export type RangeId = (typeof RANGES)[number]["id"] | "custom";

export interface AnalyticsQuery {
  tab: string;
  range: RangeId;
  from?: string; // yyyy-mm-dd (custom)
  to?: string;
  tz: string;
  filters: Record<string, string[]>;
  dim: string;
  metric: string;
  includeDemo: boolean;
}

const FILTER_KEYS = ["kind", "course", "subject", "teacher", "grade", "cohort", "size", "room", "language", "program", "country", "device", "timezone"];
/** Filters live under "f." in the address bar so they never clash with the app's own parameters (e.g. ?room=). */
const urlKey = (k: string) => `f.${k}`;
const QUERY_KEYS = ["tab", "range", "from", "to", "tz", "dim", "metric", "demo", ...FILTER_KEYS.map(urlKey)];
/** Old names some browsers still report, mapped to today's names. */
const TZ_ALIAS: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Pacific/Truk": "Pacific/Chuuk",
  "Atlantic/Faeroe": "Atlantic/Faroe",
};
export const browserTz = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return TZ_ALIAS[tz] || tz;
  } catch {
    return "UTC";
  }
};

export function readQuery(search = window.location.search): AnalyticsQuery {
  const p = new URLSearchParams(search);
  const filters: Record<string, string[]> = {};
  for (const k of FILTER_KEYS) {
    const v = p.get(urlKey(k));
    if (v) filters[k] = v.split(",").filter(Boolean);
  }
  const range = (p.get("range") as RangeId) || "30d";
  return {
    tab: p.get("tab") || "overview",
    range: [...RANGES.map((r) => r.id), "custom"].includes(range) ? range : "30d",
    from: p.get("from") || undefined,
    to: p.get("to") || undefined,
    tz: p.get("tz") || browserTz(),
    filters,
    dim: p.get("dim") || "teacher",
    metric: p.get("metric") || "avgQuality",
    includeDemo: p.get("demo") !== "0",
  };
}

/** Writes the analytics query into the address bar (replace, not push: filters aren't pages). */
export function writeQuery(q: AnalyticsQuery) {
  const p = new URLSearchParams(window.location.search);
  for (const k of QUERY_KEYS) p.delete(k);
  if (q.tab !== "overview") p.set("tab", q.tab);
  if (q.range !== "30d") p.set("range", q.range);
  if (q.range === "custom") {
    if (q.from) p.set("from", q.from);
    if (q.to) p.set("to", q.to);
  }
  if (q.tz !== browserTz()) p.set("tz", q.tz);
  if (q.dim !== "teacher") p.set("dim", q.dim);
  if (q.metric !== "avgQuality") p.set("metric", q.metric);
  if (!q.includeDemo) p.set("demo", "0");
  for (const [k, v] of Object.entries(q.filters)) if (v.length) p.set(urlKey(k), v.join(","));
  const s = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}

/** Leaving analytics drops its parameters from the address bar. */
export function clearQuery() {
  const p = new URLSearchParams(window.location.search);
  for (const k of QUERY_KEYS) p.delete(k);
  const s = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}

/** The period a query covers, as ISO instants (the end is exclusive). */
export function period(q: AnalyticsQuery, now = new Date()): { from: Date; to: Date; days: number; label: string } {
  const endOfToday = new Date(now);
  endOfToday.setHours(24, 0, 0, 0);
  if (q.range === "custom" && q.from && q.to) {
    const from = new Date(`${q.from}T00:00:00`);
    const to = new Date(`${q.to}T00:00:00`);
    to.setDate(to.getDate() + 1);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 864e5));
    return { from, to, days, label: `${q.from} – ${q.to}` };
  }
  if (q.range === "ytd") {
    const from = new Date(now.getFullYear(), 0, 1);
    const days = Math.max(1, Math.round((endOfToday.getTime() - from.getTime()) / 864e5));
    return { from, to: endOfToday, days, label: "year to date" };
  }
  const r = RANGES.find((x) => x.id === q.range) || RANGES[1];
  const from = new Date(endOfToday.getTime() - r.days * 864e5);
  return { from, to: endOfToday, days: r.days, label: `last ${r.days} days` };
}

export function apiParams(q: AnalyticsQuery, extra: Record<string, string | number | undefined> = {}) {
  const { from, to } = period(q);
  const p = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), tz: q.tz });
  if (!q.includeDemo) p.set("includeDemo", "0");
  for (const [k, v] of Object.entries(q.filters)) if (v.length) p.set(k, v.join(","));
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}

// ---------------- fetching ----------------
const cache = new Map<string, unknown>();

/** GET JSON with a short in-memory cache, cancelled when the query changes. */
export function useApi<T>(url: string | null) {
  const [state, setState] = React.useState<{ data: T | null; error: string | null; loading: boolean }>(() => ({
    data: url ? ((cache.get(url) as T) ?? null) : null,
    error: null,
    loading: Boolean(url && !cache.has(url)),
  }));
  const [nonce, setNonce] = React.useState(0);
  React.useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setState((s) => ({ data: (cache.get(url) as T) ?? s.data, error: null, loading: true }));
    fetch(url, { credentials: "same-origin", signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error || (r.status === 403 ? "Class analytics are for auditors and admins." : `Couldn't load (HTTP ${r.status})`));
        cache.set(url, body);
        if (cache.size > 60) cache.delete(cache.keys().next().value!);
        setState({ data: body as T, error: null, loading: false });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ data: s.data, error: e?.message || "Couldn't load analytics", loading: false }));
      });
    return () => ctrl.abort();
  }, [url, nonce]);
  const reload = React.useCallback(() => {
    if (url) cache.delete(url);
    setNonce((n) => n + 1);
  }, [url]);
  return { ...state, reload };
}

export function clearApiCache() {
  cache.clear();
}

// ---------------- saved views (this browser only) ----------------
const SAVED_KEY = "21k_analytics_views";
export interface SavedView {
  name: string;
  search: string;
}
export function loadSavedViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}
export function storeSavedViews(views: SavedView[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(views.slice(0, 20)));
  } catch {}
}

// ---------------- formatting ----------------
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
export function shortDate(iso: string, tz: string, withTime = true) {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: tz, day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}
export function periodLabel(period: string, granularity: "day" | "week") {
  const d = new Date(`${period}T00:00:00`);
  const s = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return granularity === "week" ? `w/c ${s}` : s;
}
