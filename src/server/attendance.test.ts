import { describe, expect, it } from "vitest";
import { computeAttendance } from "./attendance";

const T = (min: number) => new Date(Date.UTC(2026, 9, 9, 10, 0) + min * 60000);
const ev = (event: "join" | "leave", min: number) => ({ event, at: T(min).toISOString() });

describe("computeAttendance", () => {
  it("absent when the learner never joined", () => {
    expect(computeAttendance([], T(0), T(60))).toMatchObject({ status: "absent", minutesPresent: 0, sessionMinutes: 60, firstJoinAt: null });
  });

  it("present for the whole class, counting an early join from the start", () => {
    expect(computeAttendance([ev("join", -3), ev("leave", 61)], T(0), T(60))).toMatchObject({ status: "present", minutesPresent: 60, firstJoinAt: T(0).toISOString() });
  });

  it("late when joining more than 5 minutes after the start", () => {
    expect(computeAttendance([ev("join", 12)], T(0), T(60))).toMatchObject({ status: "late", minutesPresent: 48 });
  });

  it("adds up reconnects and marks leaving early", () => {
    const r = computeAttendance([ev("join", 1), ev("leave", 20), ev("join", 22), ev("leave", 40)], T(0), T(60));
    expect(r).toMatchObject({ status: "left_early", minutesPresent: 37, lastLeaveAt: T(40).toISOString() });
  });

  it("a running class counts up to now, and events from other days are ignored", () => {
    expect(computeAttendance([ev("join", -24 * 60), ev("leave", -24 * 60 + 50), ev("join", 2)], T(0), T(30))).toMatchObject({ status: "present", minutesPresent: 28 });
  });

  it("ignores a stray leave without a join", () => {
    expect(computeAttendance([ev("leave", 1), ev("join", 3), ev("leave", 59)], T(0), T(60))).toMatchObject({ status: "present", minutesPresent: 56 });
  });
});
