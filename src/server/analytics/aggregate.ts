/**
 * Pure aggregation over session facts (no database access, unit-tested).
 * Class-level dimensions group sessions; learner-level dimensions (learner country / timezone /
 * device) group learner-session rows.
 */
import { COMPONENT_LABEL, ComponentKey, Components, profileFor, qualityReasons, qualityScore, teacherQuality, WeightProfiles, Weights } from "./quality";

export interface FactRow {
  recordingId: string;
  roomSlug: string;
  kind: string;
  subject: string | null;
  course: string | null;
  topic: string | null;
  gradeLevel: number | null;
  program: string | null;
  cohort: string | null;
  language: string | null;
  teacherId: string | null;
  hostId?: string | null;
  teacherName: string | null;
  teacherCountry: string | null;
  teacherTimezone: string | null;
  startedAt: Date;
  endedAt: Date;
  durationMin: number;
  contactMin?: number | null;
  aborted?: boolean;
  scheduledDurationMin: number | null;
  startDelayMin: number | null;
  plannedSize: number | null;
  attendanceTracked?: boolean;
  enrolled: number;
  attended: number;
  enrolledAttended?: number;
  enrolledMinutes?: number;
  peakLearners: number;
  lateCount: number;
  earlyLeaveCount: number;
  avgMinutesPresent: number | null;
  attentionAvg: number | null;
  engagedLearners: number;
  states: Record<string, number>;
  teacherTalkShare: number | null;
  learnerQuestions: number;
  polls: number;
  pollVotes: number;
  mutes: number;
  removals: number;
  captureAttempts: number;
  deviceBlocks: number;
  notesGenerated: boolean;
  reviewScore: number | null;
  components: Components;
  demo: boolean;
}

export interface LearnerRow {
  recordingId: string;
  learnerId: string;
  country: string | null;
  timezone: string | null;
  gradeLevel: number | null;
  deviceType: string | null;
  enrolled: boolean;
  status: string;
  minutesPresent: number;
  attention: number | null;
}

export interface Targets {
  quality: number; // 0–100
  occupancy: number; // 0–1
  attendance: number; // 0–1
  startDelayMin: number;
}
export const DEFAULT_TARGETS: Targets = { quality: 75, occupancy: 0.7, attendance: 0.85, startDelayMin: 5 };

export const SALES_KINDS = new Set(["counselling", "admission"]);

export const SESSION_DIMENSIONS = ["room", "slot", "weekday", "teacher", "teacher_timezone", "course", "subject", "teacher_country", "grade", "cohort", "class_size", "kind", "language", "program", "week"] as const;
export const LEARNER_DIMENSIONS = ["learner_timezone", "country", "device", "learner_grade"] as const;
export type Dimension = (typeof SESSION_DIMENSIONS)[number] | (typeof LEARNER_DIMENSIONS)[number];
export const isLearnerDimension = (d: string): d is (typeof LEARNER_DIMENSIONS)[number] => (LEARNER_DIMENSIONS as readonly string[]).includes(d);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** Weekday (0 = Mon), hour (0–23) and local date of an instant in a timezone. */
export function localParts(d: Date, tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" });
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { weekday: WEEKDAYS.indexOf(p.weekday), hour: Number(p.hour) % 24, minute: Number(p.minute), date: `${p.year}-${p.month}-${p.day}` };
}

/** Monday of the week (local date string) for weekly trends. */
export function weekStart(d: Date, tz: string) {
  const { weekday, date } = localParts(d, tz);
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - weekday);
  return base.toISOString().slice(0, 10);
}

export const sizeBucket = (n: number) => (n <= 0 ? "No learners" : n > 24 ? "1:25+" : `1:${n}`);
/** Actual class size; unknown when no join data was received (not "no learners"). */
export const sizeOf = (f: Pick<FactRow, "peakLearners" | "attendanceTracked">) => (f.attendanceTracked === false ? "Unknown" : sizeBucket(f.peakLearners));
/** Nobody came: the class can't be judged on teaching, so it's left unscored (it still counts as a no-show). */
export const nobodyCame = (f: Pick<FactRow, "attended" | "attendanceTracked">) => f.attendanceTracked !== false && f.attended === 0;

