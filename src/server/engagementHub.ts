/**
 * Engagement analytics store (auditors/analysts only).
 *
 * - Participants post their own on-device summaries every ~5s, only after consent is recorded.
 * - Read APIs reject every role except auditor/admin (header x-actor-role).
 * - Storage: Postgres (engagement_samples, consents with full history, kv settings) plus in-memory rollups.
 */
import express from "express";
import { asc, desc, eq, notLike } from "drizzle-orm";
import { DEMO_PREFIX } from "./analytics/demo";
import { forgetLearnerAttention } from "./analytics/facts";
import { getDb, schema } from "./db";
import { kvLoad, kvUpsert, persist } from "./db/kv";
import { requireAuth } from "./auth/session";

const READ_ROLES = ["auditor", "admin", "analyst"];

interface Sample {
  roomSlug: string;
  participant: { id: string; name: string; role: string };
  at: string;
  summary: {
    presence: number;
    eyeContact: number;
    perclos: number;
    blinkPerMin: number;
    yawns: number;
    talkRatio: number;
    expressivity: number;
    states: Array<{ label: string; score: number }>;
    dominant: string;
  };
}

interface ConsentRecord {
  participantId: string;
  name: string;
  role: string;
  granted: boolean;
  guardianName?: string;
  guardianAttested?: boolean;
  country?: string;
  at: string;
  userAgent?: string;
}

const samplesByRoom = new Map<string, Sample[]>();
const consent = new Map<string, ConsentRecord>();
let settings = { enabled: true, disabledCountries: [] as string[] };

/** Loads settings, latest consent per person and recent samples from Postgres. */
async function loadFromDb() {
  const db: any = await getDb();
  const saved = await kvLoad<typeof settings>("engagement_settings");
  if (saved[0]) settings = { ...settings, ...saved[0].value };
  const rows = await db.select().from(schema.consents).where(eq(schema.consents.kind, "analytics")).orderBy(asc(schema.consents.at));
  for (const c of rows) {
    consent.set(c.userId, {
      participantId: c.userId,
      name: "",
      role: "",
      granted: c.granted,
      guardianName: c.guardianName || undefined,
      guardianAttested: Boolean(c.guardianName),
      country: c.country || undefined,
      at: new Date(c.at).toISOString(),
    });
  }
  const recent = await db.select().from(schema.engagementSamples).where(notLike(schema.engagementSamples.roomSlug, `${DEMO_PREFIX}%`)).orderBy(desc(schema.engagementSamples.at)).limit(50000);
  for (const r of recent.reverse()) {
    const smp = r.data as Sample;
    if (!samplesByRoom.has(smp.roomSlug)) samplesByRoom.set(smp.roomSlug, []);
    samplesByRoom.get(smp.roomSlug)!.push(smp);
  }
}

/** Records a consent decision (history kept). `decidedBy` is the learner or their guardian. */
export async function saveConsent(record: ConsentRecord, kind: "analytics" | "recording", decidedBy: string) {
  if (kind === "analytics") consent.set(record.participantId, record);
  const db: any = await getDb();
  await db.insert(schema.consents).values({
    userId: record.participantId,
    kind,
    granted: record.granted,
    decidedBy,
    guardianName: record.guardianName || null,
    country: record.country || null,
  });
  // After the decision is stored, so recomputed classes already see the withdrawal
  if (kind === "analytics" && !record.granted) persist("forget attention", forgetLearnerAttention(record.participantId));
}

const num = (v: any) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1000, Number(v))) : 0);

function canRead(req: express.Request) {
  return Boolean(req.user && READ_ROLES.includes(req.user.role));
}

function rollup(samples: Sample[]) {
  const byPerson = new Map<string, Sample[]>();
  for (const s of samples) {
    if (!byPerson.has(s.participant.id)) byPerson.set(s.participant.id, []);
    byPerson.get(s.participant.id)!.push(s);
  }
  return Array.from(byPerson.values()).map((list) => {
    list.sort((a, b) => a.at.localeCompare(b.at));
    const last = list[list.length - 1];
    const counts: Record<string, number> = {};
    for (const s of list) counts[s.summary.dominant] = (counts[s.summary.dominant] || 0) + 1;
    const avg = (k: keyof Sample["summary"]) => list.reduce((a, s) => a + (s.summary[k] as number), 0) / list.length;
    // Each sample covers ~5s; present = face visible most of that window
    const presentMinutes = (list.filter((s) => s.summary.presence >= 0.5).length * 5) / 60;
    const alerts: string[] = [];
    const recent = list.slice(-12); // ~1 minute
    const streak = (label: string) => recent.length >= 6 && recent.every((s) => s.summary.dominant === label);
    for (const l of ["sleepy", "away", "anxious", "overwhelmed", "sad", "frustrated", "camera off"]) if (streak(l)) alerts.push(`${l} for the last minute`);
    return {
      participant: last.participant,
      latest: last.summary,
      lastSeen: last.at,
      samples: list.length,
      presentMinutes: Math.round(presentMinutes * 10) / 10,
      avgEyeContact: Math.round(avg("eyeContact") * 100) / 100,
      avgTalkRatio: Math.round(avg("talkRatio") * 100) / 100,
      stateDistribution: Object.entries(counts)
        .map(([label, n]) => ({ label, share: Math.round((n / list.length) * 100) / 100 }))
        .sort((a, b) => b.share - a.share),
      timeline: list.slice(-120).map((s) => ({ at: s.at, dominant: s.summary.dominant, eyeContact: s.summary.eyeContact, presence: s.summary.presence })),
      alerts,
    };
  });
}

