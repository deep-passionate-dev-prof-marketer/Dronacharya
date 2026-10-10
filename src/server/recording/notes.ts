/**
 * Lecture notes from a class transcript, trying providers in order (AI_PROVIDERS, default gemini,local):
 *  - Gemini (GEMINI_API_KEY): summary, key concepts, questions asked, homework, outline.
 *  - Local LLM on our servers (OLLAMA_URL) when Gemini isn't set up or fails; long classes are
 *    summarised in parts and merged so nothing is cut off.
 *  - Otherwise an extractive summary built only from what was said, labelled "extractive" so
 *    nobody mistakes it for AI-written notes.
 * AI output is grounded: homework, questions and concepts that don't appear in the transcript are dropped.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { breakers, geminiConfigured, ollamaConfigured, providerOrder, withTimeout } from "../ai/providers";
import { approxTokens, ollamaContext, ollamaJson } from "../ai/localLlm";

export interface TranscriptEntry {
  at: string; // ISO time
  speakerId: string | null;
  speakerName: string | null;
  text: string;
}

export interface LectureNotes {
  summary: string;
  keyConcepts: string[];
  questions: Array<{ question: string; askedBy?: string }>;
  homework: string[];
  outline: Array<{ minute: number; title: string }>;
  stats: { lines: number; speakers: number; minutes: number };
  generator: "gemini" | "local" | "extractive";
}

const STOP = new Set(
  "a an the and or but if then so to of in on at by for with from as is are was were be been being it its this that these those we you they he she i me my our your their them his her not no yes do does did doing have has had having can could will would should may might must shall just very also there here what which who whom whose when where why how all any each few more most other some such only own same than too s t don now ok okay um uh like right well let lets gonna going get got one two into about over again once up down out off".split(" ")
);

function words(text: string) {
  return (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter((w) => !STOP.has(w));
}

function statsOf(lines: TranscriptEntry[]) {
  const speakers = new Set(lines.map((l) => l.speakerId || l.speakerName || "?")).size;
  const t0 = lines.length ? new Date(lines[0].at).getTime() : 0;
  const t1 = lines.length ? new Date(lines[lines.length - 1].at).getTime() : 0;
  return { lines: lines.length, speakers, minutes: Math.max(0, Math.round((t1 - t0) / 60000)) };
}

// Phrases that set work to do (not ordinary words like "revise" or "in practice" used during teaching)
const HOMEWORK = /\b(home ?work|assignment|for (the )?next (class|lesson|time|week)|by (tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|worksheet|exercises? \d|due (on|by|tomorrow)|submit (it|your|the)|practi[cs]e (questions|problems|sheet|set)|revise (chapter|unit|for)|read (chapter|pages?|unit))\b/i;

/** Notes using only sentences from the transcript (no generation). */
export function extractiveNotes(lines: TranscriptEntry[]): LectureNotes {
  const clean = lines.filter((l) => l.text && l.text.trim().length > 0);
  const freq = new Map<string, number>();
  for (const l of clean) for (const w of words(l.text)) freq.set(w, (freq.get(w) || 0) + 1);

  const keyConcepts = [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([w]) => w);

  const scored = clean
    .map((l, i) => {
      const ws = words(l.text);
      const score = ws.length ? ws.reduce((s, w) => s + (freq.get(w) || 0), 0) / Math.sqrt(ws.length) : 0;
      return { i, text: l.text.trim(), score, long: ws.length >= 4 };
    })
    .filter((x) => x.long && !x.text.endsWith("?"));
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.i - b.i);
  const summary = top.length
    ? top.map((t) => (/[.!]$/.test(t.text) ? t.text : `${t.text}.`)).join(" ")
    : clean.length
    ? "The class transcript was too short to summarise."
    : "No speech was captured during this class.";

  const questions = clean
    .filter((l) => l.text.trim().endsWith("?"))
    .slice(0, 15)
    .map((l) => ({ question: l.text.trim(), askedBy: l.speakerName || undefined }));

  const homework = clean.filter((l) => HOMEWORK.test(l.text)).map((l) => l.text.trim()).slice(0, 8);

  // Outline: the strongest sentence in each 10-minute block
  const t0 = clean.length ? new Date(clean[0].at).getTime() : 0;
  const blocks = new Map<number, { text: string; score: number }>();
  clean.forEach((l, i) => {
    const s = scored.find((x) => x.i === i);
    if (!s) return;
    const block = Math.floor((new Date(l.at).getTime() - t0) / 600000);
    const cur = blocks.get(block);
    if (!cur || s.score > cur.score) blocks.set(block, { text: s.text, score: s.score });
  });
  const outline = [...blocks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, v]) => ({ minute: b * 10, title: v.text.length > 90 ? v.text.slice(0, 87).trimEnd() + "…" : v.text }));

  return { summary, keyConcepts, questions, homework, outline, stats: statsOf(clean), generator: "extractive" };
}

