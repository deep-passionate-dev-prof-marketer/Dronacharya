/**
 * Turns per-frame face measurements (MediaPipe blendshapes + head pose) into role-specific
 * engagement/emotion *estimates* over a sliding window.
 *
 * These are heuristic signals, not diagnoses: facial expressions don't map reliably to inner
 * states, vary across cultures and people, and must never be the sole basis for a decision about
 * a learner or employee. Every label comes with a confidence and the raw measurements it used.
 */

export type AnalyticsRole = "student" | "instructor" | "sales_rep" | "prospect";

export interface FrameFeatures {
  t: number; // ms
  facePresent: boolean;
  /** 0..1 blendshape scores (subset we use) */
  smile: number;
  frown: number;
  browDown: number;
  browInnerUp: number;
  browOuterUp: number;
  eyeBlink: number;
  eyeWide: number;
  eyeSquint: number;
  jawOpen: number;
  mouthPress: number;
  mouthStretch: number;
  noseSneer: number;
  /** Gaze/head: degrees */
  yaw: number;
  pitch: number;
  /** Is the local mic currently above speech level */
  speaking: boolean;
}

export interface StateScore {
  label: string;
  score: number; // 0..1 confidence-ish
}

export interface EngagementSummary {
  windowSec: number;
  presence: number; // share of frames with a face
  eyeContact: number; // share of frames looking at the screen
  perclos: number; // share of frames with eyes mostly closed
  blinkPerMin: number;
  yawns: number;
  talkRatio: number;
  expressivity: number;
  states: StateScore[]; // sorted, top first
  dominant: string;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** Labels each role's dashboard uses (auditors/analysts only). */
export const ROLE_STATES: Record<AnalyticsRole, string[]> = {
  student: [
    "focused", "engaged", "curious", "excited", "loving it", "happy", "confused", "bored", "distracted",
    "sleepy", "tired", "overwhelmed", "anxious", "shy", "sad", "frustrated", "away", "camera off",
  ],
  instructor: ["energetic", "warm", "calm", "focused", "low energy", "stressed", "tired", "distracted", "away", "camera off"],
  sales_rep: ["rapport", "confident", "enthusiastic", "nervous", "defensive", "listening", "tired", "away", "camera off"],
  prospect: ["interested", "happy", "sceptical", "confused", "hesitant", "bored", "away", "camera off"],
};

export function summarise(frames: FrameFeatures[], role: AnalyticsRole, cameraOn: boolean): EngagementSummary {
  const windowSec = frames.length > 1 ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0;
  if (!cameraOn) {
    return { windowSec, presence: 0, eyeContact: 0, perclos: 0, blinkPerMin: 0, yawns: 0, talkRatio: mean(frames.map((f) => (f.speaking ? 1 : 0))), expressivity: 0, states: [{ label: "camera off", score: 1 }], dominant: "camera off" };
  }
  const present = frames.filter((f) => f.facePresent);
  const presence = frames.length ? present.length / frames.length : 0;
  const talkRatio = mean(frames.map((f) => (f.speaking ? 1 : 0)));
  if (presence < 0.3) {
    return { windowSec, presence, eyeContact: 0, perclos: 0, blinkPerMin: 0, yawns: 0, talkRatio, expressivity: 0, states: [{ label: "away", score: clamp(1 - presence) }], dominant: "away" };
  }

  const avg = (k: keyof FrameFeatures) => mean(present.map((f) => f[k] as number));
  const looking = present.filter((f) => Math.abs(f.yaw) < 22 && f.pitch > -20 && f.pitch < 20);
  const eyeContact = looking.length / present.length;
  const perclos = present.filter((f) => f.eyeBlink > 0.55).length / present.length;
  // Blinks = transitions into closed eyes
  let blinks = 0;
  let yawnFrames = 0;
  let yawns = 0;
  for (let i = 1; i < present.length; i++) {
    if (present[i].eyeBlink > 0.55 && present[i - 1].eyeBlink <= 0.55) blinks++;
    if (present[i].jawOpen > 0.55 && !present[i].speaking) {
      yawnFrames++;
      if (yawnFrames === 4) yawns++; // ~1.3s of wide-open mouth at 3fps without speech
    } else yawnFrames = 0;
  }
  const blinkPerMin = windowSec > 0 ? (blinks / windowSec) * 60 : 0;
  // Expressivity: how much the face moves between frames
  let expr = 0;
  for (let i = 1; i < present.length; i++) {
    const a = present[i];
    const b = present[i - 1];
    expr += Math.abs(a.smile - b.smile) + Math.abs(a.browDown - b.browDown) + Math.abs(a.browInnerUp - b.browInnerUp) + Math.abs(a.jawOpen - b.jawOpen);
  }
  const expressivity = clamp((expr / Math.max(1, present.length - 1)) * 4);
  const headDown = present.filter((f) => f.pitch < -15).length / present.length;
  const gazeShift = present.length > 1 ? present.slice(1).filter((f, i) => Math.abs(f.yaw - present[i].yaw) > 12).length / (present.length - 1) : 0;

  const smile = avg("smile");
  const frown = avg("frown");
  const browDown = avg("browDown");
  const browInnerUp = avg("browInnerUp");
  const browOuterUp = avg("browOuterUp");
  const eyeWide = avg("eyeWide");
  const press = avg("mouthPress");
  const stretch = avg("mouthStretch");
  const sneer = avg("noseSneer");
  const sustainedSmile = present.filter((f) => f.smile > 0.45).length / present.length;

  const s: Record<string, number> = {
    sleepy: clamp((perclos - 0.25) * 2.5),
    tired: clamp(yawns * 0.5 + (perclos > 0.15 ? 0.3 : 0) + (expressivity < 0.08 ? 0.15 : 0)),
    distracted: clamp((1 - eyeContact - 0.3) * 1.6 + gazeShift * 0.5),
    away: 0,
    happy: clamp(smile * 1.6),
    "loving it": clamp(sustainedSmile * 1.3 * eyeContact),
    excited: clamp(smile * 0.9 + (eyeWide + browOuterUp) * 0.8 + expressivity * 0.6 - 0.3),
    curious: clamp(browOuterUp * 1.4 + eyeContact * 0.3 - browDown * 0.5),
    confused: clamp(browDown * 1.2 + browInnerUp * 0.8 + press * 0.8 - smile * 0.8),
    frustrated: clamp(browDown * 1.2 + press * 1.0 + sneer * 1.2 - smile - 0.25),
    overwhelmed: clamp(browInnerUp * 1.1 + stretch * 0.9 + gazeShift * 0.8 + press * 0.5 - smile - 0.3),
    anxious: clamp(eyeWide * 1.2 + browInnerUp * 0.9 + stretch * 0.9 - smile - 0.25),
    shy: clamp(headDown * 0.9 + (1 - eyeContact) * 0.5 + (smile > 0.15 && smile < 0.45 ? 0.2 : 0) - talkRatio - 0.2),
    sad: clamp(frown * 1.6 + browInnerUp * 0.7 - smile * 1.2),
    bored: clamp((0.12 - expressivity) * 4 + headDown * 0.4 + (1 - eyeContact) * 0.3 - smile - talkRatio * 0.5),
    // Focus = steady attention with a fairly neutral face; a broad smile reads as happy, not focused
    focused: clamp(eyeContact * 0.8 - perclos - expressivity * 0.5 - smile * 0.5 + (blinkPerMin < 20 ? 0.1 : 0)),
    engaged: clamp(eyeContact * 0.6 + expressivity * 0.6 + talkRatio * 0.4 + smile * 0.3 - perclos),
  };

  const byRole: Record<AnalyticsRole, StateScore[]> = {
    student: ROLE_STATES.student.filter((l) => l in s).map((label) => ({ label, score: s[label] })),
    instructor: [
      { label: "energetic", score: clamp(expressivity * 1.4 + talkRatio * 0.5 + smile * 0.3) },
      { label: "warm", score: clamp(smile * 1.5) },
      { label: "calm", score: clamp(0.7 - gazeShift - browDown - stretch) },
      { label: "focused", score: s.focused },
      { label: "low energy", score: clamp(talkRatio > 0.3 ? (0.12 - expressivity) * 5 : 0) },
      { label: "stressed", score: clamp(browDown + press - smile - 0.2) },
      { label: "tired", score: Math.max(s.tired, s.sleepy) },
      { label: "distracted", score: s.distracted },
    ],
    sales_rep: [
      { label: "rapport", score: clamp(smile * 1.2 * eyeContact + 0.1) },
      { label: "confident", score: clamp(eyeContact * 0.9 - gazeShift - stretch) },
      { label: "enthusiastic", score: s.excited },
      { label: "nervous", score: clamp((blinkPerMin - 22) / 20 + press * 0.6 + gazeShift * 0.6 - smile * 0.5) },
      { label: "defensive", score: clamp(browDown + press + sneer - smile - 0.3) },
      { label: "listening", score: clamp((1 - talkRatio) * eyeContact) },
      { label: "tired", score: Math.max(s.tired, s.sleepy) },
    ],
    prospect: [
      { label: "interested", score: clamp(eyeContact * 0.7 + browOuterUp + smile * 0.3) },
      { label: "happy", score: s.happy },
      { label: "sceptical", score: clamp(browDown * 0.8 + press * 0.6 + Math.abs(avg("yaw")) / 60 - smile * 0.8) },
      { label: "confused", score: s.confused },
      { label: "hesitant", score: clamp(press * 0.9 + gazeShift * 0.8 + headDown * 0.4 - smile * 0.5) },
      { label: "bored", score: s.bored },
    ],
  };

  const states = byRole[role].filter((x) => x.score > 0.05).sort((a, b) => b.score - a.score);
  if (!states.length) states.push({ label: role === "student" ? "focused" : role === "instructor" ? "calm" : "listening", score: 0.3 });
  return {
    windowSec,
    presence,
    eyeContact,
    perclos,
    blinkPerMin: Math.round(blinkPerMin),
    yawns,
    talkRatio,
    expressivity,
    states: states.slice(0, 4).map((x) => ({ label: x.label, score: Math.round(x.score * 100) / 100 })),
    dominant: states[0].label,
  };
}
