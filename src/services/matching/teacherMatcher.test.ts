import { describe, expect, it } from "vitest";
import { FACULTY_ROSTER } from "./facultyRoster";
import { Booking, findOpenSection, matchTeachers, subjectScore, MatchRequest } from "./teacherMatcher";

// Wednesday 2026-10-14 05:30 UTC = 11:00 in India, 09:30 in Dubai, 13:30 in Singapore, 06:30 London, 07:30 Berlin
const WED_1100_IST = "2026-10-14T05:30:00.000Z";

const base: MatchRequest = {
  subject: "Quantum Physics & Advanced Mechanics",
  gradeLevel: 10,
  program: "ic",
  language: "hi",
  startUtc: WED_1100_IST,
  durationMin: 60,
  classSize: 1,
  studentCountryIso2: "IN",
  studentTimezone: "Asia/Kolkata",
};

describe("subjectScore", () => {
  it("matches a long subject title against a short teacher subject (old matcher used a substring test and failed)", () => {
    expect(subjectScore("Quantum Physics & Advanced Mechanics", ["Physics"]).score).toBeGreaterThanOrEqual(22);
    expect(subjectScore("Maths", ["Mathematics"]).score).toBe(30);
  });
  it("gives only partial credit for a related subject and none for unrelated ones", () => {
    expect(subjectScore("Data Science", ["Linear Algebra"]).score).toBe(12);
    expect(subjectScore("Chemistry", ["Coding"]).score).toBe(0);
  });
  it("doesn't treat Computer Science / Data Science as physical sciences", () => {
    expect(subjectScore("Quantum Physics & Mechanics", ["Robotics", "Coding", "Artificial Intelligence", "Computer Science"]).score).toBe(0);
    expect(subjectScore("Quantum Physics & Mechanics", ["Mathematics", "Data Science"]).score).toBe(0);
    expect(subjectScore("Python", ["Computer Science"]).score).toBe(0);
    expect(subjectScore("Computer Science", ["Coding"]).score).toBe(12);
  });
});

describe("matchTeachers", () => {
  it("picks a qualified Hindi-speaking physics teacher who is available in their own timezone", () => {
    const { ranked } = matchTeachers(base, FACULTY_ROSTER, []);
    expect(ranked[0].teacherId).toBe("tch-vance");
    expect(ranked.every((c) => c.eligible)).toBe(true);
  });

  it("excludes teachers who don't speak the language unless the interpreter is allowed", () => {
    const { excluded } = matchTeachers({ ...base, program: undefined }, FACULTY_ROSTER, []);
    const schmidt = excluded.find((c) => c.teacherId === "tch-schmidt")!;
    expect(schmidt.blockers.some((b) => b.includes("HI"))).toBe(true);
  });

  it("refuses double-booking the same teacher", () => {
    const booking: Booking = {
      id: "b1",
      teacherId: "tch-vance",
      startUtc: WED_1100_IST,
      endUtc: "2026-10-14T06:30:00.000Z",
      roomSlug: "r1",
      subject: "Physics",
      gradeLevel: 10,
      language: "hi",
      classSize: 1,
      studentKeys: ["s1"],
      createdAt: new Date().toISOString(),
    };
    const { ranked, excluded } = matchTeachers(base, FACULTY_ROSTER, [booking]);
    expect(ranked.find((c) => c.teacherId === "tch-vance")).toBeUndefined();
    expect(excluded.find((c) => c.teacherId === "tch-vance")!.blockers[0]).toMatch(/Already teaching/);
  });

  it("respects availability in the teacher's timezone and class size limits", () => {
    const { excluded } = matchTeachers({ ...base, program: undefined, language: "en", classSize: 20 }, FACULTY_ROSTER, []);
    expect(excluded.find((c) => c.teacherId === "tch-dubois")!.blockers.join()).toMatch(/Not available at 06:30/);
    expect(excluded.find((c) => c.teacherId === "tch-ray")!.blockers.join()).toMatch(/up to 1:12/);
  });
});

describe("findOpenSection", () => {
  it("fills an existing group class before opening a new one", () => {
    const section: Booking = {
      id: "b2",
      teacherId: "tch-vance",
      startUtc: WED_1100_IST,
      endUtc: "2026-10-14T06:30:00.000Z",
      roomSlug: "r2",
      subject: "Quantum Physics",
      gradeLevel: 10,
      program: "ic",
      language: "hi",
      classSize: 4,
      studentKeys: ["s1", "s2"],
      createdAt: new Date().toISOString(),
    };
    expect(findOpenSection({ ...base, classSize: 4 }, [section])?.id).toBe("b2");
    expect(findOpenSection({ ...base, classSize: 4 }, [{ ...section, studentKeys: ["a", "b", "c", "d"] }])).toBeUndefined();
  });
});
