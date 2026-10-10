import { describe, expect, it } from "vitest";
import { computeComponents, DEFAULT_PROFILES, profileFor, qualityReasons, qualityScore, sanitizeWeights, SessionMeasures, shrunkEngagement, teacherQuality } from "./quality";

const W = DEFAULT_PROFILES.teaching;
const base: SessionMeasures = {
  enrolled: 10,
  attended: 10,
  plannedSize: 12,
  startDelayMin: 0,
  lateCount: 0,
  attentionAvg: 0.9,
  engagedLearners: 6,
  learnerQuestions: 3,
  polls: 1,
  pollVotes: 10,
  durationMin: 60,
  scheduledDurationMin: 60,
  mutes: 0,
  removals: 0,
  captureAttempts: 0,
  reviewScore: null,
};

describe("computeComponents", () => {
  it("scores a model class near the top", () => {
    const c = computeComponents(base);
    expect(c).toMatchObject({ attendance: 1, punctuality: 1, engagement: 0.9, engagementN: 6, interaction: 1, adherence: 1, review: null });
    // engagement 0.9 on a weight of 20 out of 85 available points
    expect(qualityScore(c, W).score).toBe(97.6);
  });

  it("punctuality is the host's start: full marks to 5 min, nothing at 20 min, absent when unscheduled", () => {
    expect(computeComponents({ ...base, startDelayMin: 5 }).punctuality).toBe(1);
    expect(computeComponents({ ...base, startDelayMin: 12.5 }).punctuality).toBeCloseTo(0.5);
    expect(computeComponents({ ...base, startDelayMin: 30 }).punctuality).toBe(0);
    expect(computeComponents({ ...base, startDelayMin: null }).punctuality).toBeNull();
    // learner lateness belongs to attendance, not the teacher's punctuality
    expect(computeComponents({ ...base, lateCount: 5 }).punctuality).toBe(1);
  });

  it("moderating a class is never a penalty", () => {
    const calm = qualityScore(computeComponents(base), W).score;
    const moderated = qualityScore(computeComponents({ ...base, mutes: 4, removals: 2, captureAttempts: 3 }), W).score;
    expect(moderated).toBe(calm);
  });

  it("attendance is unknown (not zero) when no join data exists", () => {
    expect(computeComponents({ ...base, attended: 0, attendanceTracked: false }).attendance).toBeNull();
    expect(computeComponents({ ...base, enrolled: 0, attended: 6, plannedSize: 12 }).attendance).toBe(0.5);
  });

  it("schedule adherence: full marks 85–110%, worse when much shorter or longer", () => {
    expect(computeComponents({ ...base, durationMin: 52 }).adherence).toBe(1);
    expect(computeComponents({ ...base, durationMin: 30 }).adherence).toBeLessThan(0.3);
    expect(computeComponents({ ...base, durationMin: 90 }).adherence).toBeLessThan(0.5);
  });

  it("an auditor review (1–4) counts when present", () => {
    const reviewed = computeComponents({ ...base, reviewScore: 2.5 });
    expect(reviewed.review).toBe(0.5);
    expect(qualityScore(reviewed, W).signals).toBe(6);
  });
});

describe("engagement with partial consent", () => {
  it("pulls few-consent classes toward the school average instead of dropping engagement", () => {
    expect(shrunkEngagement({ engagement: 0.2, engagementN: 1 }, 0.8)).toBeCloseTo(0.6);
    expect(shrunkEngagement({ engagement: 0.2, engagementN: 30 }, 0.8)).toBeCloseTo(0.2375);
    expect(shrunkEngagement({ engagement: null, engagementN: 0 }, 0.8)).toBe(0.8);
    expect(shrunkEngagement({ engagement: null, engagementN: 0 }, null)).toBeNull();
  });

  it("a low-consent class doesn't score higher than an identical fully-measured one", () => {
    const noConsent = qualityScore(computeComponents({ ...base, attentionAvg: null, engagedLearners: 0 }), W, 0.7).score!;
    const measured = qualityScore(computeComponents({ ...base, attentionAvg: 0.7, engagedLearners: 10 }), W, 0.7).score!;
    expect(noConsent).toBeCloseTo(measured, 0);
  });
});

describe("qualityScore", () => {
  it("leaves classes with fewer than 3 signals unscored", () => {
    const c = computeComponents({ ...base, enrolled: 0, plannedSize: null, attended: 0, startDelayMin: null, scheduledDurationMin: null, attentionAvg: null, engagedLearners: 0 });
    const q = qualityScore(c, W);
    expect(q.signals).toBeLessThan(3);
    expect(q.score).toBeNull();
  });

  it("weights are tunable, engagement is capped at 25, and counselling has its own profile", () => {
    expect(sanitizeWeights({ engagement: 80, attendance: -5 }, W)).toMatchObject({ engagement: 25, attendance: 25 });
    const c = computeComponents({ ...base, attentionAvg: 0.2 });
    expect(qualityScore(c, { ...W, engagement: 0 }).score).toBe(100);
    expect(profileFor("counselling")).toBe("conversation");
    expect(profileFor("enrolled")).toBe("teaching");
  });
});

describe("qualityReasons", () => {
  it("explains a weak class in plain language, worst first", () => {
    const m = { ...base, startDelayMin: 14, attended: 4 };
    const reasons = qualityReasons(m, computeComponents(m));
    expect(reasons[0]).toBe("4 of 10 enrolled learners came");
    expect(reasons).toContain("Started 14 min late");
  });
});

describe("teacherQuality", () => {
  it("shrinks small samples toward the school mean and ranks only with 5+ classes", () => {
    const one = teacherQuality([100], 70);
    expect(one).toMatchObject({ raw: 100, score: 75, ranked: false, n: 1 });
    const many = teacherQuality([90, 92, 88, 90, 90, 90], 70);
    expect(many.ranked).toBe(true);
    expect(many.score).toBeCloseTo(80.9, 1);
    expect(many.interval![0]).toBeLessThan(many.score!);
  });

  it("weights classes by hours taught", () => {
    expect(teacherQuality([100, 50], 75, 0, 1, [3, 1]).raw).toBe(87.5);
  });

  it("no classes, no score", () => {
    expect(teacherQuality([], 70)).toMatchObject({ score: null, ranked: false });
  });
});
