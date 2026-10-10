import { describe, expect, it } from "vitest";
import { breakdown, DEFAULT_TARGETS, FactRow, heatmap, kindMix, localParts, needsAttention, percentile, qualityDistribution, schoolAttention, scoreFacts, sessionMetrics, trend, weekStart } from "./aggregate";
import { computeComponents, DEFAULT_PROFILES } from "./quality";

let seq = 0;
function fact(over: Partial<FactRow> & { at?: string } = {}): FactRow {
  const startedAt = new Date(over.at || "2026-10-05T04:00:00Z"); // 09:30 in India
  const m = {
    enrolled: over.enrolled ?? 10,
    attended: over.attended ?? 8,
    plannedSize: over.plannedSize ?? 10,
    startDelayMin: over.startDelayMin ?? 2,
    lateCount: 0,
    attentionAvg: over.attentionAvg ?? 0.8,
    engagedLearners: over.engagedLearners ?? 5,
    learnerQuestions: over.learnerQuestions ?? 2,
    polls: 0,
    pollVotes: 0,
    durationMin: over.durationMin ?? 60,
    scheduledDurationMin: over.scheduledDurationMin ?? 60,
    mutes: 0,
    removals: 0,
    captureAttempts: 0,
    reviewScore: null,
  };
  return {
    recordingId: `r${++seq}`,
    roomSlug: "room-a",
    kind: "enrolled",
    subject: "Physics",
    course: "IGCSE Physics",
    topic: "Waves",
    gradeLevel: 10,
    program: "ic",
    cohort: null,
    language: "en",
    teacherId: "t1",
    teacherName: "Dr Vance",
    teacherCountry: "IND",
    teacherTimezone: "Asia/Kolkata",
    startedAt,
    endedAt: new Date(startedAt.getTime() + m.durationMin * 60000),
    scheduledDurationMin: m.scheduledDurationMin,
    startDelayMin: m.startDelayMin,
    plannedSize: m.plannedSize,
    enrolled: m.enrolled,
    attended: m.attended,
    enrolledAttended: m.attended,
    enrolledMinutes: m.attended * 50,
    peakLearners: m.attended,
    lateCount: 0,
    earlyLeaveCount: 0,
    avgMinutesPresent: 50,
    attentionAvg: m.attentionAvg,
    engagedLearners: m.engagedLearners,
    states: {},
    teacherTalkShare: 0.7,
    learnerQuestions: m.learnerQuestions,
    polls: 0,
    pollVotes: 0,
    mutes: 0,
    removals: 0,
    captureAttempts: 0,
    deviceBlocks: 0,
    notesGenerated: true,
    reviewScore: null,
    demo: false,
    ...over,
    durationMin: m.durationMin,
    components: computeComponents(m),
  };
}
const P = DEFAULT_PROFILES;

describe("time bucketing", () => {
  it("uses the viewer's timezone, including half-hour offsets", () => {
    const d = new Date("2026-10-05T04:00:00Z");
    expect(localParts(d, "Asia/Kolkata")).toMatchObject({ weekday: 0, hour: 9, minute: 30, date: "2026-10-05" });
    expect(localParts(d, "America/New_York")).toMatchObject({ weekday: 0, hour: 0, minute: 0 });
    expect(weekStart(new Date("2026-10-08T10:00:00Z"), "UTC")).toBe("2026-10-05");
  });

  it("groups by 30-minute slot and weekday", () => {
    const rows = scoreFacts([fact(), fact({ at: "2026-10-05T04:20:00Z" }), fact({ at: "2026-10-06T10:00:00Z" })], P);
    const slots = breakdown(rows, [], "slot", "Asia/Kolkata", DEFAULT_TARGETS);
    expect(slots.map((s) => [s.label, s.n]).sort()).toEqual([
      ["09:30–10:00", 2],
      ["15:30–16:00", 1],
    ]);
    const days = breakdown(rows, [], "weekday", "Asia/Kolkata", DEFAULT_TARGETS);
    expect(days.map((d) => [d.label, d.n])).toEqual([
      ["Mon", 2],
      ["Tue", 1],
    ]);
  });
});

