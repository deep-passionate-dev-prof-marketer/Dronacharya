/**
 * Local language model on the school's own servers (Ollama). Used for lecture notes and
 * "ask about this class" when Gemini isn't available. Structured JSON output via Ollama's
 * `format` (JSON schema), with an explicit context window so long transcripts aren't cut silently.
 *
 *   OLLAMA_URL=http://localhost:11434   OLLAMA_MODEL=qwen2.5:7b-instruct (default qwen2.5:3b)
 */
import { breakers, withTimeout } from "./providers";

export const ollamaModel = () => process.env.OLLAMA_MODEL || "qwen2.5:3b";
const baseUrl = () => (process.env.OLLAMA_URL || "").replace(/\/+$/, "").replace(/\/v1$/, "");

/** Context window we ask for (tokens). Bigger windows need more RAM. */
export const ollamaContext = () => Number(process.env.OLLAMA_NUM_CTX || 16384);

export async function ollamaJson<T>(opts: { system: string; prompt: string; schema: object; timeoutMs: number; numCtx?: number }): Promise<T> {
  if (!baseUrl()) throw new Error("OLLAMA_URL is not set");
  if (!breakers.ollama.available()) throw new Error("Local LLM is cooling down after failures");
  try {
    const out = await withTimeout(
      async (signal) => {
        const res = await fetch(`${baseUrl()}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            model: ollamaModel(),
            stream: false,
            format: opts.schema,
            keep_alive: process.env.OLLAMA_KEEP_ALIVE || "10m",
            options: { temperature: 0.2, num_ctx: opts.numCtx || ollamaContext() },
            messages: [
              { role: "system", content: opts.system },
              { role: "user", content: opts.prompt },
            ],
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw Object.assign(new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`), { status: res.status });
        }
        const data = await res.json();
        const content = data?.message?.content;
        if (typeof content !== "string" || !content.trim()) throw new Error("Ollama returned no content");
        return JSON.parse(content) as T;
      },
      opts.timeoutMs,
      "Local LLM"
    );
    breakers.ollama.success();
    return out;
  } catch (err) {
    breakers.ollama.failure(err);
    throw err;
  }
}

/** Rough token estimate for budgeting (≈ 4 characters per token for English; conservative for Hindi). */
export const approxTokens = (s: string) => Math.ceil(s.length / 3.2);
