import { describe, expect, it } from "vitest";
import { cleanWhisperText, SpeechSegmenter, wavFromPcm16 } from "./localWhisper";

const RATE = 16000;
/** ms of audio: "speech" is a 220 Hz tone at 30% volume, "silence" is faint noise */
function audio(spec: Array<["speech" | "silence", number]>) {
  const parts: number[] = [];
  let t = 0;
  for (const [kind, ms] of spec) {
    const n = (RATE * ms) / 1000;
    for (let i = 0; i < n; i++, t++) {
      const v = kind === "speech" ? 0.3 * Math.sin((2 * Math.PI * 220 * t) / RATE) : (Math.random() - 0.5) * 0.004;
      parts.push(Math.round(v * 32767));
    }
  }
  return Int16Array.from(parts);
}
/** Feeds the stream in 100 ms chunks, like the browser does */
function feed(seg: SpeechSegmenter, pcm: Int16Array) {
  const events = [];
  for (let i = 0; i < pcm.length; i += 1600) events.push(...seg.push(pcm.subarray(i, i + 1600)));
  return events;
}
const ms = (pcm: Int16Array) => Math.round((pcm.length / RATE) * 1000);

describe("SpeechSegmenter", () => {
  it("turns one spoken phrase between pauses into one utterance", () => {
    const events = feed(new SpeechSegmenter(), audio([["silence", 1000], ["speech", 1500], ["silence", 1200]]));
    const finals = events.filter((e) => e.type === "final");
    expect(finals.length).toBe(1);
    expect(events.some((e) => e.type === "interim")).toBe(false); // short phrase: no interim needed
    // speech + a little pre-roll + a little trailing silence
    expect(ms(finals[0].pcm)).toBeGreaterThanOrEqual(1500);
    expect(ms(finals[0].pcm)).toBeLessThanOrEqual(1500 + 300 + 200);
  });

  it("ignores short clicks and keeps quiet rooms silent", () => {
    const events = feed(new SpeechSegmenter(), audio([["silence", 500], ["speech", 60], ["silence", 2000]]));
    expect(events).toEqual([]);
  });

  it("gives interim updates during long speech and cuts monologues at 15 s", () => {
    const seg = new SpeechSegmenter();
    const events = feed(seg, audio([["silence", 300], ["speech", 20000]]));
    expect(events.filter((e) => e.type === "interim").length).toBeGreaterThanOrEqual(5);
    const finals = events.filter((e) => e.type === "final");
    expect(finals.length).toBe(1);
    expect(ms(finals[0].pcm)).toBeLessThanOrEqual(15000 + 30);
    const rest = seg.flush();
    expect(rest.length).toBe(1);
    expect(ms(rest[0].pcm)).toBeGreaterThan(4000);
  });

  it("splits two phrases separated by a pause", () => {
    const finals = feed(new SpeechSegmenter(), audio([["silence", 500], ["speech", 1000], ["silence", 900], ["speech", 1000], ["silence", 900]])).filter((e) => e.type === "final");
    expect(finals.length).toBe(2);
  });
});

describe("wavFromPcm16", () => {
  it("writes a valid 16 kHz mono PCM WAV header", () => {
    const wav = wavFromPcm16(new Int16Array([0, 1000, -1000]));
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(16000);
    expect(wav.readUInt32LE(40)).toBe(6); // 3 samples × 2 bytes
    expect(wav.length).toBe(44 + 6);
    expect(wav.readInt16LE(46)).toBe(1000);
  });
});

describe("cleanWhisperText", () => {
  it("drops silence markers and Whisper's silence hallucinations", () => {
    expect(cleanWhisperText({ text: " [BLANK_AUDIO] " })).toBe("");
    expect(cleanWhisperText({ text: "Thank you." })).toBe("");
    expect(cleanWhisperText({ text: "Thanks for watching!" })).toBe("");
    expect(cleanWhisperText({ text: " (music) Today we study waves. " })).toBe("Today we study waves.");
  });

  it("keeps confident segments and drops likely-noise ones", () => {
    const data = {
      text: "ignored",
      segments: [
        { text: " Force equals mass times acceleration.", no_speech_prob: 0.02, avg_logprob: -0.2 },
        { text: " Subtitles by the community", no_speech_prob: 0.9, avg_logprob: -1.2 },
      ],
    };
    expect(cleanWhisperText(data)).toBe("Force equals mass times acceleration.");
  });

  it("doesn't split words that span two segments", () => {
    expect(cleanWhisperText({ segments: [{ text: " bright and dark fr" }, { text: "inges on the screen." }] })).toBe("bright and dark fringes on the screen.");
  });
});
