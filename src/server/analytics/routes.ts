/**
 * Class analytics API (auditors and admins only).
 * Loads session facts for the requested range, applies filters, and aggregates in memory
 * (aggregate.ts). Descriptive fields (cohort, course, grade…) come live from `classes`, so renaming
 * a cohort needs no recompute. Results are cached briefly and the cache is cleared whenever new
 * facts are written.
 */
import crypto from "crypto";
import express from "express";
import { and, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { requireAuth } from "../auth/session";
import { auditInsert, kvLoad, kvUpsert, persist } from "../db/kv";
import {
  averageTeacherQuality,
  breakdown,
  DEFAULT_TARGETS,
  Dimension,
  FactRow,
  heatmap,
  isLearnerDimension,
  kindMix,
  LEARNER_DIMENSIONS,
  LearnerRow,
  needsAttention,
  qualityDistribution,
  SALES_KINDS,
  schoolAttention,
  scoreFacts,
  ScoredFact,
  SESSION_DIMENSIONS,
  sessionMetrics,
  sessionSummary,
  sessionTitle,
  sizeOf,
  Targets,
  trend,
} from "./aggregate";
import { COMPONENT_LABEL, ComponentKey, DEFAULT_PROFILES, profileFor, qualityScore, sanitizeWeights, teacherQuality, WeightProfiles } from "./quality";
import { computeSessionFacts, onFactsWritten } from "./facts";
import { analyticsLabels } from "../../services/analyticsLabels";
import { validTimezone } from "./geo";

// ---------------- settings (weights, targets) ----------------
let settings: { weights: WeightProfiles; targets: Targets } | null = null;
async function getSettings() {
  if (!settings) {
    const rows = await kvLoad<any>("analytics_settings");
    const saved = rows.find((r) => r.key === "settings")?.value || {};
    settings = {
      weights: {
        teaching: sanitizeWeights(saved.weights?.teaching, DEFAULT_PROFILES.teaching),
        conversation: sanitizeWeights(saved.weights?.conversation, DEFAULT_PROFILES.conversation),
      },
      targets: { ...DEFAULT_TARGETS, ...(saved.targets || {}) },
    };
  }
  return settings;
}

// ---------------- cache ----------------
const cache = new Map<string, { at: number; data: unknown }>();
export function clearAnalyticsCache() {
  cache.clear();
}
onFactsWritten(clearAnalyticsCache);
async function cached<T>(key: string, build: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.data as T;
  const data = await build();
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return data;
}

// ---------------- query parsing ----------------
const FILTER_KEYS = ["kind", "course", "subject", "teacher", "grade", "cohort", "size", "room", "language", "program", "country", "device", "timezone"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const validTz = (tz: unknown) => validTimezone(tz) || "UTC";

export interface Query {
  from: Date;
  to: Date;
  tz: string;
  includeDemo: boolean;
  filters: Partial<Record<FilterKey, string[]>>;
}

export function parseQuery(q: Record<string, unknown>): Query {
  const now = Date.now();
  const to = q.to ? new Date(String(q.to)) : new Date(now);
  const from = q.from ? new Date(String(q.from)) : new Date(to.getTime() - 30 * 864e5);
  const safeTo = Number.isFinite(to.getTime()) ? to : new Date(now);
  let safeFrom = Number.isFinite(from.getTime()) ? from : new Date(safeTo.getTime() - 30 * 864e5);
  if (safeTo.getTime() - safeFrom.getTime() > 400 * 864e5) safeFrom = new Date(safeTo.getTime() - 400 * 864e5);
  const filters: Query["filters"] = {};
  for (const k of FILTER_KEYS) {
    const v = q[k];
    if (v === undefined || v === "") continue;
    const list = String(v)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (list.length) filters[k] = list;
  }
  return { from: safeFrom, to: safeTo, tz: validTz(q.tz), includeDemo: q.includeDemo !== "0", filters };
}

// ---------------- loading ----------------
function toFact(row: any, cls: any): FactRow {
  const f = row as FactRow;
  return {
    ...f,
    // Live class details (renaming a cohort or course needs no recompute)
    cohort: cls?.cohort ?? f.cohort,
    course: cls?.course ?? f.course,
    subject: cls?.subject ?? f.subject,
    topic: cls?.topic ?? f.topic,
    gradeLevel: cls?.gradeLevel ?? f.gradeLevel,
    program: cls?.program ?? f.program,
    language: cls?.language ?? f.language,
    startedAt: new Date(row.startedAt),
    endedAt: new Date(row.endedAt),
    states: (row.states || {}) as Record<string, number>,
    components: row.components || {},
  };
}

async function loadFacts(from: Date, to: Date, includeDemo: boolean): Promise<FactRow[]> {
  const db: any = await getDb();
  const conds = [gte(schema.sessionFacts.startedAt, from), lt(schema.sessionFacts.startedAt, to)];
  if (!includeDemo) conds.push(eq(schema.sessionFacts.demo, false));
  const rows = await db
    .select({ f: schema.sessionFacts, c: schema.classes })
    .from(schema.sessionFacts)
    .leftJoin(schema.classes, eq(schema.classes.id, schema.sessionFacts.classId))
    .where(and(...conds));
  return rows.map((r: any) => toFact(r.f, r.c));
}

async function loadLearners(recordingIds: string[]): Promise<LearnerRow[]> {
  if (!recordingIds.length) return [];
  const db: any = await getDb();
  const out: LearnerRow[] = [];
  for (let i = 0; i < recordingIds.length; i += 800) {
    const part = await db.select().from(schema.sessionLearners).where(inArray(schema.sessionLearners.recordingId, recordingIds.slice(i, i + 800)));
    out.push(...part);
  }
  return out;
}

function cohortLabel(f: FactRow) {
  return f.cohort || (f.program && f.gradeLevel != null ? `${analyticsLabels.program(f.program)} · Grade ${f.gradeLevel}` : null);
}

/** Applies session and learner filters. Learner filters keep sessions with at least one matching learner. */
export function applyFilters(facts: FactRow[], learners: LearnerRow[], filters: Query["filters"]) {
  const has = (k: FilterKey, v: string | null | undefined) => !filters[k] || (v != null && filters[k]!.includes(v));
  let out = facts.filter(
    (f) =>
      has("kind", f.kind) &&
      // Same keys as the breakdown rows, so clicking a row filters to exactly that group
      has("course", f.course || f.subject || "unknown") &&
      has("subject", f.subject || "unknown") &&
      has("teacher", f.teacherId || "unknown") &&
      has("grade", f.gradeLevel == null ? "unknown" : String(f.gradeLevel)) &&
      has("cohort", cohortLabel(f) || "unknown") &&
      has("size", sizeOf(f)) &&
      has("room", f.roomSlug) &&
      has("language", f.language || "unknown") &&
      has("program", f.program || "unknown")
  );
  let ls = learners;
  const learnerFilter = filters.country || filters.device || filters.timezone;
  if (learnerFilter) {
    ls = learners.filter(
      (l) =>
        (!filters.country || filters.country.includes(l.country || "unknown")) &&
        (!filters.device || filters.device.includes(l.deviceType || "unknown")) &&
        (!filters.timezone || filters.timezone.includes(l.timezone || "unknown"))
    );
    const keep = new Set(ls.map((l) => l.recordingId));
    out = out.filter((f) => keep.has(f.recordingId));
  }
  const ids = new Set(out.map((f) => f.recordingId));
  return { facts: out, learners: ls.filter((l) => ids.has(l.recordingId)) };
}

/** Everything a request needs: scored facts and learner rows for the range (and the previous period). */
async function dataset(query: Query, withPrevious = false) {
  const { weights, targets } = await getSettings();
  const span = query.to.getTime() - query.from.getTime();
  const loadFrom = withPrevious ? new Date(query.from.getTime() - span) : query.from;
  const all = await loadFacts(loadFrom, query.to, query.includeDemo);
  const allLearners = await loadLearners(all.map((f) => f.recordingId));
  // One attention anchor for the whole period so scores are comparable
  const anchor = schoolAttention(all);
  const scored = scoreFacts(all, weights, anchor);
  const cur = applyFilters(
    scored.filter((f) => f.startedAt >= query.from),
    allLearners,
    query.filters
  );
  const prev = withPrevious
    ? applyFilters(
        scored.filter((f) => f.startedAt < query.from),
        allLearners,
        query.filters
      )
    : null;
  return { facts: cur.facts as ScoredFact[], learners: cur.learners, prev: prev && { facts: prev.facts as ScoredFact[], learners: prev.learners }, weights, targets, anchor };
}

// ---------------- delivery & conversion ----------------
async function delivery(query: Query, facts: ScoredFact[], targets: Targets) {
  const db: any = await getDb();
  const scheduled = await db
    .select()
    .from(schema.classes)
    .where(and(gte(schema.classes.scheduledStart, query.from), lt(schema.classes.scheduledStart, query.to), lte(schema.classes.scheduledStart, new Date())));
  const rows = scheduled.filter((c: any) => (query.includeDemo || !String(c.roomSlug).startsWith("demo-")) && (!query.filters.kind || query.filters.kind.includes(c.kind)) && (!query.filters.teacher || query.filters.teacher.includes(c.teacherId)));
  const byRoom = new Map<string, ScoredFact[]>();
  for (const f of facts) byRoom.set(f.roomSlug, [...(byRoom.get(f.roomSlug) || []), f]);
  let held = 0;
  let onTime = 0;
  let fullLength = 0;
  for (const c of rows) {
    const start = new Date(c.scheduledStart).getTime();
    const s = (byRoom.get(c.roomSlug) || []).find((f) => Math.abs(f.startedAt.getTime() - start) <= 120 * 60_000);
    if (!s) continue;
    held++;
    if (s.startDelayMin !== null && s.startDelayMin <= targets.startDelayMin) onTime++;
    if (s.durationMin >= 0.85 * (c.durationMin || 60)) fullLength++;
  }
  return { scheduled: rows.length, held, onTime, fullLength, deliveryRate: rows.length ? Math.round((held / rows.length) * 1000) / 1000 : null };
}

/** Families seen in a counselling/admission/demo session who joined a regular class within 30 days. */
async function conversion(query: Query, facts: ScoredFact[], learners: LearnerRow[]) {
  const funnel = facts.filter((f) => SALES_KINDS.has(f.kind) || f.kind === "demo");
  if (!funnel.length) return { prospects: 0, converted: 0, rate: null as number | null };
  const firstSeen = new Map<string, number>();
  const funnelIds = new Set(funnel.map((f) => f.recordingId));
  const startOf = new Map(funnel.map((f) => [f.recordingId, f.startedAt.getTime()]));
  for (const l of learners) {
    if (!funnelIds.has(l.recordingId) || l.status === "absent") continue;
    const t = startOf.get(l.recordingId)!;
    if (!firstSeen.has(l.learnerId) || t < firstSeen.get(l.learnerId)!) firstSeen.set(l.learnerId, t);
  }
  if (!firstSeen.size) return { prospects: 0, converted: 0, rate: null };
  const db: any = await getDb();
  const later = await db
    .select({ learnerId: schema.sessionLearners.learnerId, status: schema.sessionLearners.status, startedAt: schema.sessionFacts.startedAt })
    .from(schema.sessionLearners)
    .innerJoin(schema.sessionFacts, eq(schema.sessionFacts.recordingId, schema.sessionLearners.recordingId))
    .where(and(inArray(schema.sessionLearners.learnerId, [...firstSeen.keys()]), eq(schema.sessionFacts.kind, "enrolled"), gte(schema.sessionFacts.startedAt, query.from), lte(schema.sessionFacts.startedAt, new Date(query.to.getTime() + 30 * 864e5))));
  const converted = new Set<string>();
  for (const r of later) {
    const t0 = firstSeen.get(r.learnerId)!;
    const t = new Date(r.startedAt).getTime();
    if (r.status !== "absent" && t > t0 && t - t0 <= 30 * 864e5) converted.add(r.learnerId);
  }
  return { prospects: firstSeen.size, converted: converted.size, rate: Math.round((converted.size / firstSeen.size) * 1000) / 1000 };
}

function kpis(facts: ScoredFact[], learners: LearnerRow[], targets: Targets) {
  const m = sessionMetrics(facts, targets);
  return { ...m, avgTeacherQuality: averageTeacherQuality(facts), learnersReached: new Set(learners.filter((l) => l.status !== "absent").map((l) => l.learnerId)).size };
}

const sizeOrder = (label: string) => (label === "No learners" ? 0 : label === "Unknown" ? 99 : parseInt(label.slice(2)) || 0);

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formulas and quote
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function setupAnalyticsRoutes(app: express.Express) {
  const staff = requireAuth("auditor", "admin");

  app.get("/api/analytics/meta", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const db: any = await getDb();
    const { weights, targets } = await getSettings();
    const facts = await loadFacts(new Date(Date.now() - 400 * 864e5), new Date(Date.now() + 864e5), true);
    const learners = await loadLearners(facts.map((f) => f.recordingId));
    const distinct = <T,>(xs: T[]) => [...new Set(xs.filter((x) => x !== null && x !== undefined && x !== ""))];
    const teachers = new Map<string, string>();
    for (const f of facts) if (f.teacherId) teachers.set(f.teacherId, f.teacherName || f.teacherId);
    const rooms = new Map<string, string>();
    for (const f of facts) rooms.set(f.roomSlug, `${sessionTitle(f)} · ${f.roomSlug}`);
    const [freshness] = await db.select({ at: sql<string>`max(${schema.sessionFacts.computedAt})` }).from(schema.sessionFacts);
    const pending = await db.execute(sql`select count(*)::int as n from recordings r left join session_facts f on f.recording_id = r.id where r.ended_at is not null and f.recording_id is null`);
    res.json({
      filters: {
        kind: distinct(facts.map((f) => f.kind)).map((k) => ({ value: k, label: analyticsLabels.kind(k) })),
        course: distinct(facts.map((f) => f.course || f.subject)).sort().map((v) => ({ value: v, label: v })),
        subject: distinct(facts.map((f) => f.subject)).sort().map((v) => ({ value: v, label: v })),
        teacher: [...teachers.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })),
        grade: distinct(facts.map((f) => f.gradeLevel)).sort((a: any, b: any) => a - b).map((g) => ({ value: String(g), label: `Grade ${g}` })),
        cohort: distinct(facts.map(cohortLabel)).sort().map((v) => ({ value: v!, label: v! })),
        size: distinct(facts.map(sizeOf))
          .sort((a, b) => sizeOrder(a) - sizeOrder(b))
          .map((v) => ({ value: v, label: v })),
        room: [...rooms.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })),
        language: distinct(facts.map((f) => f.language)).map((v) => ({ value: v!, label: analyticsLabels.language(v) })),
        program: distinct(facts.map((f) => f.program)).map((v) => ({ value: v!, label: analyticsLabels.program(v) })),
        country: distinct(learners.map((l) => l.country)).map((v) => ({ value: v!, label: analyticsLabels.country(v) })).sort((a, b) => a.label.localeCompare(b.label)),
        device: distinct(learners.map((l) => l.deviceType)).map((v) => ({ value: v!, label: v![0].toUpperCase() + v!.slice(1) })),
        timezone: distinct(learners.map((l) => l.timezone)).sort().map((v) => ({ value: v!, label: v! })),
      },
      dimensions: { session: SESSION_DIMENSIONS, learner: LEARNER_DIMENSIONS },
      components: COMPONENT_LABEL,
      weights,
      targets,
      hasDemo: facts.some((f) => f.demo),
      freshness: { computedAt: freshness?.at || null, pending: Number(pending?.rows?.[0]?.n || 0) },
      viewer: { tz: query.tz, role: req.user!.role },
    });
  });

  app.get("/api/analytics/summary", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const data = await cached(`summary:${JSON.stringify(query)}`, async () => {
      const d = await dataset(query, true);
      const current = kpis(d.facts, d.learners, d.targets);
      const previous = d.prev ? kpis(d.prev.facts, d.prev.learners, d.targets) : null;
      return {
        kpis: { current, previous },
        trend: trend(d.facts, query.tz, query.from, query.to, d.targets),
        mix: kindMix(d.facts, analyticsLabels),
        distribution: qualityDistribution(d.facts),
        attention: needsAttention(d.facts, d.targets, analyticsLabels),
        delivery: await delivery(query, d.facts, d.targets),
        conversion: await conversion(query, d.facts, d.learners),
        learnerStatus: ["present", "late", "left_early", "absent"].map((status) => ({ status, seats: d.learners.filter((l) => l.status === status).length })),
        demoIncluded: d.facts.some((f) => f.demo),
        targets: d.targets,
      };
    });
    res.json(data);
  });

  app.get("/api/analytics/breakdown", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const dim = String(req.query.dim || "teacher") as Dimension;
    if (![...SESSION_DIMENSIONS, ...LEARNER_DIMENSIONS].includes(dim as any)) return res.status(400).json({ error: "Unknown dimension" });
    const data = await cached(`breakdown:${dim}:${JSON.stringify(query)}`, async () => {
      const d = await dataset(query);
      const rows = breakdown(d.facts, d.learners, dim, query.tz, d.targets, analyticsLabels);
      return { dim, learnerLevel: isLearnerDimension(dim), rows, overall: isLearnerDimension(dim) ? null : sessionMetrics(d.facts, d.targets), targets: d.targets };
    });
    res.json(data);
  });

  app.get("/api/analytics/teachers", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const data = await cached(`teachers:${JSON.stringify(query)}`, async () => {
      const d = await dataset(query);
      const teaching = d.facts.filter((f) => !SALES_KINDS.has(f.kind));
      const rows = breakdown(teaching, d.learners, "teacher", query.tz, d.targets, analyticsLabels);
      const db: any = await getDb();
      const ids = rows.map((r) => r.key).filter((k) => k !== "unknown");
      const reviews = ids.length
        ? await db.select().from(schema.classReviews).where(and(inArray(schema.classReviews.teacherId, ids), eq(schema.classReviews.status, "submitted"), gte(schema.classReviews.createdAt, query.from)))
        : [];
      const periods = trend([], query.tz, query.from, query.to, d.targets);
      return {
        periods: periods.points.map((p) => p.period),
        granularity: periods.granularity,
        teachers: rows
          .map((r) => {
            const sessions = teaching.filter((f) => (f.teacherId || "unknown") === r.key).sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
            const comp: Record<string, number | null> = {};
            for (const key of Object.keys(COMPONENT_LABEL) as ComponentKey[]) {
              const vals = sessions
                .map((f) => qualityScore(f.components, d.weights[profileFor(f.kind)], d.anchor).breakdown.find((b) => b.key === key)?.value)
                .filter((v): v is number => v != null);
              comp[key] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 1000) / 1000 : null;
            }
            const mine = reviews.filter((x: any) => x.teacherId === r.key);
            const observed = mine.length ? Math.round((mine.reduce((a: number, x: any) => a + Number(x.total || 0), 0) / mine.length) * 100) / 100 : null;
            return {
              ...r,
              components: comp,
              spark: trend(sessions, query.tz, query.from, query.to, d.targets).points.map((p) => p.avgQuality),
              reviews: mine.length,
              observedQuality: observed, // 1–4 rubric mean
            };
          })
          .sort((a, b) => (b.teacherQuality ?? -1) - (a.teacherQuality ?? -1)),
        targets: d.targets,
      };
    });
    res.json(data);
  });

  app.get("/api/analytics/heatmap", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const data = await cached(`heatmap:${JSON.stringify(query)}`, async () => {
      const d = await dataset(query);
      const delays = d.facts.map((f) => f.startDelayMin).filter((x): x is number => x !== null);
      const bins = [
        { label: "Early", test: (x: number) => x < -1 },
        { label: "On time", test: (x: number) => x >= -1 && x <= 5 },
        { label: "5–10 min late", test: (x: number) => x > 5 && x <= 10 },
        { label: "10–20 min late", test: (x: number) => x > 10 && x <= 20 },
        { label: "20+ min late", test: (x: number) => x > 20 },
      ].map((b) => ({ label: b.label, sessions: delays.filter(b.test).length }));
      const adherence = d.facts
        .filter((f) => f.scheduledDurationMin)
        .map((f) => f.durationMin / f.scheduledDurationMin!);
      const aBins = [
        { label: "Under 70%", test: (x: number) => x < 0.7 },
        { label: "70–85%", test: (x: number) => x >= 0.7 && x < 0.85 },
        { label: "85–110%", test: (x: number) => x >= 0.85 && x <= 1.1 },
        { label: "Over 110%", test: (x: number) => x > 1.1 },
      ].map((b) => ({ label: b.label, sessions: adherence.filter(b.test).length }));
      return { cells: heatmap(d.facts, query.tz), startDelay: bins, adherence: aBins, tz: query.tz };
    });
    res.json(data);
  });

  app.get("/api/analytics/sessions", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const page = Math.max(0, Number(req.query.page) || 0);
    const size = Math.min(100, Math.max(5, Number(req.query.pageSize) || 25));
    const sort = String(req.query.sort || "recent");
    const search = String(req.query.q || "").toLowerCase().slice(0, 80);
    const d = await dataset(query);
    let rows = d.facts.map((f) => sessionSummary(f, d.weights, d.anchor));
    if (search) rows = rows.filter((r) => `${r.title} ${r.teacherName || ""} ${r.cohort || ""} ${r.roomSlug}`.toLowerCase().includes(search));
    rows.sort((a, b) =>
      sort === "quality_asc" ? (a.quality ?? 101) - (b.quality ?? 101) : sort === "quality_desc" ? (b.quality ?? -1) - (a.quality ?? -1) : Date.parse(b.startedAt) - Date.parse(a.startedAt)
    );
    res.json({ total: rows.length, page, size, sessions: rows.slice(page * size, page * size + size) });
  });

  app.get("/api/analytics/sessions/:id", staff, async (req, res) => {
    const db: any = await getDb();
    const [row] = await db
      .select({ f: schema.sessionFacts, c: schema.classes })
      .from(schema.sessionFacts)
      .leftJoin(schema.classes, eq(schema.classes.id, schema.sessionFacts.classId))
      .where(eq(schema.sessionFacts.recordingId, req.params.id));
    if (!row) return res.status(404).json({ error: "Session not found" });
    const { weights } = await getSettings();
    const fact = toFact(row.f, row.c);
    const recent = await loadFacts(new Date(fact.startedAt.getTime() - 90 * 864e5), new Date(fact.startedAt.getTime() + 864e5), fact.demo);
    const anchor = schoolAttention(recent);
    const [scored] = scoreFacts([fact], weights, anchor);
    const learners = await db.select().from(schema.sessionLearners).where(eq(schema.sessionLearners.recordingId, req.params.id));
    const reviews = await db
      .select({ r: schema.classReviews, name: schema.users.name })
      .from(schema.classReviews)
      .leftJoin(schema.users, eq(schema.users.id, schema.classReviews.auditorId))
      .where(eq(schema.classReviews.recordingId, req.params.id))
      .orderBy(desc(schema.classReviews.createdAt));
    res.json({
      session: scored ? sessionSummary(scored, weights, anchor) : null,
      aborted: fact.aborted || false,
      facts: { ...fact, components: undefined },
      learners: learners.map((l: any) => ({ ...l, countryName: analyticsLabels.country(l.country) })),
      reviews: reviews.filter((x: any) => x.r.status === "submitted" || x.r.auditorId === req.user!.id).map((x: any) => ({ ...x.r, auditorName: x.name })),
    });
  });

  app.get("/api/analytics/export.csv", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const view = String(req.query.view || "sessions");
    const d = await dataset(query);
    let header: string[];
    let lines: unknown[][];
    if (view === "breakdown") {
      const dim = String(req.query.dim || "teacher") as Dimension;
      if (![...SESSION_DIMENSIONS, ...LEARNER_DIMENSIONS].includes(dim as any)) return res.status(400).json({ error: "Unknown dimension" });
      const rows = breakdown(d.facts, d.learners, dim, query.tz, d.targets, analyticsLabels);
      const keys = [...new Set(rows.flatMap((r) => Object.keys(r.metrics)))];
      header = [dim, "n", ...keys];
      lines = rows.map((r) => [r.label, r.n, ...keys.map((k) => r.metrics[k])]);
    } else {
      const rows = d.facts.map((f) => sessionSummary(f, d.weights, d.anchor));
      header = ["started_at", "title", "kind", "teacher", "cohort", "grade", "duration_min", "start_delay_min", "planned_size", "enrolled", "attended", "peak_learners", "quality", "signals", "reasons"];
      lines = rows.map((r) => [r.startedAt, r.title, r.kind, r.teacherName, r.cohort, r.gradeLevel, r.durationMin, r.startDelayMin, r.plannedSize, r.enrolled, r.attended, r.peakLearners, r.quality, r.signals, r.reasons.join("; ")]);
    }
    persist(
      "analytics export audit",
      auditInsert("analytics_access", { id: `ax-${crypto.randomUUID()}`, at: new Date().toISOString(), type: "export", userId: req.user!.id, data: { view, rows: lines.length, from: query.from, to: query.to, filters: query.filters } })
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="class-analytics-${view}-${query.from.toISOString().slice(0, 10)}-to-${query.to.toISOString().slice(0, 10)}.csv"`);
    res.send([header, ...lines].map((l) => l.map(csvCell).join(",")).join("\n"));
  });

  // ---------------- settings: weights + targets (admins) ----------------
  app.put("/api/analytics/settings", requireAuth("admin"), async (req, res) => {
    const cur = await getSettings();
    const t = req.body?.targets || {};
    const num = (v: unknown, lo: number, hi: number, fallback: number) => (Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi ? Number(v) : fallback);
    settings = {
      weights: {
        teaching: sanitizeWeights(req.body?.weights?.teaching, cur.weights.teaching),
        conversation: sanitizeWeights(req.body?.weights?.conversation, cur.weights.conversation),
      },
      targets: {
        quality: num(t.quality, 0, 100, cur.targets.quality),
        occupancy: num(t.occupancy, 0, 1, cur.targets.occupancy),
        attendance: num(t.attendance, 0, 1, cur.targets.attendance),
        startDelayMin: num(t.startDelayMin, 0, 60, cur.targets.startDelayMin),
      },
    };
    await kvUpsert("analytics_settings", [{ key: "settings", value: settings }]);
    persist("analytics settings audit", auditInsert("analytics_access", { id: `ax-${crypto.randomUUID()}`, at: new Date().toISOString(), type: "settings", userId: req.user!.id, data: settings }));
    clearAnalyticsCache();
    res.json(settings);
  });

  // ---------------- auditor reviews ----------------
  const RUBRICS: Record<string, string[]> = {
    teaching_v1: ["clarity", "pacing", "interaction", "accuracy", "management"],
    counselling_v1: ["rapport", "needs", "clarity", "accuracy", "nextSteps"],
  };

  app.get("/api/reviews", staff, async (req, res) => {
    const db: any = await getDb();
    const recordingId = String(req.query.recordingId || "");
    if (!recordingId) return res.status(400).json({ error: "recordingId is required" });
    const rows = await db.select().from(schema.classReviews).where(eq(schema.classReviews.recordingId, recordingId));
    res.json({ reviews: rows.filter((r: any) => r.status === "submitted" || r.auditorId === req.user!.id), rubrics: RUBRICS });
  });

  app.post("/api/reviews", staff, async (req, res) => {
    const db: any = await getDb();
    const recordingId = String(req.body?.recordingId || "");
    const [rec] = recordingId ? await db.select().from(schema.recordings).where(eq(schema.recordings.id, recordingId)) : [];
    if (!rec) return res.status(404).json({ error: "Class session not found" });
    const rubric = RUBRICS[req.body?.rubric] ? String(req.body.rubric) : "teaching_v1";
    const scores: Record<string, number> = {};
    for (const k of RUBRICS[rubric]) {
      const v = Number(req.body?.scores?.[k]);
      if (Number.isInteger(v) && v >= 1 && v <= 4) scores[k] = v;
    }
    const submit = req.body?.submit === true;
    if (submit && Object.keys(scores).length !== RUBRICS[rubric].length) return res.status(400).json({ error: "Score every criterion (1–4) before submitting." });
    const [existing] = await db.select().from(schema.classReviews).where(and(eq(schema.classReviews.recordingId, recordingId), eq(schema.classReviews.auditorId, req.user!.id)));
    if (existing?.status === "submitted") return res.status(409).json({ error: "This review was submitted and can't be changed." });
    const vals = Object.values(scores);
    const [fact] = await db.select({ teacherId: schema.sessionFacts.teacherId }).from(schema.sessionFacts).where(eq(schema.sessionFacts.recordingId, recordingId));
    const row = {
      id: existing?.id || `rv-${crypto.randomUUID()}`,
      recordingId,
      roomSlug: rec.roomSlug,
      teacherId: fact?.teacherId || rec.startedBy || null,
      auditorId: req.user!.id,
      rubric,
      scores,
      total: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null,
      note: req.body?.note ? String(req.body.note).slice(0, 2000) : null,
      status: submit ? "submitted" : "draft",
      submittedAt: submit ? new Date() : null,
    };
    await db.insert(schema.classReviews).values(row).onConflictDoUpdate({ target: [schema.classReviews.recordingId, schema.classReviews.auditorId], set: row });
    if (submit && rec.endedAt) await computeSessionFacts(recordingId).catch(() => {});
    res.json({ review: row });
  });

  /** Sessions worth reviewing: the lowest-scored without a review, plus a random sample for calibration. */
  app.get("/api/reviews/queue", staff, async (req, res) => {
    const query = parseQuery(req.query as any);
    const d = await dataset(query);
    const db: any = await getDb();
    const ids = d.facts.map((f) => f.recordingId);
    const reviewed = new Set<string>();
    for (let i = 0; i < ids.length; i += 800) {
      const part = await db.select({ id: schema.classReviews.recordingId }).from(schema.classReviews).where(and(inArray(schema.classReviews.recordingId, ids.slice(i, i + 800)), eq(schema.classReviews.status, "submitted")));
      for (const p of part) reviewed.add(p.id);
    }
    const open = d.facts.filter((f) => !reviewed.has(f.recordingId) && !SALES_KINDS.has(f.kind));
    const lowest = [...open].filter((f) => f.quality !== null).sort((a, b) => a.quality! - b.quality!).slice(0, 5);
    const rest = open.filter((f) => !lowest.includes(f));
    const random = rest.sort(() => Math.random() - 0.5).slice(0, 3);
    res.json({
      lowest: lowest.map((f) => sessionSummary(f, d.weights, d.anchor)),
      random: random.map((f) => sessionSummary(f, d.weights, d.anchor)),
      unreviewed: open.length,
    });
  });
}
