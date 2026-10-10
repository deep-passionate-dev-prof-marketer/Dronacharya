import { describe, expect, it } from "vitest";
import { attendedThresholdMin, contactMinutes, peakConcurrency, presenceIntervals, startDelay } from "./facts";

const T = (min: number) => new Date(Date.UTC(2026, 9, 1, 10, 0) + min * 60000);
const start = T(0).getTime();
const end = T(60).getTime();

describe("presenceIntervals", () => {
  it("clips to the class and closes open stays at the end", () => {
    expect(presenceIntervals([{ event: "join", at: T(-5) }, { event: "leave", at: T(20) }, { event: "join", at: T(30) }], start, end)).toEqual([
      { start, end: T(20).getTime() },
      { start: T(30).getTime(), end },
    ]);
  });
  it("ignores leaves without a join and events after the end", () => {
    expect(presenceIntervals([{ event: "leave", at: T(5) }, { event: "join", at: T(70) }], start, end)).toEqual([]);
  });
});

describe("peakConcurrency", () => {
  it("counts the most people present at once (a reconnect isn't two people)", () => {
    const a = [{ start: T(0).getTime(), end: T(30).getTime() }, { start: T(30).getTime(), end: T(60).getTime() }];
    const b = [{ start: T(10).getTime(), end: T(50).getTime() }];
    const c = [{ start: T(55).getTime(), end: T(60).getTime() }];
    expect(peakConcurrency([a, b, c])).toBe(2);
    expect(peakConcurrency([])).toBe(0);
  });
});

describe("startDelay", () => {
  it("minutes late (or early) when run in its slot; nothing when run on another day", () => {
    expect(startDelay(T(0), T(7))).toBe(7);
    expect(startDelay(T(0), T(-3))).toBe(-3);
    expect(startDelay(T(0), T(24 * 60))).toBeNull();
    expect(startDelay(T(0), T(150))).toBeNull();
    expect(startDelay(null, T(0))).toBeNull();
  });
});

describe("contactMinutes", () => {
  it("counts only time the host and at least one learner overlapped", () => {
    const host = [{ start: T(0).getTime(), end: T(30).getTime() }];
    const a = [{ start: T(10).getTime(), end: T(20).getTime() }];
    const b = [{ start: T(15).getTime(), end: T(40).getTime() }];
    expect(contactMinutes(host, [a, b])).toBe(20); // 10..30 covered by a ∪ b
    expect(contactMinutes([], [a])).toBe(0);
  });
});

describe("attendedThresholdMin", () => {
  it("is 5 minutes, or a quarter of a short session", () => {
    expect(attendedThresholdMin(60)).toBe(5);
    expect(attendedThresholdMin(8)).toBe(2);
  });
});