export function setupEngagementRoutes(app: express.Express) {
  const ready = loadFromDb().catch((err) => console.error("[Engagement] load failed:", err));
  app.use("/api/engagement", (_req, _res, next) => {
    ready.then(() => next());
  });

  app.get("/api/engagement/settings", (_req, res) => res.json(settings));

  app.put("/api/engagement/settings", requireAuth("admin"), (req, res) => {
    settings = {
      enabled: req.body?.enabled !== false,
      disabledCountries: Array.isArray(req.body?.disabledCountries) ? req.body.disabledCountries.map((c: any) => String(c).toUpperCase().slice(0, 3)) : settings.disabledCountries,
    };
    persist("engagement settings", kvUpsert("engagement_settings", [{ key: "settings", value: settings }]));
    res.json(settings);
  });

  app.get("/api/engagement/consent/:id", requireAuth(), (req, res) => {
    // Own record only (parents manage children's consent via the parent portal)
    if (req.params.id !== req.user!.id && !READ_ROLES.includes(req.user!.role)) return res.status(403).json({ error: "Not allowed" });
    res.json({ consent: consent.get(req.params.id) || null });
  });

  app.post("/api/engagement/consent", requireAuth(), (req, res) => {
    const p = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
    if (p.role === "student" && req.body?.granted && !(req.body?.guardianAttested && req.body?.guardianName)) {
      return res.status(400).json({ error: "A parent or guardian must confirm consent for learners." });
    }
    const record: ConsentRecord = {
      participantId: String(p.id).slice(0, 120),
      name: String(p.name || "").slice(0, 120),
      role: String(p.role || "").slice(0, 40),
      granted: Boolean(req.body?.granted),
      guardianName: req.body?.guardianName ? String(req.body.guardianName).slice(0, 120) : undefined,
      guardianAttested: Boolean(req.body?.guardianAttested),
      country: req.body?.country ? String(req.body.country).slice(0, 3) : undefined,
      at: new Date().toISOString(),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
    };
    persist("consent", saveConsent(record, "analytics", req.user!.id));
    res.json({ consent: record });
  });

  app.post("/api/engagement/samples", requireAuth(), (req, res) => {
    if (!settings.enabled) return res.status(503).json({ error: "Analytics disabled" });
    const p = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
    const c = consent.get(String(p.id));
    if (!c?.granted) return res.status(403).json({ error: "No consent on record" });
    if (c.country && settings.disabledCountries.includes(c.country.toUpperCase())) return res.status(403).json({ error: "Analytics disabled in this region" });
    const sm = req.body?.summary || {};
    const sample: Sample = {
      roomSlug: String(req.body?.roomSlug || "").slice(0, 120),
      participant: { id: String(p.id).slice(0, 120), name: String(p.name || "").slice(0, 120), role: String(p.role || "").slice(0, 40) },
      at: new Date().toISOString(),
      summary: {
        presence: num(sm.presence),
        eyeContact: num(sm.eyeContact),
        perclos: num(sm.perclos),
        blinkPerMin: num(sm.blinkPerMin),
        yawns: num(sm.yawns),
        talkRatio: num(sm.talkRatio),
        expressivity: num(sm.expressivity),
        states: Array.isArray(sm.states) ? sm.states.slice(0, 4).map((x: any) => ({ label: String(x.label).slice(0, 30), score: num(x.score) })) : [],
        dominant: String(sm.dominant || "unknown").slice(0, 30),
      },
    };
    if (!sample.roomSlug) return res.status(400).json({ error: "roomSlug required" });
    if (!samplesByRoom.has(sample.roomSlug)) samplesByRoom.set(sample.roomSlug, []);
    const list = samplesByRoom.get(sample.roomSlug)!;
    list.push(sample);
    if (list.length > 20000) list.splice(0, list.length - 20000);
    persist(
      "engagement sample",
      getDb().then((db: any) => db.insert(schema.engagementSamples).values({ roomSlug: sample.roomSlug, participantId: sample.participant.id, at: new Date(sample.at), data: sample }))
    );
    res.json({ ok: true });
  });

  // ---------------- read side: auditors / analysts only ----------------
  app.get("/api/engagement/rooms", requireAuth(), (req, res) => {
    if (!canRead(req)) return res.status(403).json({ error: "Engagement analytics are restricted to auditors and analysts." });
    const rooms = Array.from(samplesByRoom.entries()).map(([roomSlug, list]) => ({
      roomSlug,
      participants: new Set(list.map((s) => s.participant.id)).size,
      lastActivity: list[list.length - 1]?.at,
    }));
    rooms.sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));
    res.json({ rooms });
  });

  app.get("/api/engagement/rooms/:slug", requireAuth(), (req, res) => {
    if (!canRead(req)) return res.status(403).json({ error: "Engagement analytics are restricted to auditors and analysts." });
    const sinceMs = Date.now() - Math.min(24 * 60, Number(req.query.minutes) || 120) * 60000;
    const list = (samplesByRoom.get(req.params.slug) || []).filter((s) => Date.parse(s.at) >= sinceMs);
    res.json({ roomSlug: req.params.slug, participants: rollup(list), consent: Array.from(consent.values()) });
  });
}