describe("sessionMetrics", () => {
  it("pools ratios so big and small classes count by their seats", () => {
    const rows = scoreFacts([fact({ attended: 1, plannedSize: 1, enrolled: 1 }), fact({ attended: 6, plannedSize: 24, enrolled: 24 })], P);
    const m = sessionMetrics(rows, DEFAULT_TARGETS);
    expect(m.avgOccupancy).toBeCloseTo(7 / 25, 3); // not (1 + 0.25) / 2
    expect(m.attendanceRate).toBeCloseTo(7 / 25, 3);
    expect(m.avgClassSize).toBe(3.5);
  });

  it("counselling length uses talking time and reports no-shows", () => {
    const rows = scoreFacts(
      [fact({ kind: "counselling", durationMin: 40, contactMin: 30 }), fact({ kind: "admission", durationMin: 20, attended: 0, contactMin: 0 }), fact()],
      P
    );
    const m = sessionMetrics(rows, DEFAULT_TARGETS);
    expect(m.counsellingSessions).toBe(2);
    expect(m.classes).toBe(1);
    expect(m.avgCounsellingMin).toBe(25); // 30 talking + 20 (no contact data → session length)
    expect(m.counsellingNoShowRate).toBe(0.5);
  });

  it("unknown attendance isn't counted as zero, and aborted sessions are left out", () => {
    const rows = scoreFacts([fact({ attendanceTracked: false, attended: 0 }), fact({ attended: 10 }), fact({ aborted: true })], P);
    const m = sessionMetrics(rows, DEFAULT_TARGETS);
    expect(m.sessions).toBe(2);
    expect(m.attendanceRate).toBe(1);
    expect(m.attendanceUnknown).toBe(1);
  });

  it("on-time rate uses the target delay", () => {
    const m = sessionMetrics(scoreFacts([fact({ startDelayMin: 1 }), fact({ startDelayMin: 9 })], P), DEFAULT_TARGETS);
    expect(m.onTimeRate).toBe(0.5);
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });
});

