/**
 * The school's own AI servers and their health: the language model (Ollama) for notes, answers and
 * translation, and Whisper for live captions. A server that keeps failing is skipped for a
 * cool-down so classes aren't slowed down waiting on it.
 */

export const ollamaConfigured = () => Boolean(process.env.OLLAMA_URL);
export const whisperConfigured = () => Boolean(process.env.WHISPER_URL);

/**
 * Skips a provider for `cooldownMs` after `maxFailures` failures within `windowMs`
 * (e.g. the AI server is stopped or overloaded).
 */
export class CircuitBreaker {
  private failures: number[] = [];
  private openUntil = 0;
  constructor(
    readonly name: string,
    private opts = { maxFailures: 3, windowMs: 5 * 60_000, cooldownMs: 2 * 60_000 }
  ) {}
  available(now = Date.now()) {
    return now >= this.openUntil;
  }
  success() {
    this.failures = [];
    this.openUntil = 0;
  }
  /** Back to healthy (tests, or an admin "retry now") */
  reset() {
    this.success();
  }
  failure(err?: unknown, now = Date.now()) {
    this.failures = this.failures.filter((t) => now - t < this.opts.windowMs).concat(now);
    // Quota / auth problems won't fix themselves in seconds: cool down straight away
    const status = Number((err as any)?.status ?? (err as any)?.code);
    const hard = status === 429 || status === 401 || status === 403 || /quota|api key|permission/i.test(String((err as any)?.message || ""));
    if (hard || this.failures.length >= this.opts.maxFailures) {
      this.openUntil = now + this.opts.cooldownMs;
      console.warn(`[ai] ${this.name} unavailable for ${Math.round(this.opts.cooldownMs / 1000)}s:`, String((err as any)?.message || err || "repeated failures").slice(0, 160));
    }
  }
}

export const breakers = {
  ollama: new CircuitBreaker("Local LLM (Ollama)"),
  whisper: new CircuitBreaker("Local Whisper"),
};

/** Rejects after `ms` (the underlying request is aborted through `signal` when given). */
export function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number, label: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(`${label} timed out after ${ms} ms`)), ms);
  return Promise.race([
    run(ctrl.signal),
    new Promise<never>((_, reject) => ctrl.signal.addEventListener("abort", () => reject(ctrl.signal.reason || new Error(`${label} timed out`)), { once: true })),
  ]).finally(() => clearTimeout(timer));
}
