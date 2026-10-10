/**
 * Class and teacher quality: transparent, measured, tunable.
 *
 * Each finished class gets component scores (0–1, or null when a component can't exist, e.g.
 * punctuality for an unscheduled session). The class score is the weighted mean of the components
 * that exist, with its own weights for teaching and for counselling/admission conversations.
 *  - Engagement with little consent is pulled toward the school average (not dropped, which would
 *    favour low-consent classes): E = (c·ē + 2·μ) / (c + 2), c = consenting learners.
 *  - Moderation (mutes, removals) is never a penalty; capture attempts are a separate integrity metric.
 *  - Fewer than 3 signals: the class is left unscored.
 * Engagement estimates come from on-device expression analysis; they're capped at 25% of the score
 * and must never be the sole basis for a decision about a teacher.
 * Teacher quality shrinks small samples toward the school average so a few classes can't top or
 * sink a leaderboard.
 */

export type ComponentKey = "attendance" | "punctuality" | "engagement" | "interaction" | "adherence" | "review";
/** Stored per session: engagement holds the raw consenting-learner attention, engagementN their count */
export type Components = Partial<Record<ComponentKey, number | null>> & { engagementN?: number };
export type Weights = Record<ComponentKey, number>;
export type Profile = "teaching" | "conversation";
export interface WeightProfiles {
  teaching: Weights;
  conversation: Weights;
}

export const ENGAGEMENT_WEIGHT_CAP = 25;
export const MIN_SIGNALS = 3;

export const DEFAULT_PROFILES: WeightProfiles = {
  teaching: { attendance: 25, punctuality: 15, engagement: 20, interaction: 15, adherence: 10, review: 15 },
  // Counselling/admission: did the family show up, did we start on time, was it a real conversation
  conversation: { attendance: 30, punctuality: 20, engagement: 10, interaction: 20, adherence: 5, review: 15 },
};
/** Back-compat alias used by older callers/tests */
export const DEFAULT_WEIGHTS: Weights = DEFAULT_PROFILES.teaching;

export const profileFor = (kind: string): Profile => (kind === "counselling" || kind === "admission" ? "conversation" : "teaching");

export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  attendance: "Attendance",
  punctuality: "On-time start",
  engagement: "Engagement",
  interaction: "Interaction",
  adherence: "Ran to schedule",
  review: "Auditor review",
};

/** Keeps admin-entered weights sane: non-negative numbers, engagement capped. */
export function sanitizeWeights(w: Partial<Weights> | undefined, fallback: Weights): Weights {
  const out = { ...fallback };
  for (const k of Object.keys(fallback) as ComponentKey[]) {
    const v = Number(w?.[k]);
    if (Number.isFinite(v) && v >= 0 && v <= 100) out[k] = v;
  }
  out.engagement = Math.min(out.engagement, ENGAGEMENT_WEIGHT_CAP);
  return out;
}