/** A session's display name: "Physics: Waves", the subject, or what kind of session it was. */
export function sessionTitle(f: Pick<FactRow, "subject" | "topic" | "kind" | "roomSlug">) {
  if (f.subject && f.topic) return `${f.subject}: ${f.topic}`;
  if (f.subject) return f.subject;
  return f.kind === "adhoc" ? "Ad-hoc session" : f.roomSlug;
}

export function sessionKey(f: FactRow, dim: Dimension, tz: string, labels: Labels): { key: string; label: string; order?: number } {
  switch (dim) {
    case "room":
      return { key: f.roomSlug, label: sessionTitle(f) };
    case "slot": {
      // 30-minute slots (many schools start on the half hour)
      const { hour, minute } = localParts(f.startedAt, tz);
      const m = minute < 30 ? 0 : 30;
      const endH = m === 30 ? (hour + 1) % 24 : hour;
      const pad = (x: number) => String(x).padStart(2, "0");
      return { key: `${pad(hour)}:${pad(m)}`, label: `${pad(hour)}:${pad(m)}–${pad(endH)}:${pad(m === 30 ? 0 : 30)}`, order: hour * 2 + (m ? 1 : 0) };
    }
    case "weekday": {
      const w = localParts(f.startedAt, tz).weekday;
      return { key: String(w), label: WEEKDAYS[w], order: w };
    }
    case "week": {
      const w = weekStart(f.startedAt, tz);
      return { key: w, label: `Week of ${w}`, order: Date.parse(w) };
    }
    case "teacher":
      return { key: f.teacherId || "unknown", label: f.teacherName || "Unassigned" };
    case "teacher_timezone":
      return { key: f.teacherTimezone || "unknown", label: f.teacherTimezone || "Unknown" };
    case "teacher_country":
      return { key: f.teacherCountry || "unknown", label: labels.country(f.teacherCountry) };
    case "course":
      return { key: f.course || f.subject || "unknown", label: f.course || f.subject || "Unknown" };
    case "subject":
      return { key: f.subject || "unknown", label: f.subject || "Unknown" };
    case "grade":
      return { key: f.gradeLevel == null ? "unknown" : String(f.gradeLevel), label: f.gradeLevel == null ? "No grade" : `Grade ${f.gradeLevel}`, order: f.gradeLevel ?? 99 };
    case "cohort": {
      const c = f.cohort || (f.program && f.gradeLevel != null ? `${labels.program(f.program)} · Grade ${f.gradeLevel}` : null);
      return { key: c || "unknown", label: c || "No cohort" };
    }
    case "class_size": {
      const label = sizeOf(f);
      return { key: label, label, order: label === "Unknown" ? 99 : f.peakLearners > 24 ? 25 : f.peakLearners };
    }
    case "kind":
      return { key: f.kind, label: labels.kind(f.kind) };
    case "language":
      return { key: f.language || "unknown", label: labels.language(f.language) };
    case "program":
      return { key: f.program || "unknown", label: labels.program(f.program) };
    default:
      return { key: "all", label: "All" };
  }
}

export interface Labels {
  country: (iso3: string | null) => string;
  kind: (k: string) => string;
  program: (p: string | null) => string;
  language: (l: string | null) => string;
}

