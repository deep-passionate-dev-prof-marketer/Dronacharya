/**
 * Small AI helpers used live in class: caption translation and (demo) peer notes.
 *
 * Each call is signed-in only, rate-limited per person, size-capped and time-boxed, and goes
 * runs on the school's own language model (Ollama), or answers "unavailable". Never made-up text: when
 * no provider can do the job the client falls back to its own on-device translation (or says so).
 */
import express from "express";
import { requireAuth } from "./auth/session";
import { createLimiter } from "./rateLimit";
import { ollamaConfigured } from "./ai/providers";
import { ollamaJson } from "./ai/localLlm";
import { demoOnly } from "./features";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  ur: "Urdu",
  pt: "Portuguese",
  ru: "Russian",
  id: "Indonesian",
  ms: "Malay",
};
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
/** Per-person limits: captions are frequent (a line every few seconds); summaries are not */
const translateLimiter = createLimiter(240, 60_000);
const summaryLimiter = createLimiter(10, 10 * 60_000);

export function setupAiRoutes(app: express.Express) {
  app.post("/api/ai/live-translate-stream", requireAuth(), async (req, res) => {
    const text = String(req.body?.text || "").trim();
    const target = String(req.body?.targetLanguage || "").trim();
    if (!text) return res.status(400).json({ error: "Text is required." });
    if (text.length > 1000) return res.status(413).json({ error: "Too long to translate live (1,000 characters at most)." });
    if (!LANG_RE.test(target)) return res.status(400).json({ error: "Unknown target language." });
    if (!translateLimiter.hit(req.user!.id)) return res.status(429).json({ error: "Too many translations just now." });
    const base = target.split("-")[0].toLowerCase();
    if (base === "en" && !/[^\x00-\x7F]/.test(text)) return res.json({ translatedText: text, targetLanguage: target, provider: "none" });
    const langName = LANGUAGE_NAMES[base] || target;

    if (ollamaConfigured()) {
      try {
        const out = await ollamaJson<{ translation: string }>({
          system: `You translate classroom speech into ${langName}. Reply with JSON {"translation": "..."} only.`,
          prompt: text,
          schema: { type: "object", properties: { translation: { type: "string" } }, required: ["translation"] },
          timeoutMs: 6000,
          numCtx: 2048,
        });
        if (out?.translation?.trim()) return res.json({ translatedText: out.translation.trim(), targetLanguage: target, provider: "local" });
      } catch {
        // fall through
      }
    }
    res.status(503).json({ error: "Translation isn't available on the server right now.", unavailable: true });
  });

  // Peer notes (a demo feature): summarise a short learner-to-learner conversation
  app.post("/api/ai/peer-notetaker-summary", demoOnly, requireAuth("student", "instructor", "admin"), async (req, res) => {
    const lines = Array.isArray(req.body?.conversationTranscript) ? req.body.conversationTranscript.slice(0, 400) : null;
    if (!lines?.length) return res.status(400).json({ error: "conversationTranscript array is required." });
    const transcript = lines
      .map((m: any) => `[${String(m?.time || "").slice(0, 8)}] ${String(m?.speaker || "Speaker").slice(0, 60)}: ${String(m?.text || "").slice(0, 500)}`)
      .join("\n")
      .slice(0, 20_000);
    if (!summaryLimiter.hit(req.user!.id)) return res.status(429).json({ error: "Too many summaries just now. Try again in a few minutes." });
    const topic = String(req.body?.topic || "").slice(0, 120);
    const schema = {
      type: "object",
      properties: {
        topic: { type: "string" },
        summary: { type: "string" },
        keyTakeaways: { type: "array", items: { type: "string" } },
        actionItems: { type: "array", items: { type: "object", properties: { owner: { type: "string" }, task: { type: "string" }, deadline: { type: "string" } }, required: ["owner", "task"] } },
        sharedVocabulary: { type: "array", items: { type: "string" } },
      },
      required: ["topic", "summary", "keyTakeaways", "actionItems", "sharedVocabulary"],
    };
    const instructions = `Summarise this conversation between two learners${topic ? ` about "${topic}"` : ""}. Use only what was said; don't invent facts. Return JSON with topic, summary, keyTakeaways, actionItems (owner, task, deadline) and sharedVocabulary.`;
    if (ollamaConfigured()) {
      try {
        const out = await ollamaJson<any>({ system: instructions, prompt: transcript, schema, timeoutMs: 45_000 });
        return res.json({ ...out, peerContributionSplit: contributionSplit(lines), provider: "local" });
      } catch {
        // fall through
      }
    }
    res.status(503).json({ error: "Summaries aren't available right now (no AI service is set up or reachable).", unavailable: true });
  });
}

/** Who spoke how much (by words), measured rather than guessed */
function contributionSplit(lines: any[]): Record<string, number> {
  const words = new Map<string, number>();
  for (const l of lines) {
    const who = String(l?.speaker || "Speaker").slice(0, 60);
    words.set(who, (words.get(who) || 0) + String(l?.text || "").split(/\s+/).filter(Boolean).length);
  }
  const total = [...words.values()].reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries([...words.entries()].map(([k, v]) => [k, Math.round((v / total) * 100)]));
}