/** Inputs measured from one session (see facts.ts). */
export interface SessionMeasures {
  enrolled: number;
  attended: number;
  plannedSize: number | null;
  startDelayMin: number | null;
  lateCount: number;
  attentionAvg: number | null;
  engagedLearners: number;
  learnerQuestions: number;
  polls: number;
  pollVotes: number;
  durationMin: number;
  scheduledDurationMin: number | null;
  mutes: number;
  removals: number;
  captureAttempts: number;
  reviewScore: number | null; // 1–4 (anchored rubric)
  /** False when the class has no join/leave data at all (attendance unknown) */
  attendanceTracked?: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Linear falloff: 1 at or below `good`, 0 at or above `bad`. */
const falloff = (x: number, good: number, bad: number) => clamp01((bad - x) / (bad - good));

export function computeComponents(m: SessionMeasures): Components {
  const c: Components = {};

  // Attendance: share of enrolled learners who came; for open sessions, share of planned seats filled
  if (m.attendanceTracked === false) c.attendance = null;
  else if (m.enrolled > 0) c.attendance = clamp01(m.attended / m.enrolled);
  else if (m.plannedSize && m.plannedSize > 0) c.attendance = clamp01(m.attended / m.plannedSize);
  else c.attendance = null;

  // Punctuality: the host's start only (learner lateness is already in attendance):
  // full marks if ≤ 5 min late, nothing at 20 min; can't exist for unscheduled sessions
  c.punctuality = m.startDelayMin === null ? null : falloff(Math.max(0, m.startDelayMin), 5, 20);

  // Engagement: raw attention of consenting learners; shrunk toward the school mean when scoring
  c.engagement = m.engagedLearners > 0 && m.attentionAvg !== null ? clamp01(m.attentionAvg) : null;
  c.engagementN = m.engagedLearners;

  // Interaction: ~3 learner questions per 10 learners is full marks; polls add participation
  if (m.attended > 0) {
    const questions = clamp01((m.learnerQuestions / m.attended) * 10 / 3);
    const pollShare = m.polls > 0 ? clamp01(m.pollVotes / (m.polls * m.attended)) : null;
    c.interaction = pollShare === null ? questions : 0.6 * questions + 0.4 * pollShare;
  } else c.interaction = null;

  // Ran to schedule: full marks within 85–110% of the scheduled length
  if (m.scheduledDurationMin && m.scheduledDurationMin > 0) {
    const r = m.durationMin / m.scheduledDurationMin;
    c.adherence = r < 0.85 ? falloff(0.85 - r, 0, 0.35) : r > 1.1 ? falloff(r - 1.1, 0, 0.4) : 1;
  } else c.adherence = null;

  c.review = m.reviewScore === null ? null : clamp01((m.reviewScore - 1) / 3);
  return c;
}

/** Engagement used in the score: (c·ē + 2·μ)/(c + 2); μ alone when nobody consented; null if no school data. */
export function shrunkEngagement(c: Components, schoolAttention: number | null): number | null {
  const n = c.engagementN || 0;
  const raw = c.engagement;
  if (schoolAttention === null) return n > 0 && raw != null ? raw : null;
  if (n <= 0 || raw == null) return schoolAttention;
  return (n * raw + 2 * schoolAttention) / (n + 2);
}

export interface QualityResult {
  score: number | null; // 0–100
  signals: number; // components that had data
  breakdown: Array<{ key: ComponentKey; label: string; value: number | null; weight: number }>;
}

export function qualityScore(components: Components, weights: Weights = DEFAULT_WEIGHTS, schoolAttention?: number | null): QualityResult {
  let sum = 0;
  let wsum = 0;
  let signals = 0;
  const effective: Components = { ...components };
  if (schoolAttention !== undefined) effective.engagement = shrunkEngagement(components, schoolAttention);
  const breakdown = (Object.keys(DEFAULT_WEIGHTS) as ComponentKey[]).map((key) => {
    const value = effective[key];
    const weight = Math.max(0, weights[key] ?? 0);
    if (value !== null && value !== undefined && Number.isFinite(value) && weight > 0) {
      sum += weight * value;
      wsum += weight;
      signals++;
    }
    return { key, label: COMPONENT_LABEL[key], value: value ?? null, weight };
  });
  return { score: wsum > 0 && signals >= MIN_SIGNALS ? Math.round((sum / wsum) * 1000) / 10 : null, signals, breakdown };
}

/** Plain-language reasons for a low score, strongest first. */
export function qualityReasons(m: Partial<SessionMeasures>, c: Components): string[] {
  const out: Array<[number, string]> = [];
  if (m.startDelayMin != null && m.startDelayMin > 5) out.push([m.startDelayMin, `Started ${Math.round(m.startDelayMin)} min late`]);
  if (c.attendance != null && c.attendance < 0.7 && m.enrolled) out.push([(1 - c.attendance) * 40, `${m.attended} of ${m.enrolled} enrolled learners came`]);
  if (c.engagement != null && c.engagement < 0.6) out.push([(0.6 - c.engagement) * 50, `Low attention (${Math.round(c.engagement * 100)}%)`]);
  if (c.interaction != null && c.interaction < 0.3) out.push([10, "Few learner questions or poll answers"]);
  if (c.adherence != null && c.adherence < 0.8 && m.scheduledDurationMin) out.push([12, `Ran ${Math.round(m.durationMin || 0)} of ${m.scheduledDurationMin} scheduled minutes`]);
  if (c.review != null && c.review < 0.5) out.push([15, "Auditor review below expectations"]);
  return out.sort((a, b) => b[0] - a[0]).map(([, s]) => s);
}

/**
 * Teacher quality: hours-weighted mean class score, shrunk toward the school mean by `k`
 * pseudo-classes (empirical Bayes) so small samples don't dominate. Ranked only with ≥ minClasses.
 * `interval` is an ~80% band (±1.28 standard errors).
 */
export function teacherQuality(classScores: number[], schoolMean: number, k = 5, minClasses = 5, hours?: number[]) {
  const n = classScores.length;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  if (!n) return { score: null as number | null, raw: null as number | null, n, ranked: false, spread: null as number | null, interval: null as [number, number] | null };
  const w = hours && hours.length === n ? hours.map((h) => Math.max(0.1, h)) : classScores.map(() => 1);
  const wsum = w.reduce((a, b) => a + b, 0);
  const raw = classScores.reduce((a, s, i) => a + s * w[i], 0) / wsum;
  const score = (n * raw + k * schoolMean) / (n + k);
  const spread = n > 1 ? Math.sqrt(classScores.reduce((a, b) => a + (b - raw) ** 2, 0) / (n - 1)) : null;
  const se = spread === null ? null : spread / Math.sqrt(n);
  return {
    score: r1(score),
    raw: r1(raw),
    n,
    ranked: n >= minClasses,
    spread: spread === null ? null : r1(spread),
    interval: se === null ? null : ([r1(Math.max(0, score - 1.28 * se)), r1(Math.min(100, score + 1.28 * se))] as [number, number]),
  };
}

export type QualityBand = "good" | "fair" | "poor";
export const qualityBand = (score: number | null, target = 75): QualityBand | null =>
  score === null ? null : score >= target ? "good" : score >= target - 15 ? "fair" : "poor";