export const plainLabels: Labels = {
  country: (c) => c || "Unknown",
  kind: (k) => k,
  program: (p) => p || "Unknown",
  language: (l) => l || "Unknown",
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
const r = (x: number | null, d = 1) => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

export interface ScoredFact extends FactRow {
  quality: number | null;
  signals: number;
}

/** School-wide average attention (consenting learners), the anchor for partial-consent shrinkage. */
export function schoolAttention(facts: FactRow[]): number | null {
  let sum = 0;
  let n = 0;
  for (const f of facts) if (f.attentionAvg != null && f.engagedLearners > 0) (sum += f.attentionAvg * f.engagedLearners), (n += f.engagedLearners);
  return n ? sum / n : null;
}

/** Scores each session with its profile's weights; aborted sessions (< 3 min) are left out. */
export function scoreFacts(facts: FactRow[], profiles: WeightProfiles, attentionAnchor: number | null = schoolAttention(facts)): ScoredFact[] {
  return facts
    .filter((f) => !f.aborted)
    .map((f) => {
      const q = qualityScore(f.components || {}, profiles[profileFor(f.kind)], attentionAnchor);
      return { ...f, quality: nobodyCame(f) ? null : q.score, signals: q.signals };
    });
}

/** Session-level metrics for a group of sessions (ratios are pooled, never averages of ratios). */
export function sessionMetrics(rows: ScoredFact[], targets: Targets) {
  const teaching = rows.filter((f) => !SALES_KINDS.has(f.kind));
  const sales = rows.filter((f) => SALES_KINDS.has(f.kind));
  const tracked = rows.filter((f) => f.attendanceTracked !== false);
  const delays = rows.map((f) => f.startDelayMin).filter((x): x is number => x !== null);
  const seated = tracked.filter((f) => f.plannedSize && f.plannedSize > 0);
  const withEnrol = tracked.filter((f) => f.enrolled > 0);
  const quals = rows.map((f) => f.quality).filter((x): x is number => x !== null);
  const engaged = rows.filter((f) => f.attentionAvg != null && f.engagedLearners > 0);
  const durations = teaching.map((f) => f.durationMin);
  // Counselling length = time the counsellor and the family were actually talking
  const salesMinutes = sales.map((f) => (f.contactMin != null && f.contactMin > 0 ? f.contactMin : f.durationMin));
  const trackedSales = sales.filter((f) => f.attendanceTracked !== false);
  const trackedTeaching = teaching.filter((f) => f.attendanceTracked !== false);
  const sumEnrolled = withEnrol.reduce((a, f) => a + f.enrolled, 0);
  return {
    sessions: rows.length,
    classes: teaching.length,
    counsellingSessions: sales.length,
    hours: r(rows.reduce((a, f) => a + f.durationMin, 0) / 60),
    avgDurationMin: r(mean(durations)),
    medianDurationMin: r(percentile(durations, 0.5)),
    p90DurationMin: r(percentile(durations, 0.9)),
    avgCounsellingMin: r(mean(salesMinutes)),
    medianCounsellingMin: r(percentile(salesMinutes, 0.5)),
    counsellingNoShowRate: trackedSales.length ? r(trackedSales.filter((f) => f.attended === 0).length / trackedSales.length, 3) : null,
    classNoShowRate: trackedTeaching.length ? r(trackedTeaching.filter((f) => f.attended === 0).length / trackedTeaching.length, 3) : null,
    avgStartDelayMin: r(mean(delays)),
    onTimeRate: delays.length ? r(delays.filter((d) => d <= targets.startDelayMin).length / delays.length, 3) : null,
    avgOccupancy: seated.length ? r(seated.reduce((a, f) => a + f.attended, 0) / seated.reduce((a, f) => a + f.plannedSize!, 0), 3) : null,
    attendanceRate: sumEnrolled ? r(withEnrol.reduce((a, f) => a + Math.min(f.enrolledAttended ?? f.attended, f.enrolled), 0) / sumEnrolled, 3) : null,
    presenceRate: sumEnrolled ? r(withEnrol.reduce((a, f) => a + (f.enrolledMinutes ?? 0), 0) / withEnrol.reduce((a, f) => a + f.enrolled * f.durationMin, 0), 3) : null,
    avgClassSize: r(mean(tracked.map((f) => f.peakLearners))),
    learnerAttendances: tracked.reduce((a, f) => a + f.attended, 0),
    avgQuality: r(mean(quals)),
    scoredShare: rows.length ? r(quals.length / rows.length, 3) : null,
    belowTargetShare: quals.length ? r(quals.filter((q) => q < targets.quality).length / quals.length, 3) : null,
    avgAttention: engaged.length ? r(engaged.reduce((a, f) => a + f.attentionAvg! * f.engagedLearners, 0) / engaged.reduce((a, f) => a + f.engagedLearners, 0), 3) : null,
    engagementCoverage: rows.length ? r(engaged.length / rows.length, 3) : null,
    questionsPerClass: rows.length ? r(rows.reduce((a, f) => a + f.learnerQuestions, 0) / rows.length) : null,
    pollsPerClass: rows.length ? r(rows.reduce((a, f) => a + f.polls, 0) / rows.length) : null,
    captureAttemptsPer100: rows.length ? r((rows.reduce((a, f) => a + f.captureAttempts, 0) / rows.length) * 100) : null,
    removalsPer100: rows.length ? r((rows.reduce((a, f) => a + f.removals, 0) / rows.length) * 100) : null,
    deviceBlocks: rows.reduce((a, f) => a + f.deviceBlocks, 0),
    notesCoverage: rows.length ? r(rows.filter((f) => f.notesGenerated).length / rows.length, 3) : null,
    reviewed: rows.filter((f) => f.reviewScore !== null).length,
    attendanceUnknown: rows.length - tracked.length,
  };
}
export type SessionMetrics = ReturnType<typeof sessionMetrics>;

/** Learner-level metrics for a group of learner-session rows. */
export function learnerMetrics(rows: LearnerRow[], quality: Map<string, number | null>) {
  const came = rows.filter((l) => l.status !== "absent");
  const att = came.map((l) => l.attention).filter((x): x is number => x !== null);
  const q = [...new Set(rows.map((l) => l.recordingId))].map((id) => quality.get(id)).filter((x): x is number => x != null);
  return {
    learners: new Set(rows.map((l) => l.learnerId)).size,
    sessions: new Set(rows.map((l) => l.recordingId)).size,
    seats: rows.length,
    attendanceRate: rows.length ? r(came.length / rows.length, 3) : null,
    punctualRate: came.length ? r(came.filter((l) => l.status === "present").length / came.length, 3) : null,
    lateRate: came.length ? r(came.filter((l) => l.status === "late").length / came.length, 3) : null,
    leftEarlyRate: came.length ? r(came.filter((l) => l.status === "left_early").length / came.length, 3) : null,
    avgMinutesPresent: r(mean(came.map((l) => l.minutesPresent))),
    avgAttention: r(mean(att), 3),
    avgQuality: r(mean(q)),
  };
}

export interface BreakdownRow {
  key: string;
  label: string;
  order?: number;
  n: number;
  lowConfidence: boolean;
  metrics: Record<string, number | null>;
  teacherQuality?: number | null;
  /** Secondary text (e.g. the room code) */
  detail?: string;
}

export function breakdown(facts: ScoredFact[], learners: LearnerRow[], dim: Dimension, tz: string, targets: Targets, labels: Labels = plainLabels): BreakdownRow[] {
  const quality = new Map(facts.map((f) => [f.recordingId, f.quality]));
  if (isLearnerDimension(dim)) {
    const groups = new Map<string, { label: string; order?: number; rows: LearnerRow[] }>();
    // A device is only known for learners who joined, so the device view covers those learners
    for (const l of dim === "device" ? learners.filter((x) => x.status !== "absent") : learners) {
      const key =
        dim === "country" ? l.country || "unknown" : dim === "learner_timezone" ? l.timezone || "unknown" : dim === "device" ? l.deviceType || "unknown" : l.gradeLevel == null ? "unknown" : String(l.gradeLevel);
      const label =
        dim === "country"
          ? labels.country(l.country)
          : dim === "learner_timezone"
          ? l.timezone || "Unknown"
          : dim === "device"
          ? l.deviceType
            ? l.deviceType[0].toUpperCase() + l.deviceType.slice(1)
            : "Unknown"
          : l.gradeLevel == null
          ? "No grade"
          : `Grade ${l.gradeLevel}`;
      if (!groups.has(key)) groups.set(key, { label, order: dim === "learner_grade" ? l.gradeLevel ?? 99 : undefined, rows: [] });
      groups.get(key)!.rows.push(l);
    }
    // Privacy: groups of fewer than 3 learners are folded into "Other (small groups)"
    const out: BreakdownRow[] = [];
    const small: LearnerRow[] = [];
    const metricsFor = (rows: LearnerRow[]) => {
      const m: Record<string, number | null> = learnerMetrics(rows, quality);
      // Everyone in the device view joined, so an attendance rate would always read 100%
      if (dim === "device") m.attendanceRate = null;
      return m;
    };
    for (const [key, g] of groups) {
      const m = metricsFor(g.rows);
      if (m.learners! < 3) small.push(...g.rows);
      else out.push({ key, label: g.label, order: g.order, n: m.learners!, lowConfidence: false, metrics: m });
    }
    if (small.length) {
      const m = metricsFor(small);
      // Even folded together, fewer than 3 learners stay hidden
      if (m.learners! >= 3) out.push({ key: "__small__", label: "Other (small groups)", order: 1e9, n: m.learners!, lowConfidence: true, metrics: m });
    }
    return out;
  }

  const groups = new Map<string, { label: string; order?: number; rows: ScoredFact[] }>();
  for (const f of facts) {
    const k = sessionKey(f, dim, tz, labels);
    if (!groups.has(k.key)) groups.set(k.key, { label: k.label, order: k.order, rows: [] });
    groups.get(k.key)!.rows.push(f);
  }
  // Teachers are shrunk toward the mean of teaching sessions (counselling is judged differently)
  const schoolMean = mean(facts.filter((f) => !SALES_KINDS.has(f.kind)).map((f) => f.quality).filter((x): x is number => x !== null)) ?? 70;
  const learnersByRec = new Map<string, LearnerRow[]>();
  for (const l of learners) {
    const list = learnersByRec.get(l.recordingId);
    if (list) list.push(l);
    else learnersByRec.set(l.recordingId, [l]);
  }
  return [...groups.entries()].map(([key, g]) => {
    const m: Record<string, number | null> = sessionMetrics(g.rows, targets);
    const reached = new Set(g.rows.flatMap((f) => (learnersByRec.get(f.recordingId) || []).filter((l) => l.status !== "absent").map((l) => l.learnerId)));
    m.learnersReached = reached.size;
    const row: BreakdownRow = { key, label: g.label, order: g.order, n: g.rows.length, lowConfidence: g.rows.length < 3, metrics: m };
    // Rooms often share a subject and topic: show the room code under the name
    if (dim === "room") row.detail = key;
    if (dim === "teacher") {
      const scored = g.rows.filter((f) => f.quality !== null && !SALES_KINDS.has(f.kind));
      const tq = teacherQuality(scored.map((f) => f.quality!), schoolMean, 5, 5, scored.map((f) => f.durationMin / 60));
      row.metrics.teacherQualityLow = tq.interval?.[0] ?? null;
      row.metrics.teacherQualityHigh = tq.interval?.[1] ?? null;
      row.metrics.qualitySpread = tq.spread;
      row.teacherQuality = tq.score;
      row.metrics.teacherQuality = tq.score;
      if (scored.length || g.rows.some((f) => !SALES_KINDS.has(f.kind))) row.lowConfidence = !tq.ranked;
      // Counsellors have no teaching classes to rank; they're judged in the counselling view
      else row.detail = "Counselling";
    }
    return row;
  });
}

/** Average teacher quality across teachers with enough classes (falls back to all teachers). */
export function averageTeacherQuality(facts: ScoredFact[]) {
  const schoolMean = mean(facts.filter((f) => !SALES_KINDS.has(f.kind)).map((f) => f.quality).filter((x): x is number => x !== null));
  if (schoolMean === null) return null;
  const byTeacher = new Map<string, ScoredFact[]>();
  for (const f of facts) if (f.teacherId && f.quality !== null && !SALES_KINDS.has(f.kind)) byTeacher.set(f.teacherId, [...(byTeacher.get(f.teacherId) || []), f]);
  const all = [...byTeacher.values()].map((rows) => teacherQuality(rows.map((f) => f.quality!), schoolMean, 5, 5, rows.map((f) => f.durationMin / 60)));
  const ranked = all.filter((t) => t.ranked);
  return r(mean((ranked.length ? ranked : all).map((t) => t.score!).filter((x) => x !== null)));
}

/** Trend points (daily for ≤ 21 days, otherwise weekly) for sparklines and trend charts. */
export function trend(facts: ScoredFact[], tz: string, from: Date, to: Date, targets: Targets) {
  const daily = to.getTime() - from.getTime() <= 21 * 864e5;
  const buckets = new Map<string, ScoredFact[]>();
  for (const f of facts) {
    const k = daily ? localParts(f.startedAt, tz).date : weekStart(f.startedAt, tz);
    buckets.set(k, [...(buckets.get(k) || []), f]);
  }
  // Include empty buckets so gaps show as gaps
  const keys: string[] = [];
  const cur = new Date(daily ? `${localParts(from, tz).date}T00:00:00Z` : `${weekStart(from, tz)}T00:00:00Z`);
  const last = daily ? localParts(to, tz).date : weekStart(to, tz);
  for (let guard = 0; guard < 400; guard++) {
    const k = cur.toISOString().slice(0, 10);
    keys.push(k);
    if (k >= last) break;
    cur.setUTCDate(cur.getUTCDate() + (daily ? 1 : 7));
  }
  return {
    granularity: daily ? "day" : "week",
    points: keys.map((k) => {
      const rows = buckets.get(k) || [];
      const m = sessionMetrics(rows, targets);
      return { period: k, sessions: m.sessions, hours: m.hours, avgQuality: m.avgQuality, avgOccupancy: m.avgOccupancy, avgDurationMin: m.avgDurationMin, avgCounsellingMin: m.avgCounsellingMin, onTimeRate: m.onTimeRate, attendanceRate: m.attendanceRate };
    }),
  };
}

export function heatmap(facts: ScoredFact[], tz: string) {
  const cells = new Map<string, ScoredFact[]>();
  for (const f of facts) {
    const { weekday, hour } = localParts(f.startedAt, tz);
    const k = `${weekday}:${hour}`;
    cells.set(k, [...(cells.get(k) || []), f]);
  }
  return [...cells.entries()].map(([k, rows]) => {
    const [weekday, hour] = k.split(":").map(Number);
    const q = rows.map((f) => f.quality).filter((x): x is number => x !== null);
    return { weekday, hour, sessions: rows.length, avgQuality: r(mean(q)), avgOccupancy: sessionMetrics(rows, DEFAULT_TARGETS).avgOccupancy };
  });
}

/** Quality histogram in 10-point bins. */
export function qualityDistribution(facts: ScoredFact[]) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, sessions: 0 }));
  for (const f of facts) if (f.quality !== null) bins[Math.min(9, Math.floor(f.quality / 10))].sessions++;
  return bins;
}

