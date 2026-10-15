/**
 * Small in-memory rate limiter (fixed window per key). Single-instance, like the rest of the server.
 */
import type express from "express";

export interface Limiter {
  /** Records a hit; true while the key is within its limit */
  hit(key: string): boolean;
  /** True when the key has used its whole allowance (for counting failures only: check, then hit on failure) */
  full(key: string): boolean;
  /** Seconds until the key may try again (0 when allowed) */
  retryAfter(key: string): number;
  reset(key: string): void;
}

export function createLimiter(max: number, windowMs: number): Limiter {
  const hits = new Map<string, { n: number; until: number }>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.until <= now) hits.delete(k);
  }, Math.max(windowMs, 60_000));
  sweep.unref?.();
  return {
    hit(key) {
      const now = Date.now();
      const cur = hits.get(key);
      if (!cur || cur.until <= now) {
        hits.set(key, { n: 1, until: now + windowMs });
        return true;
      }
      cur.n++;
      return cur.n <= max;
    },
    full(key) {
      const cur = hits.get(key);
      return Boolean(cur && cur.until > Date.now() && cur.n >= max);
    },
    retryAfter(key) {
      const cur = hits.get(key);
      if (!cur || cur.n <= max) return 0;
      return Math.max(0, Math.ceil((cur.until - Date.now()) / 1000));
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

/** Express middleware: key by signed-in user, falling back to the client IP. */
export function rateLimit(max: number, windowMs: number, message = "Too many requests. Please wait a moment and try again."): express.RequestHandler {
  const limiter = createLimiter(max, windowMs);
  return (req, res, next) => {
    const key = req.user?.id || req.ip || "anon";
    if (limiter.hit(key)) return next();
    res.setHeader("Retry-After", String(limiter.retryAfter(key)));
    res.status(429).json({ error: message });
  };
}
