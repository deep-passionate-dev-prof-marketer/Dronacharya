import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import http from "http";

// Gemini always fails with a quota error in these tests
let geminiCalls = 0;
vi.mock("@google/genai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    GoogleGenAI: class {
      models = {
        generateContent: async () => {
          geminiCalls++;
          throw Object.assign(new Error("Resource exhausted: quota exceeded"), { status: 429 });
        },
      };
    },
  };
});

import { buildNotes } from "../recording/notes";
import { answerFromTranscript } from "../recording/ask";
import { breakers } from "./providers";
import { chainTranscriber } from "../sttHub";

// ---- a pretend Ollama server ----
let ollamaRequests: any[] = [];
let ollamaReply: (body: any) => object = () => ({});
const ollama = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const body = JSON.parse(raw);
    ollamaRequests.push(body);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: { role: "assistant", content: JSON.stringify(ollamaReply(body)) } }));
  });
});
let ollamaUrl = "";
beforeAll(() => new Promise<void>((r) => ollama.listen(0, () => ((ollamaUrl = `http://127.0.0.1:${(ollama.address() as any).port}`), r()))));
afterAll(() => new Promise<void>((r) => ollama.close(() => r())));
beforeEach(() => {
  geminiCalls = 0;
  ollamaRequests = [];
  Object.values(breakers).forEach((b) => b.reset());
  process.env.GEMINI_API_KEY = "test-key";
  process.env.OLLAMA_URL = ollamaUrl;
  delete process.env.AI_PROVIDERS;
});

const at = (min: number) => new Date(Date.UTC(2026, 9, 9, 10, min)).toISOString();
const lines = [
  { at: at(0), speakerId: "t", speakerName: "Dr. Vance", text: "Today we study interference of light waves" },
  { at: at(3), speakerId: "s", speakerName: "Sophia", text: "Why do we need coherent sources?" },
  { at: at(4), speakerId: "t", speakerName: "Dr. Vance", text: "Coherent sources keep a constant phase difference" },
  { at: at(9), speakerId: "t", speakerName: "Dr. Vance", text: "For homework solve questions one to five from the worksheet" },
];

describe("lecture notes fall back from Gemini to the local model", () => {
  it("uses the local model when Gemini fails, and drops anything not said in class", async () => {
    ollamaReply = () => ({
      summary: "The class covered interference and coherent sources.",
      keyConcepts: ["interference", "coherent sources", "quantum tunnelling"],
      questions: [{ question: "Why do we need coherent sources?", askedBy: "Sophia" }, { question: "What is the speed of dark?" }],
      homework: ["Solve questions one to five from the worksheet", "Write an essay on black holes"],
      outline: [{ minute: 0, title: "Interference" }, { minute: 99, title: "Homework" }],
    });
    const notes = await buildNotes(lines, { subject: "Physics" });
    expect(geminiCalls).toBe(1);
    expect(notes.generator).toBe("local");
    expect(notes.keyConcepts).toEqual(["interference", "coherent sources"]); // "quantum tunnelling" never said
    expect(notes.questions).toEqual([{ question: "Why do we need coherent sources?", askedBy: "Sophia" }]);
    expect(notes.homework).toEqual(["Solve questions one to five from the worksheet"]);
    expect(notes.outline.map((o) => o.minute)).toEqual([0, 9]); // clamped to the class length
    // Ollama got a JSON schema and a real context window
    expect(ollamaRequests[0].format?.type).toBe("object");
    expect(ollamaRequests[0].options.num_ctx).toBeGreaterThanOrEqual(4096);
    expect(ollamaRequests[0].stream).toBe(false);
  });

  it("after a quota error Gemini is skipped for a while (no waiting on it)", async () => {
    ollamaReply = () => ({ summary: "ok", keyConcepts: [], questions: [], homework: [], outline: [] });
    await buildNotes(lines, {});
    await buildNotes(lines, {});
    expect(geminiCalls).toBe(1);
    expect(ollamaRequests.length).toBe(2);
  });

  it("falls back to extractive notes when the local server is down too", async () => {
    process.env.OLLAMA_URL = "http://127.0.0.1:9"; // nothing listens here
    const notes = await buildNotes(lines, {});
    expect(notes.generator).toBe("extractive");
    expect(notes.homework).toEqual(["For homework solve questions one to five from the worksheet"]);
  });

  it("AI_PROVIDERS=local keeps everything on our servers (Gemini never called)", async () => {
    process.env.AI_PROVIDERS = "local";
    ollamaReply = () => ({ summary: "Local only.", keyConcepts: [], questions: [], homework: [], outline: [] });
    const notes = await buildNotes(lines, {});
    expect(notes.generator).toBe("local");
    expect(geminiCalls).toBe(0);
  });

  it("long classes are summarised in parts and merged", async () => {
    process.env.OLLAMA_NUM_CTX = "3000"; // tiny window forces several parts
    const many = Array.from({ length: 120 }, (_, i) => ({ at: at(i), speakerId: "t", speakerName: "Dr. Vance", text: `Point ${i}: interference fringes depend on path difference and wavelength in the double slit setup` }));
    ollamaReply = (body) =>
      body.format?.properties?.keyConcepts
        ? { summary: `part summary`, keyConcepts: ["interference"], questions: [], homework: [], outline: [{ minute: 1, title: "Fringes" }] }
        : { summary: "Whole class summary." };
    const notes = await buildNotes(many, {});
    delete process.env.OLLAMA_NUM_CTX;
    const partCalls = ollamaRequests.filter((r) => r.format?.properties?.keyConcepts).length;
    expect(partCalls).toBeGreaterThan(1);
    expect(ollamaRequests.length).toBe(partCalls + 1); // + the merge call
    expect(notes.summary).toBe("Whole class summary.");
    expect(notes.generator).toBe("local");
  });
});

