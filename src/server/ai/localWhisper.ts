/**
 * Local speech-to-text on the school's own servers: a Whisper server with the OpenAI-compatible
 * transcription endpoint (whisper.cpp `whisper-server --inference-path /v1/audio/transcriptions`,
 * faster-whisper / speaches, LocalAI, …).
 *
 *   WHISPER_URL=http://localhost:8178   WHISPER_MODEL=base (name the server expects)
 *
 * Whisper isn't a streaming model, so incoming audio is cut into utterances with a simple
 * energy-based voice detector: each finished utterance becomes a final caption, and long
 * utterances get an interim caption every couple of seconds.
 */
import type { Transcriber, TranscriberFactory } from "../sttHub";
import { breakers, withTimeout } from "./providers";

const SAMPLE_RATE = 16000;

export interface SegmenterOptions {
  frameMs: number;
  /** Speech must last this long before an utterance starts (ignores clicks) */
  minSpeechMs: number;
  /** This much silence ends an utterance */
  endSilenceMs: number;
  /** Long monologues are cut here so captions keep flowing */
  maxSegmentMs: number;
  /** Audio kept from just before speech started (first syllable) */
  preRollMs: number;
  /** Interim captions during long utterances */
  interimEveryMs: number;
  /** Absolute RMS floor (0..1) below which nothing counts as speech */
  minRms: number;
  /** Speech = RMS above noise floor × this */
  noiseFactor: number;
}

export const DEFAULT_SEGMENTER: SegmenterOptions = {
  frameMs: 30,
  minSpeechMs: 150,
  endSilenceMs: 700,
  maxSegmentMs: 15_000,
  preRollMs: 300,
  interimEveryMs: 2_000,
  minRms: 0.01,
  noiseFactor: 3,
};

export type SegmentEvent = { type: "interim" | "final"; pcm: Int16Array };

/** Energy-based voice activity detection that turns a PCM16 stream into utterances. */
export class SpeechSegmenter {
  private o: SegmenterOptions;
  private frameLen: number;
  private carry: Int16Array = new Int16Array(0);
  private preRoll: Int16Array[] = [];
  private speech: Int16Array[] = [];
  private inSpeech = false;
  private speechRun = 0; // ms of consecutive speech before starting
  private silenceRun = 0; // ms of silence inside an utterance
  private segmentMs = 0;
  private sinceInterim = 0;
  private noise = 0.005;

  constructor(opts: Partial<SegmenterOptions> = {}) {
    this.o = { ...DEFAULT_SEGMENTER, ...opts };
    this.frameLen = Math.round((SAMPLE_RATE * this.o.frameMs) / 1000);
  }

  static rms(frame: Int16Array) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += (frame[i] / 32768) ** 2;
    return Math.sqrt(sum / Math.max(1, frame.length));
  }

  push(pcm: Int16Array): SegmentEvent[] {
    const events: SegmentEvent[] = [];
    const all = new Int16Array(this.carry.length + pcm.length);
    all.set(this.carry);
    all.set(pcm, this.carry.length);
    let off = 0;
    for (; off + this.frameLen <= all.length; off += this.frameLen) {
      const frame = all.slice(off, off + this.frameLen);
      const level = SpeechSegmenter.rms(frame);
      const isSpeech = level > Math.max(this.o.minRms, this.noise * this.o.noiseFactor);
      if (!this.inSpeech) {
        // Track background noise only while nobody is talking
        if (!isSpeech) this.noise = this.noise * 0.95 + level * 0.05;
        this.preRoll.push(frame);
        while (this.preRoll.length * this.o.frameMs > this.o.preRollMs + this.o.minSpeechMs) this.preRoll.shift();
        this.speechRun = isSpeech ? this.speechRun + this.o.frameMs : 0;
        if (this.speechRun >= this.o.minSpeechMs) {
          this.inSpeech = true;
          this.speech = [...this.preRoll];
          this.preRoll = [];
          this.segmentMs = this.speech.length * this.o.frameMs;
          this.silenceRun = 0;
          this.sinceInterim = 0;
        }
        continue;
      }
      this.speech.push(frame);
      this.segmentMs += this.o.frameMs;
      this.sinceInterim += this.o.frameMs;
      this.silenceRun = isSpeech ? 0 : this.silenceRun + this.o.frameMs;
      if (this.silenceRun >= this.o.endSilenceMs || this.segmentMs >= this.o.maxSegmentMs) {
        events.push({ type: "final", pcm: this.take() });
      } else if (this.sinceInterim >= this.o.interimEveryMs && this.silenceRun < 300) {
        // Only while someone is still talking (not in the pause that's about to end the utterance)
        this.sinceInterim = 0;
        events.push({ type: "interim", pcm: concat(this.speech) });
      }
    }
    this.carry = all.slice(off);
    return events;
  }

  /** End of stream: whatever was being said becomes final. */
  flush(): SegmentEvent[] {
    return this.inSpeech && this.speech.length ? [{ type: "final", pcm: this.take() }] : [];
  }

  private take() {
    // Trim the trailing silence that ended the utterance
    const keep = Math.max(1, this.speech.length - Math.floor(this.silenceRun / this.o.frameMs) + 2);
    const out = concat(this.speech.slice(0, keep));
    this.inSpeech = false;
    this.speech = [];
    this.speechRun = 0;
    this.silenceRun = 0;
    this.segmentMs = 0;
    return out;
  }
}