export function kindMix(facts: ScoredFact[], labels: Labels = plainLabels) {
  const counts = new Map<string, number>();
  for (const f of facts) counts.set(f.kind, (counts.get(f.kind) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([kind, sessions]) => ({ kind, label: labels.kind(kind), sessions }));
}

export interface AttentionItem {
  type: "class" | "teacher" | "room";
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "serious" | "warning";
  recordingId?: string;
}

/** Classes, teachers and rooms below target or getting worse. */
export function needsAttention(facts: ScoredFact[], targets: Targets, labels: Labels = plainLabels): AttentionItem[] {
  const items: AttentionItem[] = [];
  // Weakest classes
  for (const f of [...facts].filter((f) => f.quality !== null && f.quality < targets.quality).sort((a, b) => a.quality! - b.quality!).slice(0, 6)) {
    const reasons = qualityReasons(f, f.components);
    items.push({
      type: "class",
      id: f.recordingId,
      recordingId: f.recordingId,
      title: `${sessionTitle(f)} · ${f.teacherName || "Unassigned"}`,
      detail: `Quality ${f.quality} · ${reasons.slice(0, 2).join(" · ") || "below target"}`,
      severity: f.quality! < targets.quality - 25 ? "critical" : f.quality! < targets.quality - 10 ? "serious" : "warning",
    });
  }
  // Teachers trending down: last third of their classes vs the rest
  const byTeacher = new Map<string, ScoredFact[]>();
  for (const f of facts) if (f.teacherId && f.quality !== null) byTeacher.set(f.teacherId, [...(byTeacher.get(f.teacherId) || []), f]);
  for (const [id, rows] of byTeacher) {
    if (rows.length < 6) continue;
    const sorted = [...rows].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    const cut = Math.floor((sorted.length * 2) / 3);
    const before = mean(sorted.slice(0, cut).map((f) => f.quality!))!;
    const recent = mean(sorted.slice(cut).map((f) => f.quality!))!;
    if (before - recent >= 8 || recent < targets.quality - 10) {
      items.push({
        type: "teacher",
        id,
        title: sorted[0].teacherName || id,
        detail: before - recent >= 8 ? `Quality down ${r(before - recent)} points recently (${r(before)} → ${r(recent)})` : `Recent quality ${r(recent)}, below target ${targets.quality}`,
        severity: recent < targets.quality - 20 ? "critical" : "serious",
      });
    }
  }
  // Rooms running empty
  const byRoom = new Map<string, ScoredFact[]>();
  for (const f of facts) if (f.plannedSize && f.plannedSize > 1) byRoom.set(f.roomSlug, [...(byRoom.get(f.roomSlug) || []), f]);
  for (const [room, rows] of byRoom) {
    if (rows.length < 3) continue;
    const occ = mean(rows.map((f) => Math.min(1.5, f.attended / f.plannedSize!)))!;
    if (occ < targets.occupancy - 0.2) {
      items.push({ type: "room", id: room, title: sessionKey(rows[0], "room", "UTC", labels).label, detail: `Average occupancy ${Math.round(occ * 100)}% (target ${Math.round(targets.occupancy * 100)}%)`, severity: occ < targets.occupancy - 0.4 ? "serious" : "warning" });
    }
  }
  const rank = { critical: 0, serious: 1, warning: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 12);
}

/** Session list entry with its score breakdown and reasons. */
export function sessionSummary(f: ScoredFact, profiles: WeightProfiles, attentionAnchor: number | null) {
  const q = qualityScore(f.components || {}, profiles[profileFor(f.kind)], attentionAnchor);
  return {
    recordingId: f.recordingId,
    roomSlug: f.roomSlug,
    kind: f.kind,
    title: sessionTitle(f),
    teacherId: f.teacherId,
    teacherName: f.teacherName,
    cohort: f.cohort,
    gradeLevel: f.gradeLevel,
    startedAt: f.startedAt.toISOString(),
    durationMin: f.durationMin,
    contactMin: f.contactMin ?? null,
    attendanceTracked: f.attendanceTracked !== false,
    scheduledDurationMin: f.scheduledDurationMin,
    startDelayMin: f.startDelayMin,
    plannedSize: f.plannedSize,
    enrolled: f.enrolled,
    attended: f.attended,
    peakLearners: f.peakLearners,
    attentionAvg: f.attentionAvg,
    learnerQuestions: f.learnerQuestions,
    polls: f.polls,
    quality: nobodyCame(f) ? null : q.score,
    signals: q.signals,
    profile: profileFor(f.kind),
    breakdown: q.breakdown.map((b) => ({ ...b, label: COMPONENT_LABEL[b.key as ComponentKey] })),
    reasons: nobodyCame(f) ? ["No learners came"] : qualityReasons(f, f.components || {}),
    demo: f.demo,
  };
}
