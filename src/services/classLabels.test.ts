import { describe, expect, it } from "vitest";
import { describeClass, KIND_LABEL } from "./classLabels";

const base = { subject: "Physics", topic: "Wave optics", course: "Grade 10 Physics", scheduledStart: "2026-10-12T04:30:00.000Z", teacherName: "Dr. Evelyn Vance" };

describe("class labels", () => {
  it("shows weekday and date for enrolled classes", () => {
    const h = describeClass({ ...base, kind: "enrolled" }, "en-GB", "Asia/Kolkata");
    expect(h.badge).toBe("Class");
    expect(h.title).toBe("Physics: Wave optics");
    expect(h.detail).toContain("Monday · 12 Oct");
    expect(h.detail).toContain("Dr. Evelyn Vance");
  });

  it("doesn't add a day for demo / doubt-clearing / admission sessions", () => {
    expect(describeClass({ ...base, kind: "demo" }, "en-GB", "UTC").detail).not.toMatch(/Monday/);
    expect(describeClass({ ...base, kind: "doubt_clearing" }).badge).toBe("Doubt-clearing session");
  });

  it("never calls a counselling session a sales pitch", () => {
    const h = describeClass({ ...base, kind: "counselling", subject: "Academic guidance" });
    expect(h.badge).toBe("Academic counselling");
    expect(JSON.stringify(h).toLowerCase()).not.toContain("sales");
    expect(Object.values(KIND_LABEL).join(" ").toLowerCase()).not.toMatch(/sales|pitch/);
  });
});