function concat(parts: Int16Array[]) {
  const out = new Int16Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** 16 kHz mono PCM16 → WAV file bytes. */
export function wavFromPcm16(pcm: Int16Array, sampleRate = SAMPLE_RATE): Buffer {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// Whisper's well-known outputs for silence/noise (it "hears" these when there's no speech)
const HALLUCINATIONS = [/^(thank you|thanks)( (so much|very much|for watching|for listening))?[.!]?$/i, /^(bye|you|okay|so)[.!]?$/i, /subtitles? (by|from)/i, /^\W*$/];

/** Cleans Whisper output: drops [BLANK_AUDIO]-style tags, low-confidence segments and silence hallucinations. */
export function cleanWhisperText(data: any): string {
  let text: string;
  if (Array.isArray(data?.segments) && data.segments.length) {
    text = data.segments
      .filter((s: any) => !(Number(s?.no_speech_prob) > 0.6 && Number(s?.avg_logprob ?? -1) < -0.5))
      .map((s: any) => String(s?.text || ""))
      // Segments carry their own leading spaces; a segment can start mid-word ("fr" + "inges")
      .join("");
  } else text = String(data?.text || "");
  text = text
    .replace(/\[[^\]]*\]|\([^)]*\)|<\|[^|]*\|>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return HALLUCINATIONS.some((re) => re.test(text)) ? "" : text;
}

const whisperBase = () => (process.env.WHISPER_URL || "").replace(/\/+$/, "");

/** One utterance → text. */
export async function transcribeWithWhisper(pcm: Int16Array, lang?: string): Promise<string> {
  if (!whisperBase()) throw new Error("WHISPER_URL is not set");
  return withTimeout(
    async (signal) => {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(wavFromPcm16(pcm))], { type: "audio/wav" }), "speech.wav");
      form.append("model", process.env.WHISPER_MODEL || "base");
      form.append("response_format", "verbose_json");
      form.append("temperature", "0");
      const language = (lang || "").split("-")[0].toLowerCase();
      if (/^[a-z]{2,3}$/.test(language)) form.append("language", language);
      const res = await fetch(`${whisperBase()}${process.env.WHISPER_PATH || "/v1/audio/transcriptions"}`, { method: "POST", body: form, signal });
      if (!res.ok) throw Object.assign(new Error(`Whisper HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}`), { status: res.status });
      const ct = res.headers.get("content-type") || "";
      return cleanWhisperText(ct.includes("json") ? await res.json() : { text: await res.text() });
    },
    Number(process.env.WHISPER_TIMEOUT_MS || 20_000),
    "Local Whisper"
  );
}

/** Streaming transcriber built on the segmenter + Whisper server. */
export const localWhisperTranscriber: TranscriberFactory = async (opts, cb) => {
  if (!whisperBase()) throw new Error("WHISPER_URL is not set");
  if (!breakers.whisper.available()) throw new Error("Local Whisper is cooling down after failures");
  const seg = new SpeechSegmenter();
  const finals: Int16Array[] = [];
  let busy = false;
  let closed = false;
  let failures = 0;

  const run = async (pcm: Int16Array, final: boolean) => {
    busy = true;
    try {
      const text = await transcribeWithWhisper(pcm, opts.lang);
      failures = 0;
      breakers.whisper.success();
      // A final from the closing flush is still delivered; interims after close aren't needed
      if (text && (final || !closed)) (final ? cb.onFinal : cb.onInterim)(text);
    } catch (err: any) {
      breakers.whisper.failure(err);
      if (++failures >= 2 && !closed) cb.onError(`Local captions unavailable: ${String(err?.message || err).slice(0, 120)}`);
    } finally {
      busy = false;
    }
  };

  const pump = async () => {
    while (!busy && finals.length) await run(finals.shift()!, true);
  };

  const handle = (events: SegmentEvent[]) => {
    for (const e of events) {
      if (e.type === "final") {
        finals.push(e.pcm);
        if (finals.length > 4) finals.shift(); // falling behind: drop the oldest rather than lag further
      } else if (!busy && !finals.length && !closed) {
        run(e.pcm, false); // interim only when idle
      }
    }
    pump();
  };

  const transcriber: Transcriber = {
    send(pcm16: Buffer) {
      if (closed) return;
      const view = new Int16Array(pcm16.buffer.slice(pcm16.byteOffset, pcm16.byteOffset + pcm16.byteLength));
      handle(seg.push(view));
    },
    close() {
      if (closed) return;
      closed = true; // no more audio; the utterance in progress is still transcribed
      handle(seg.flush());
    },
  };
  return transcriber;
};