describe("ask about this class falls back too", () => {
  it("answers with the local model and cites what was said", async () => {
    ollamaReply = () => ({ answer: "Coherent sources keep a constant phase difference, so the pattern stays stable.", minutes: [4] });
    const a = await answerFromTranscript("Why coherent sources?", lines, at(0));
    expect(a.generator).toBe("local");
    expect(a.answer).toMatch(/constant phase difference/);
    expect(a.quotes).toEqual([{ minute: 4, speakerName: "Dr. Vance", text: "Coherent sources keep a constant phase difference" }]);
  });

  it("quotes the transcript when no AI is available", async () => {
    process.env.OLLAMA_URL = "http://127.0.0.1:9";
    const a = await answerFromTranscript("coherent sources", lines, at(0));
    expect(a.generator).toBe("search");
    expect(a.answer).toBeNull();
    expect(a.quotes.length).toBeGreaterThan(0);
  });
});

describe("captions chain", () => {
  const cbs = () => {
    const got = { interim: [] as string[], final: [] as string[], errors: [] as string[], closed: 0 };
    return { got, cb: { onInterim: (t: string) => got.interim.push(t), onFinal: (t: string) => got.final.push(t), onError: (e: string) => got.errors.push(e), onClose: () => got.closed++ } };
  };

  it("skips a provider that can't connect", async () => {
    const sentToB: number[] = [];
    const t = await chainTranscriber([
      { name: "A", factory: async () => Promise.reject(new Error("bad key")) },
      { name: "B", factory: async () => ({ send: (p) => sentToB.push(p.length), close() {} }) },
    ])({}, cbs().cb);
    t.send(Buffer.alloc(320));
    expect(sentToB).toEqual([320]);
  });

  it("moves to the next provider when one fails mid-class, ignoring the failed one afterwards", async () => {
    let aCb: any;
    let bCb: any;
    const sentToB: number[] = [];
    const { got, cb } = cbs();
    const t = await chainTranscriber([
      { name: "A", factory: async (_o, c) => ((aCb = c), { send() {}, close() {} }) },
      { name: "B", factory: async (_o, c) => ((bCb = c), { send: (p) => sentToB.push(p.length), close() {} }) },
    ])({}, cb);
    aCb.onFinal("from A");
    aCb.onError("quota exceeded");
    await new Promise((r) => setTimeout(r, 10));
    aCb.onFinal("late line from A");
    t.send(Buffer.alloc(640));
    bCb.onFinal("from B");
    expect(got.final).toEqual(["from A", "from B"]);
    expect(sentToB).toEqual([640]);
    expect(got.errors).toEqual([]);
  });

  it("reports an error only when every provider is down", async () => {
    let aCb: any;
    const { got, cb } = cbs();
    await chainTranscriber([
      { name: "A", factory: async (_o, c) => ((aCb = c), { send() {}, close() {} }) },
      { name: "B", factory: async () => Promise.reject(new Error("whisper down")) },
    ])({}, cb);
    aCb.onError("network");
    await new Promise((r) => setTimeout(r, 10));
    expect(got.errors.length).toBe(1);
    await expect(chainTranscriber([{ name: "B", factory: async () => Promise.reject(new Error("down")) }])({}, cb)).rejects.toThrow(/No speech service/);
  });
});