type NotesContext = { subject?: string; topic?: string; kind?: string };
type RawNotes = Omit<LectureNotes, "stats" | "generator">;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
    questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, askedBy: { type: Type.STRING } }, required: ["question"] } },
    homework: { type: Type.ARRAY, items: { type: Type.STRING } },
    outline: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { minute: { type: Type.INTEGER }, title: { type: Type.STRING } }, required: ["minute", "title"] } },
  },
  required: ["summary", "keyConcepts", "questions", "homework", "outline"],
};

/** The same shape as plain JSON Schema (for the local model). */
export const NOTES_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyConcepts: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, askedBy: { type: "string" } }, required: ["question"] } },
    homework: { type: "array", items: { type: "string" } },
    outline: { type: "array", items: { type: "object", properties: { minute: { type: "integer" }, title: { type: "string" } }, required: ["minute", "title"] } },
  },
  required: ["summary", "keyConcepts", "questions", "homework", "outline"],
};

const SYSTEM =
  "You write lecture notes for school students from a class transcript. Use only what was said in the transcript; " +
  "never invent facts, homework or questions. Write plainly for a school student.";

function instructions(context: NotesContext) {
  return (
    `Class: ${context.kind || "class"} · ${context.subject || "subject unknown"}${context.topic ? ` · topic: ${context.topic}` : ""}.\n` +
    `summary: 4-7 plain sentences. keyConcepts: up to 8 short terms that were taught. questions: questions students or the teacher asked, ` +
    `with askedBy set to the speaker's name. homework: only tasks the teacher actually set (empty if none). ` +
    `outline: one entry per main section with the minute it started.`
  );
}

function transcriptText(lines: TranscriptEntry[], t0: number) {
  return lines.map((l) => `[${Math.max(0, Math.floor((new Date(l.at).getTime() - t0) / 60000))}m] ${l.speakerName || "Speaker"}: ${l.text}`).join("\n");
}

/** Content words of `text` that also occur in the transcript (share 0..1). */
function groundedShare(text: string, vocabulary: Set<string>) {
  const ws = words(text);
  if (!ws.length) return 0;
  return ws.filter((w) => vocabulary.has(w) || vocabulary.has(w.replace(/s$/, "")) || vocabulary.has(`${w}s`)).length / ws.length;
}

// Classroom words that aren't concepts of the lesson
const GENERIC_CONCEPTS = new Set(["homework", "class", "lesson", "today", "worksheet", "assignment", "questions", "teacher", "students", "introduction", "summary", "notes"]);

/** Validates model output and drops anything not backed by the transcript. */
export function groundNotes(raw: any, lines: TranscriptEntry[], generator: "gemini" | "local"): LectureNotes | null {
  if (!raw || typeof raw.summary !== "string" || !raw.summary.trim()) return null;
  const vocabulary = new Set(lines.flatMap((l) => words(l.text)));
  const stats = statsOf(lines);
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const keyConcepts = [...new Set<string>((Array.isArray(raw.keyConcepts) ? raw.keyConcepts : []).map(str).filter(Boolean))]
    .filter((k) => groundedShare(k, vocabulary) >= 0.5 && !GENERIC_CONCEPTS.has(k.toLowerCase()))
    .slice(0, 12);
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q: any) => ({ question: str(q?.question), askedBy: str(q?.askedBy) || undefined }))
    .filter((q: any) => q.question && groundedShare(q.question, vocabulary) >= 0.6)
    .slice(0, 20);
  const homework = (Array.isArray(raw.homework) ? raw.homework : [])
    .map(str)
    .filter((h: string) => h && groundedShare(h, vocabulary) >= 0.6)
    .slice(0, 10);
  const outline = (Array.isArray(raw.outline) ? raw.outline : [])
    .map((o: any) => ({ minute: Math.max(0, Math.min(stats.minutes, Math.round(Number(o?.minute) || 0))), title: str(o?.title) }))
    .filter((o: any) => o.title)
    .sort((a: any, b: any) => a.minute - b.minute)
    .slice(0, 20);
  return { summary: raw.summary.trim(), keyConcepts, questions, homework, outline, stats, generator };
}

