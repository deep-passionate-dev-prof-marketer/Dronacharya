/**
 * Engagement analytics store (auditors/analysts only).
 *
 * - Participants post their own on-device summaries every ~5s, only after consent is recorded.
 * - Read APIs reject every role except auditor/admin (header x-actor-role).
 * - Storage: append-only JSONL (samples + consent) under data/engagement, plus in-memory rollups.
 */
import fs from "fs";
import path from "path";
import express from "express";

const DIR = path.join(process.cwd(), "data", "engagement");
const SAMPLES = path.join(DIR, "samples.jsonl");
const CONSENT = path.join(DIR, "consent.jsonl");
const SETTINGS = path.join(DIR, "settings.json");
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

let persist = true;
const samplesByRoom = new Map<string, Sample[]>();
const consent = new Map<string, ConsentRecord>();
let settings = { enabled: true, disabledCountries: [] as string[] };

try {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(SETTINGS)) settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS, "utf-8")) };
  if (fs.existsSync(CONSENT)) {
    for (const line of fs.readFileSync(CONSENT, "utf-8").split("\n").filter(Boolean)) {
      try {
        const c: ConsentRecord = JSON.parse(line);
        consent.set(c.participantId, c); // last decision wins
      } catch {}
    }
  }
  if (fs.existsSync(SAMPLES)) {
    for (const line of fs.readFileSync(SAMPLES, "utf-8").split("\n").filter(Boolean).slice(-50000)) {
      try {
        const s: Sample = JSON.parse(line);
        if (!samplesByRoom.has(s.roomSlug)) samplesByRoom.set(s.roomSlug, []);
        samplesByRoom.get(s.roomSlug)!.push(s);
      } catch {}
    }
  }
} catch {
  persist = false;
}

const append = (file: string, obj: unknown) => persist && fs.appendFile(file, JSON.stringify(obj) + "\n", () => {});
const num = (v: any) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1000, Number(v))) : 0);

function canRead(req: express.Request) {
  return READ_ROLES.includes(String(req.headers["x-actor-role"] || ""));
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
  app.get("/api/engagement/settings", (_req, res) => res.json(settings));

  app.put("/api/engagement/settings", (req, res) => {
    if (req.headers["x-actor-role"] !== "admin") return res.status(403).json({ error: "Admins only" });
    settings = {
      enabled: req.body?.enabled !== false,
      disabledCountries: Array.isArray(req.body?.disabledCountries) ? req.body.disabledCountries.map((c: any) => String(c).toUpperCase().slice(0, 3)) : settings.disabledCountries,
    };
    if (persist) fs.writeFile(SETTINGS, JSON.stringify(settings, null, 2), () => {});
    res.json(settings);
  });

  app.get("/api/engagement/consent/:id", (req, res) => {
    res.json({ consent: consent.get(req.params.id) || null });
  });

  app.post("/api/engagement/consent", (req, res) => {
    const p = req.body?.participant || {};
    if (!p.id) return res.status(400).json({ error: "participant.id required" });
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
    consent.set(record.participantId, record);
    append(CONSENT, record);
    res.json({ consent: record });
  });

  app.post("/api/engagement/samples", (req, res) => {
    if (!settings.enabled) return res.status(503).json({ error: "Analytics disabled" });
    const p = req.body?.participant || {};
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
    append(SAMPLES, sample);
    res.json({ ok: true });
  });

  // ---------------- read side: auditors / analysts only ----------------
  app.get("/api/engagement/rooms", (req, res) => {
    if (!canRead(req)) return res.status(403).json({ error: "Engagement analytics are restricted to auditors and analysts." });
    const rooms = Array.from(samplesByRoom.entries()).map(([roomSlug, list]) => ({
      roomSlug,
      participants: new Set(list.map((s) => s.participant.id)).size,
      lastActivity: list[list.length - 1]?.at,
    }));
    rooms.sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));
    res.json({ rooms });
  });

  app.get("/api/engagement/rooms/:slug", (req, res) => {
    if (!canRead(req)) return res.status(403).json({ error: "Engagement analytics are restricted to auditors and analysts." });
    const sinceMs = Date.now() - Math.min(24 * 60, Number(req.query.minutes) || 120) * 60000;
    const list = (samplesByRoom.get(req.params.slug) || []).filter((s) => Date.parse(s.at) >= sinceMs);
    res.json({ roomSlug: req.params.slug, participants: rollup(list), consent: Array.from(consent.values()) });
  });
}
