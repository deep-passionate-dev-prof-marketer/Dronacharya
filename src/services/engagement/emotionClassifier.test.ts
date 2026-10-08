import { describe, expect, it } from "vitest";
import { FrameFeatures, summarise } from "./emotionClassifier";

const neutral: Omit<FrameFeatures, "t"> = {
  facePresent: true,
  smile: 0.05,
  frown: 0,
  browDown: 0.05,
  browInnerUp: 0.05,
  browOuterUp: 0.05,
  eyeBlink: 0.1,
  eyeWide: 0.05,
  eyeSquint: 0.05,
  jawOpen: 0.02,
  mouthPress: 0.05,
  mouthStretch: 0.02,
  noseSneer: 0,
  yaw: 0,
  pitch: 0,
  speaking: false,
};

const seq = (n: number, f: (i: number) => Partial<FrameFeatures>): FrameFeatures[] =>
  Array.from({ length: n }, (_, i) => ({ ...neutral, t: i * 333, ...f(i) }));

describe("emotion classifier", () => {
  it("flags sleepy when eyes stay closed most of the window", () => {
    const s = summarise(seq(30, () => ({ eyeBlink: 0.9 })), "student", true);
    expect(s.dominant).toBe("sleepy");
    expect(s.perclos).toBeGreaterThan(0.8);
  });

  it("recognises a sustained smile with eye contact as happy / loving it", () => {
    const s = summarise(seq(30, () => ({ smile: 0.8 })), "student", true);
    expect(["happy", "loving it"]).toContain(s.dominant);
  });

  it("reports away when no face is visible, and camera off when the camera is off", () => {
    expect(summarise(seq(30, () => ({ facePresent: false })), "student", true).dominant).toBe("away");
    expect(summarise(seq(30, () => ({})), "student", false).dominant).toBe("camera off");
  });

  it("detects confusion cues (brows lowered + inner brows raised + pressed lips)", () => {
    const s = summarise(seq(30, () => ({ browDown: 0.5, browInnerUp: 0.4, mouthPress: 0.4 })), "student", true);
    expect(s.states.map((x) => x.label)).toContain("confused");
  });

  it("uses a different vocabulary for teachers and sales reps", () => {
    const teacher = summarise(seq(30, (i) => ({ smile: 0.6, speaking: i % 2 === 0, jawOpen: i % 2 ? 0.3 : 0.05 })), "instructor", true);
    expect(["warm", "energetic", "calm", "focused"]).toContain(teacher.dominant);
    const rep = summarise(seq(30, () => ({ smile: 0.6 })), "sales_rep", true);
    expect(rep.states.map((x) => x.label)).toContain("rapport");
  });
});