/** Gemini notes; null if not configured, cooling down, or the call fails (caller tries the next provider). */
export async function geminiNotes(lines: TranscriptEntry[], context: NotesContext): Promise<LectureNotes | null> {
  if (!geminiConfigured() || !lines.length || !breakers.geminiText.available()) return null;
  const t0 = new Date(lines[0].at).getTime();
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const res = await withTimeout(
      (signal) =>
        ai.models.generateContent({
          model: process.env.NOTES_MODEL || "gemini-3.1-flash-lite",
          contents: `${SYSTEM}\n${instructions(context)}\n\nTranscript:\n${transcriptText(lines, t0).slice(-120_000)}`,
          config: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2, abortSignal: signal },
        }),
      Number(process.env.NOTES_TIMEOUT_MS || 90_000),
      "Gemini notes"
    );
    const notes = groundNotes(JSON.parse(res.text || "{}"), lines, "gemini");
    if (!notes) throw new Error("Gemini returned unusable notes");
    breakers.geminiText.success();
    return notes;
  } catch (err: any) {
    breakers.geminiText.failure(err);
    console.warn("[notes] Gemini failed, trying the next provider:", String(err?.message || err).slice(0, 200));
    return null;
  }
}

/** Splits lines into chunks that fit the local model's context window. */
export function chunkLines(lines: TranscriptEntry[], t0: number, maxTokens: number): TranscriptEntry[][] {
  const chunks: TranscriptEntry[][] = [];
  let cur: TranscriptEntry[] = [];
  let tokens = 0;
  for (const l of lines) {
    const t = approxTokens(transcriptText([l], t0)) + 1;
    if (cur.length && tokens + t > maxTokens) {
      chunks.push(cur);
      cur = [];
      tokens = 0;
    }
    cur.push(l);
    tokens += t;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/** Notes from the local model; long classes are summarised part by part, then merged. */
export async function localNotes(lines: TranscriptEntry[], context: NotesContext): Promise<LectureNotes | null> {
  if (!ollamaConfigured() || !lines.length) return null;
  const t0 = new Date(lines[0].at).getTime();
  const timeoutMs = Number(process.env.LOCAL_NOTES_TIMEOUT_MS || 10 * 60_000);
  // Leave room for instructions and the answer inside the context window
  const budget = Math.max(1500, ollamaContext() - 2500);
  try {
    const chunks = chunkLines(lines, t0, budget);
    const parts: RawNotes[] = [];
    for (const [i, chunk] of chunks.entries()) {
      const part = await ollamaJson<RawNotes>({
        system: SYSTEM,
        prompt:
          `${instructions(context)}${chunks.length > 1 ? `\nThis is part ${i + 1} of ${chunks.length} of the class.` : ""}\n\nTranscript:\n${transcriptText(chunk, t0)}`,
        schema: NOTES_JSON_SCHEMA,
        timeoutMs,
      });
      parts.push(part);
    }
    let merged: any = parts[0];
    if (parts.length > 1) {
      // Merge: one summary from the partial summaries; lists are combined
      const combined = await ollamaJson<{ summary: string }>({
        system: SYSTEM,
        prompt:
          `These are summaries of consecutive parts of one class. Write one summary of the whole class in 4-7 plain sentences, using only these summaries.\n\n` +
          parts.map((p, i) => `Part ${i + 1}: ${p.summary}`).join("\n"),
        schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
        timeoutMs,
      });
      merged = {
        summary: combined.summary,
        keyConcepts: parts.flatMap((p) => p.keyConcepts || []),
        questions: parts.flatMap((p) => p.questions || []),
        homework: parts.flatMap((p) => p.homework || []),
        outline: parts.flatMap((p) => p.outline || []),
      };
    }
    const notes = groundNotes(merged, lines, "local");
    if (!notes) throw new Error("Local model returned unusable notes");
    return notes;
  } catch (err: any) {
    console.warn("[notes] local model failed, using extractive notes:", String(err?.message || err).slice(0, 200));
    return null;
  }
}

export async function buildNotes(lines: TranscriptEntry[], context: NotesContext): Promise<LectureNotes> {
  if (!lines.length) return extractiveNotes(lines);
  for (const provider of providerOrder()) {
    const notes = provider === "gemini" ? await geminiNotes(lines, context) : await localNotes(lines, context);
    if (notes) return notes;
  }
  return extractiveNotes(lines);
}
