/**
 * Content-protection events reported by the browser/desktop app (capture attempts, devtools,
 * print, tab switches). Stored in audit_events (stream "security"); readable by auditors/admins.
 */
import crypto from "crypto";
import express from "express";
import { and, desc, eq, gte, isNull, notLike, or } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";
import { auditInsert, persist } from "./db/kv";

const TYPES = new Set([
  "printscreen_key",
  "snip_shortcut",
  "print_attempt",
  "save_attempt",
  "devtools_shortcut",
  "devtools_open",
  "screen_capture_api",
  "tab_hidden",
  "window_blur",
  "context_menu",
  "desktop_capture_blocked",
]);

// Per-session rate limit so a stuck key can't flood the log
const buckets = new Map<string, { n: number; reset: number }>();
const allow = (sid: string) => {
  const now = Date.now();
  const b = buckets.get(sid);
  if (!b || b.reset < now) {
    buckets.set(sid, { n: 1, reset: now + 60_000 });
    return true;
  }
  return ++b.n <= 60;
};

export function setupSecurityRoutes(app: express.Express) {
  /** Public: where to download the desktop classroom app (installer links are set per deployment). */
  app.get("/api/desktop/downloads", (_req, res) => {
    const url = (v?: string) => (v && /^https:\/\//.test(v) ? v : null);
    res.json({
      version: process.env.DESKTOP_APP_VERSION || null,
      mac: url(process.env.DESKTOP_DOWNLOAD_MAC),
      windows: url(process.env.DESKTOP_DOWNLOAD_WIN),
    });
  });

  app.post("/api/security/events", requireAuth(), (req, res) => {
    const u = req.user!;
    const type = String(req.body?.type || "");
    if (!TYPES.has(type)) return res.status(400).json({ error: "Unknown event type" });
    if (!allow(u.sid)) return res.status(429).json({ error: "Too many events" });
    const event = {
      id: `sec-${crypto.randomUUID()}`,
      at: new Date().toISOString(),
      type,
      roomSlug: req.body?.roomSlug ? String(req.body.roomSlug).slice(0, 120) : undefined,
      userId: u.id,
      data: {
        user: { id: u.id, name: u.name, role: u.role, studentCode: u.studentCode },
        session: u.sid.slice(0, 6).toUpperCase(),
        client: String(req.headers["x-dronacharya-client"] || "web").slice(0, 60),
        view: req.body?.view ? String(req.body.view).slice(0, 40) : undefined,
        detail: req.body?.detail ? String(req.body.detail).slice(0, 200) : undefined,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
      },
    };
    persist("security event", auditInsert("security", event));
    res.json({ ok: true });
  });

  app.get("/api/security/events", requireAuth("admin", "auditor"), async (req, res) => {
    const db: any = await getDb();
    const since = new Date(Date.now() - Math.min(30, Number(req.query.days) || 7) * 864e5);
    const rows = await db
      .select()
      .from(schema.auditEvents)
      .where(and(eq(schema.auditEvents.stream, "security"), gte(schema.auditEvents.at, since), or(isNull(schema.auditEvents.roomSlug), notLike(schema.auditEvents.roomSlug, "demo-%"))))
      .orderBy(desc(schema.auditEvents.at))
      .limit(1000);
    res.json({ events: rows.map((r: any) => ({ id: r.id, at: r.at, type: r.type, roomSlug: r.roomSlug, ...r.data })) });
  });
}
