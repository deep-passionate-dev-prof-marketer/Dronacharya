/**
 * "Ask about this class": answers only from the class transcript, trying providers in order
 * (AI_PROVIDERS, default gemini,local):
 *  - Gemini, then the local model on our servers: a short answer citing the minutes used.
 *  - If neither is available: the transcript lines that best match the question, quoted as-is.
 */
import { GoogleGenAI, Type } from "@google/genai";
import type { TranscriptEntry } from "./notes";
import { breakers, geminiConfigured, ollamaConfigured, providerOrder, withTimeout } from "../ai/providers";
import { approxTokens, ollamaContext, ollamaJson } from "../ai/localLlm";

export interface AskAnswer {
  answer: string | null;
  quotes: Array<{ minute: number; speakerName: string | null; text: string }>;
  generator: "gemini" | "local" | "search";
}

const STOP = new Set("a an the and or of to in on at is are was were be what why how when who which does do did can could would should it this that these those for with about from by as i you we they he she me my our your".split(" "));
const terms = (t: string) => (t.toLowerCase().match(/[a-z0-9][a-z0-9'-]+/g) || []).filter((w) => !STOP.has(w));

/** Transcript lines ranked by how many question words they share (with simple plural folding). */
export function searchTranscript(question: string, lines: TranscriptEntry[], startedAt: string, limit = 5) {
  const t0 = new Date(startedAt).getTime();
  const fold = (w: string) => (w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y" : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
  const q = new Set(terms(question).map(fold));
  if (!q.size) return [];
  return lines
    .map((l, i) => {
      const ws = new Set(terms(l.text).map(fold));
      let hits = 0;
      for (const w of q) if (ws.has(w)) hits++;
      return { i, hits, l };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.i - b.i)
    .slice(0, limit)
    .sort((a, b) => a.i - b.i)
    .map(({ l }) => ({ minute: Math.max(0, Math.floor((new Date(l.at).getTime() - t0) / 60000)), speakerName: l.speakerName, text: l.text }));
}

const minuteOf = (at: string, t0: number) => Math.max(0, Math.floor((new Date(at).getTime() - t0) / 60000));
const line = (l: TranscriptEntry, t0: number) => `[${minuteOf(l.at, t0)}m] ${l.speakerName || "Speaker"}: ${l.text}`;
const PROMPT = (question: string, transcript: string) =>
  `Answer a student's question using ONLY this class transcript. If the transcript doesn't cover it, say so plainly. ` +
  `Keep it to 2-4 sentences for a school student, in your own words as one short paragraph ` +
  `(don't copy the [minute] markers or speaker names). Return the minutes you used.\n\nQuestion: ${question}\n\nTranscript:\n${transcript}`;

/** Small models sometimes echo transcript formatting ("[4m] Dr. Vance: ..."): keep just the answer. */
export function cleanAnswer(text: string): string {
  return text
    .replace(/^[\s\]\[)(]*\d+\s*m\]\s*/i, "")
    .replace(/\[\d+\s*m\]\s*/gi, "")
    .replace(/^[^:\n]{1,40}:\s+(?=[A-Z])/, (m) => (/\b(dr|mr|mrs|ms|prof|teacher|sir|ma'am)\b|^[A-Z][a-z]+( [A-Z][a-z]+)?:\s+$/i.test(m) ? "" : m))
    .trim();
}

/** Lines from the minutes the model said it used, best matches first (falls back to search results). */
function cite(question: string, lines: TranscriptEntry[], startedAt: string, minutes: unknown, fallback: AskAnswer["quotes"]) {
  const t0 = new Date(startedAt).getTime();
  const used = new Set<number>(Array.isArray(minutes) ? minutes.map(Number).filter(Number.isFinite) : []);
  const inMinutes = lines.filter((l) => used.has(minuteOf(l.at, t0)));
  if (!inMinutes.length) return fallback;
  const ranked = searchTranscript(question, inMinutes, startedAt, 5);
  return ranked.length ? ranked : inMinutes.slice(0, 5).map((l) => ({ minute: minuteOf(l.at, t0), speakerName: l.speakerName, text: l.text }));
}

async function geminiAnswer(question: string, lines: TranscriptEntry[], startedAt: string, quotes: AskAnswer["quotes"]): Promise<AskAnswer | null> {
  if (!geminiConfigured() || !breakers.geminiText.available()) return null;
  const t0 = new Date(startedAt).getTime();
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const res = await withTimeout(
      (signal) =>
        ai.models.generateContent({
          model: process.env.NOTES_MODEL || "gemini-3.1-flash-lite",
          contents: PROMPT(question, lines.map((l) => line(l, t0)).join("\n").slice(-100_000)),
          config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.OBJECT, properties: { answer: { type: Type.STRING }, minutes: { type: Type.ARRAY, items: { type: Type.INTEGER } } }, required: ["answer"] },
            temperature: 0.2,
            abortSignal: signal,
          },
        }),
      Number(process.env.ASK_TIMEOUT_MS || 20_000),
      "Gemini answer"
    );
    const data = JSON.parse(res.text || "{}");
    if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Gemini returned no answer");
    breakers.geminiText.success();
    return { answer: cleanAnswer(data.answer), quotes: cite(question, lines, startedAt, data.minutes, quotes), generator: "gemini" };
  } catch (err: any) {
    breakers.geminiText.failure(err);
    console.warn("[ask] Gemini failed, trying the next provider:", String(err?.message || err).slice(0, 200));
    return null;
  }
}

async function localAnswer(question: string, lines: TranscriptEntry[], startedAt: string, quotes: AskAnswer["quotes"]): Promise<AskAnswer | null> {
  if (!ollamaConfigured()) return null;
  const t0 = new Date(startedAt).getTime();
  // Whole class if it fits the local context window; otherwise the most relevant passages
  const budget = Math.max(1000, ollamaContext() - 1500);
  let context = lines;
  if (approxTokens(lines.map((l) => line(l, t0)).join("\n")) > budget) {
    const hits = new Set(searchTranscript(question, lines, startedAt, 40).map((q) => q.text));
    const keep = new Set<number>();
    lines.forEach((l, i) => {
      if (hits.has(l.text)) for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) keep.add(j);
    });
    context = lines.filter((_, i) => keep.has(i));
    while (context.length && approxTokens(context.map((l) => line(l, t0)).join("\n")) > budget) context = context.slice(0, -1);
  }
  if (!context.length) return null;
  try {
    const data = await ollamaJson<{ answer: string; minutes?: number[] }>({
      system: "You answer school students' questions using only the class transcript you are given.",
      prompt: PROMPT(question, context.map((l) => line(l, t0)).join("\n")),
      schema: { type: "object", properties: { answer: { type: "string" }, minutes: { type: "array", items: { type: "integer" } } }, required: ["answer"] },
      timeoutMs: Number(process.env.LOCAL_ASK_TIMEOUT_MS || 90_000),
    });
    const answer = typeof data.answer === "string" ? cleanAnswer(data.answer) : "";
    if (!answer) return null;
    return { answer, quotes: cite(question, lines, startedAt, data.minutes, quotes), generator: "local" };
  } catch (err: any) {
    console.warn("[ask] local model failed:", String(err?.message || err).slice(0, 200));
    return null;
  }
}

export async function answerFromTranscript(question: string, lines: TranscriptEntry[], startedAt: string): Promise<AskAnswer> {
  const quotes = searchTranscript(question, lines, startedAt);
  if (lines.length) {
    for (const provider of providerOrder()) {
      const a = provider === "gemini" ? await geminiAnswer(question, lines, startedAt, quotes) : await localAnswer(question, lines, startedAt, quotes);
      if (a) return a;
    }
  }
  return { answer: null, quotes, generator: "search" };
}