describe("breakdown", () => {
  it("class size uses the peak number of learners at once (1:1 … 1:24, 1:25+)", () => {
    const rows = scoreFacts([fact({ peakLearners: 1, attended: 1 }), fact({ peakLearners: 24, attended: 24 }), fact({ peakLearners: 30, attended: 30 })], P);
    expect(breakdown(rows, [], "class_size", "UTC", DEFAULT_TARGETS).map((r) => r.label).sort()).toEqual(["1:1", "1:24", "1:25+"]);
  });

  it("teacher quality needs 5 classes to rank and shrinks toward the school mean", () => {
    const rows = scoreFacts([...Array.from({ length: 5 }, () => fact({ teacherId: "good", teacherName: "Good" })), fact({ teacherId: "new", teacherName: "New", attentionAvg: 0.2 })], P);
    const t = breakdown(rows, [], "teacher", "UTC", DEFAULT_TARGETS);
    const good = t.find((r) => r.key === "good")!;
    const fresh = t.find((r) => r.key === "new")!;
    expect(good.lowConfidence).toBe(false);
    expect(fresh.lowConfidence).toBe(true);
    expect(fresh.teacherQuality!).toBeGreaterThan(fresh.metrics.avgQuality!); // pulled up toward the mean
  });

  it("hides learner groups smaller than 3 (privacy)", () => {
    const rows = scoreFacts([fact()], P);
    const learner = (id: string, country: string) => ({ recordingId: rows[0].recordingId, learnerId: id, country, timezone: "Asia/Kolkata", gradeLevel: 10, deviceType: "laptop", enrolled: true, status: "present", minutesPresent: 50, attention: 0.8 });
    const out = breakdown(rows, [learner("a", "IND"), learner("b", "IND"), learner("c", "IND"), learner("d", "SGP")], "country", "UTC", DEFAULT_TARGETS);
    // A lone learner stays hidden even in the folded group
    expect(out.map((r) => r.label)).toEqual(["IND"]);
    expect(out.find((r) => r.key === "IND")!.metrics.attendanceRate).toBe(1);
    const folded = breakdown(rows, [learner("a", "IND"), learner("b", "IND"), learner("c", "IND"), learner("d", "SGP"), learner("e", "KEN"), learner("f", "KEN")], "country", "UTC", DEFAULT_TARGETS);
    expect(folded.map((r) => [r.label, r.n])).toEqual([
      ["IND", 3],
      ["Other (small groups)", 3],
    ]);
  });

  it("class size is unknown (not 'no learners') without join data, and empty classes aren't scored", () => {
    const rows = scoreFacts([fact({ attendanceTracked: false, attended: 0, peakLearners: 0 }), fact({ attended: 0, peakLearners: 0 })], P);
    expect(breakdown(rows, [], "class_size", "UTC", DEFAULT_TARGETS).map((r) => r.label).sort()).toEqual(["No learners", "Unknown"]);
    expect(rows[1].quality).toBeNull();
    expect(sessionMetrics(rows, DEFAULT_TARGETS).classNoShowRate).toBe(1);
  });

  it("the device view covers learners who joined", () => {
    const rows = scoreFacts([fact()], P);
    const l = (id: string, status: string, deviceType: string | null) => ({ recordingId: rows[0].recordingId, learnerId: id, country: "IND", timezone: "Asia/Kolkata", gradeLevel: 10, deviceType, enrolled: true, status, minutesPresent: 50, attention: 0.8 });
    const out = breakdown(rows, [l("a", "present", "laptop"), l("b", "present", "laptop"), l("c", "late", "laptop"), l("d", "absent", null), l("e", "absent", null), l("f", "absent", null)], "device", "UTC", DEFAULT_TARGETS);
    expect(out.map((r) => r.label)).toEqual(["Laptop"]);
    expect(out[0].metrics.attendanceRate).toBeNull();
  });
});

describe("overview pieces", () => {
  it("trend fills empty periods, distribution bins quality, mix counts kinds", () => {
    const rows = scoreFacts([fact({ at: "2026-10-01T10:00:00Z" }), fact({ at: "2026-10-03T10:00:00Z", kind: "demo" })], P);
    const t = trend(rows, "UTC", new Date("2026-10-01T00:00:00Z"), new Date("2026-10-04T00:00:00Z"), DEFAULT_TARGETS);
    expect(t.granularity).toBe("day");
    expect(t.points.map((p) => p.sessions)).toEqual([1, 0, 1, 0]);
    expect(qualityDistribution(rows).reduce((a, b) => a + b.sessions, 0)).toBe(2);
    expect(kindMix(rows).map((k) => k.kind).sort()).toEqual(["demo", "enrolled"]);
    expect(heatmap(rows, "UTC").length).toBe(2);
    expect(schoolAttention(rows)).toBeCloseTo(0.8);
  });

  it("flags weak classes and teachers whose recent classes got worse", () => {
    const good = Array.from({ length: 6 }, (_, i) => fact({ teacherId: "t9", teacherName: "Slipping", at: `2026-09-0${i + 1}T10:00:00Z` }));
    const bad = Array.from({ length: 3 }, (_, i) => fact({ teacherId: "t9", teacherName: "Slipping", at: `2026-09-1${i}T10:00:00Z`, startDelayMin: 25, attended: 2, attentionAvg: 0.2 }));
    const items = needsAttention(scoreFacts([...good, ...bad], P), DEFAULT_TARGETS);
    expect(items.some((i) => i.type === "teacher" && i.id === "t9")).toBe(true);
    expect(items.some((i) => i.type === "class")).toBe(true);
  });
});
