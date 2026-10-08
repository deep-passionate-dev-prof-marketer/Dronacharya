/**
 * On-device face analysis for engagement analytics.
 *
 * Runs MediaPipe Face Landmarker (~3 fps) on the participant's *own* camera in their browser.
 * No video ever leaves the device for analysis: only a small summary every 5s goes to our server,
 * which shares it with auditors/analysts only (never with the room, teachers or students).
 * Model and WASM are self-hosted under /models and /mediapipe.
 */
import { AnalyticsRole, FrameFeatures, summarise } from "./emotionClassifier";

interface StartOptions {
  stream: MediaStream;
  roomSlug: string;
  participant: { id: string; name: string; role: string };
  role: AnalyticsRole;
  isSpeaking: () => boolean;
}

const FRAME_MS = 333;
const REPORT_MS = 5000;
const WINDOW_MS = 10000;

type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, t: number) => any;
  close: () => void;
};

let landmarkerPromise: Promise<Landmarker> | null = null;

async function loadLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const make = (delegate: "GPU" | "CPU") =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      try {
        return (await make("GPU")) as unknown as Landmarker;
      } catch {
        return (await make("CPU")) as unknown as Landmarker;
      }
    })();
    landmarkerPromise.catch(() => (landmarkerPromise = null));
  }
  return landmarkerPromise;
}

function featuresFrom(result: any, speaking: boolean): FrameFeatures {
  const t = performance.now();
  const shapes = result?.faceBlendshapes?.[0]?.categories as Array<{ categoryName: string; score: number }> | undefined;
  if (!shapes) {
    return { t, facePresent: false, smile: 0, frown: 0, browDown: 0, browInnerUp: 0, browOuterUp: 0, eyeBlink: 0, eyeWide: 0, eyeSquint: 0, jawOpen: 0, mouthPress: 0, mouthStretch: 0, noseSneer: 0, yaw: 0, pitch: 0, speaking };
  }
  const b: Record<string, number> = {};
  for (const c of shapes) b[c.categoryName] = c.score;
  const pair = (name: string) => ((b[`${name}Left`] || 0) + (b[`${name}Right`] || 0)) / 2;

  // Head pose from the 4x4 (column-major) facial transformation matrix
  let yaw = 0;
  let pitch = 0;
  const m = result?.facialTransformationMatrixes?.[0]?.data as number[] | undefined;
  if (m && m.length >= 11) {
    yaw = (Math.asin(Math.max(-1, Math.min(1, -m[2]))) * 180) / Math.PI;
    pitch = (Math.atan2(m[6], m[10]) * 180) / Math.PI;
  }
  return {
    t,
    facePresent: true,
    smile: pair("mouthSmile"),
    frown: pair("mouthFrown"),
    browDown: pair("browDown"),
    browInnerUp: b.browInnerUp || 0,
    browOuterUp: pair("browOuterUp"),
    eyeBlink: pair("eyeBlink"),
    eyeWide: pair("eyeWide"),
    eyeSquint: pair("eyeSquint"),
    jawOpen: b.jawOpen || 0,
    mouthPress: pair("mouthPress"),
    mouthStretch: pair("mouthStretch"),
    noseSneer: pair("noseSneer"),
    yaw,
    pitch,
    speaking,
  };
}

class EngagementRunner {
  private video: HTMLVideoElement | null = null;
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private reportTimer: ReturnType<typeof setInterval> | null = null;
  private frames: FrameFeatures[] = [];
  private opts: StartOptions | null = null;
  private status: "idle" | "loading" | "running" | "error" = "idle";

  getStatus() {
    return this.status;
  }

  /** Warm up the model (e.g. while the consent screen is open) so analysis starts instantly. */
  preload() {
    return loadLandmarker().then(() => true);
  }

  async start(opts: StartOptions) {
    this.stop();
    this.opts = opts;
    this.status = "loading";
    let landmarker: Landmarker;
    try {
      landmarker = await loadLandmarker();
    } catch (err) {
      console.warn("[Engagement] Face model failed to load:", err);
      this.status = "error";
      return;
    }
    if (this.opts !== opts) return; // stopped or restarted while loading

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream(opts.stream.getVideoTracks());
    video.play().catch(() => {});
    this.video = video;
    this.status = "running";

    this.frameTimer = setInterval(() => {
      const track = opts.stream.getVideoTracks()[0];
      const cameraOn = Boolean(track && track.enabled && track.readyState === "live");
      if (!cameraOn || video.readyState < 2) {
        this.push({ ...featuresFrom(null, opts.isSpeaking()), facePresent: false });
        return;
      }
      try {
        this.push(featuresFrom(landmarker.detectForVideo(video, performance.now()), opts.isSpeaking()));
      } catch {
        // A dropped frame is fine; the window smooths over it
      }
    }, FRAME_MS);

    this.reportTimer = setInterval(() => this.report(), REPORT_MS);
  }

  private push(f: FrameFeatures) {
    this.frames.push(f);
    const cutoff = f.t - WINDOW_MS;
    while (this.frames.length && this.frames[0].t < cutoff) this.frames.shift();
  }

  private report() {
    const opts = this.opts;
    if (!opts || this.frames.length < 5) return;
    const track = opts.stream.getVideoTracks()[0];
    const cameraOn = Boolean(track && track.enabled && track.readyState === "live");
    const summary = summarise(this.frames, opts.role, cameraOn);
    fetch("/api/engagement/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ roomSlug: opts.roomSlug, participant: opts.participant, at: new Date().toISOString(), summary }),
    }).catch(() => {});
  }

  stop() {
    if (this.frameTimer) clearInterval(this.frameTimer);
    if (this.reportTimer) clearInterval(this.reportTimer);
    this.frameTimer = this.reportTimer = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.frames = [];
    this.opts = null;
    this.status = "idle";
  }
}

export const engagementRunner = new EngagementRunner();
