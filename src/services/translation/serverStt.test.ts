import { describe, expect, it } from "vitest";
import { WORKLET } from "./serverStt";

/** Runs the worklet source in a fake AudioWorkletGlobalScope. */
function makeProcessor(sampleRate: number) {
  const chunks: Int16Array[] = [];
  let Cls: any;
  const scope = {
    sampleRate,
    AudioWorkletProcessor: class {
      port = { postMessage: (buf: ArrayBuffer) => chunks.push(new Int16Array(buf)) };
    },
    registerProcessor: (_name: string, cls: any) => (Cls = cls),
  };
  new Function("sampleRate", "AudioWorkletProcessor", "registerProcessor", WORKLET)(scope.sampleRate, scope.AudioWorkletProcessor, scope.registerProcessor);
  return { proc: new Cls(), chunks };
}

describe("PCM downsampler worklet", () => {
  it("turns 48 kHz float audio into 100 ms chunks of 16 kHz PCM16, preserving the tone", () => {
    const { proc, chunks } = makeProcessor(48000);
    const freq = 440;
    let t = 0;
    for (let b = 0; b < 375; b++) {
      // 375 blocks × 128 samples = 1 s at 48 kHz
      const block = new Float32Array(128);
      for (let i = 0; i < 128; i++, t++) block[i] = 0.5 * Math.sin((2 * Math.PI * freq * t) / 48000);
      expect(proc.process([[block]])).toBe(true);
    }
    expect(chunks.length).toBe(10); // 1 s = 10 × 100 ms
    expect(chunks.every((c) => c.length === 1600)).toBe(true);
    const pcm = Int16Array.from(chunks.flatMap((c) => Array.from(c)));
    // Amplitude ~0.5 of full scale, and ~440 zero crossings per second ×2
    const peak = Math.max(...Array.from(pcm).map(Math.abs));
    expect(peak).toBeGreaterThan(0.48 * 0x7fff);
    expect(peak).toBeLessThan(0.51 * 0x7fff);
    let crossings = 0;
    for (let i = 1; i < pcm.length; i++) if ((pcm[i - 1] < 0) !== (pcm[i] < 0)) crossings++;
    expect(Math.abs(crossings - 2 * freq)).toBeLessThanOrEqual(2);
  });

  it("handles a 44.1 kHz input (non-integer ratio) and silence without NaNs", () => {
    const { proc, chunks } = makeProcessor(44100);
    for (let b = 0; b < 345; b++) proc.process([[new Float32Array(128)]]); // ~1 s
    expect(chunks.length).toBe(Math.floor((345 * 128) / (44100 / 16000) / 1600));
    expect(chunks.every((c) => c.every((v) => v === 0))).toBe(true);
    expect(proc.process([[]])).toBe(true); // no channel data
  });
});
