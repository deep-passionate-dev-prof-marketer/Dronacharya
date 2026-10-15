/**
 * Help buttons in class.
 *  - "Ask parent": a learner asks their parent(s) for help; each linked parent gets a notification
 *    (and an email when mail is set up). Limited to 3 per class per learner per day.
 *  - "Tech help": anyone opens a support request (what's wrong, which class, a short device summary);
 *    admins see it under Help requests, answer it, and the person is told.
 */
import crypto from "crypto";
import express from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";
import { canAccessRoom, parentRoom } from "./roomAccess";
import { classByRoom } from "./classesHub";
import { createLimiter } from "./rateLimit";
import { notify } from "./notifyHub";

const CATEGORIES = ["audio", "video", "connection", "access", "other"] as const;
const STATUSES = ["open", "answered", "closed"] as const;

const askParentLimiter = createLimiter(3, 24 * 60 * 60_000);
const ticketLimiter = createLimiter(5, 60 * 60_000);

/** Just enough about the device to help (no fingerprints or ids) */
function deviceSummary(d: any) {
  if (!d || typeof d !== "object") return null;
  const pick = (k: string, max = 60) => (d[k] === undefined || d[k] === null ? undefined : String(d[k]).slice(0, max));
  return {
    deviceType: pick("deviceType"),
    deviceModel: pick("deviceModel"),
    osName: pick("osName"),
    browserName: pick("browserName"),
    browserVersion: pick("browserVersion", 20),
    screen: d.screenWidth && d.screenHeight ? `${Number(d.screenWidth)}×${Number(d.screenHeight)}` : undefined,
    networkType: pick("networkType", 20),
    timezone: pick("timezone"),
    language: pick("language", 20),
    // From the class screen: video path and connection state at the time
    videoMode: pick("videoMode", 20),
    connection: pick("connection", 20),
  };
}

async function className(roomSlug: string | null) {
  if (!roomSlug) return null;
  const cls = await classByRoom(parentRoom(roomSlug)).catch(() => null);
  return cls ? (cls.topic ? `${cls.subject}: ${cls.topic}` : cls.subject) : null;
}

export function setupHelpRoutes(app: express.Express) {
  app.post("/api/help/ask-parent", requireAuth("student"), async (req, res) => {
    const user = req.user!;
    const roomSlug = String(req.body?.roomSlug || "").slice(0, 120);
    const message = String(req.body?.message || "").trim().slice(0, 500);
    if (!roomSlug || !(await canAccessRoom(user, roomSlug))) return res.status(404).json({ error: "Class not found" });
    if (!askParentLimiter.hit(`${user.id}:${parentRoom(roomSlug)}`)) return res.status(429).json({ error: "You've already asked 3 times for this class today. Your parent has your messages." });
    const db: any = await getDb();
    const parents = await db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.guardians)
      .innerJoin(schema.users, eq(schema.users.id, schema.guardians.parentId))
      .where(and(eq(schema.guardians.studentId, user.id), eq(schema.users.disabled, false)));
    if (!parents.length) return res.json({ sentTo: [], message: "There's no parent linked to your account yet. Ask your teacher or use Tech help." });
    const cls = await className(roomSlug);
    const when = new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: user.timezone || "UTC" });
    await notify(
      parents.map((p: any) => p.id),
      {
        kind: "ask_parent",
        title: `${user.name.split(" ")[0]} is asking for your help`,
        body: `${user.name} asked for your help during ${cls ? `“${cls}”` : "a class"} at ${when}.${message ? `\n\nTheir message: “${message}”` : ""}`,
        link: "/?view=parent_home",
        data: { studentId: user.id, roomSlug: parentRoom(roomSlug) },
      },
      { email: true }
    );
    res.json({ sentTo: parents.map((p: any) => p.name) });
  });

  app.post("/api/help/tickets", requireAuth(), async (req, res) => {
    const user = req.user!;
    const category = CATEGORIES.includes(req.body?.category) ? req.body.category : "other";
    const message = String(req.body?.message || "").trim().slice(0, 2000);
    const roomSlug = req.body?.roomSlug ? String(req.body.roomSlug).slice(0, 120) : null;
    if (message.length < 3) return res.status(400).json({ error: "Tell us briefly what's wrong." });
    if (!ticketLimiter.hit(user.id)) return res.status(429).json({ error: "You've sent several requests in the last hour. We'll get back to you on those." });
    const db: any = await getDb();
    const id = `tkt-${crypto.randomUUID().slice(0, 13)}`;
    await db.insert(schema.supportTickets).values({ id, userId: user.id, roomSlug: roomSlug ? parentRoom(roomSlug) : null, category, message, device: deviceSummary(req.body?.device) });
    const admins = await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.role, "admin"), eq(schema.users.disabled, false)));
    const cls = await className(roomSlug);
    await notify(
      admins.map((a: any) => a.id),
      {
        kind: "ticket_new",
        title: `Help request: ${category}`,
        body: `${user.name}${cls ? ` in “${cls}”` : ""}: ${message.slice(0, 300)}`,
        link: "/?view=support",
        data: { ticketId: id },
      }
    );
    res.json({ id });
  });

  /** Admins: every request (filter by status). Everyone else: their own. */
  app.get("/api/help/tickets", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const admin = req.user!.role === "admin";
    const status = STATUSES.includes(req.query.status as any) ? String(req.query.status) : null;
    const conds: any[] = [];
    if (!admin) conds.push(eq(schema.supportTickets.userId, req.user!.id));
    if (status) conds.push(eq(schema.supportTickets.status, status));
    const rows = await db
      .select({ t: schema.supportTickets, name: schema.users.name, role: schema.users.role, email: schema.users.email })
      .from(schema.supportTickets)
      .innerJoin(schema.users, eq(schema.users.id, schema.supportTickets.userId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(schema.supportTickets.createdAt))
      .limit(200);
    const slugs = [...new Set(rows.map((r: any) => r.t.roomSlug).filter(Boolean))] as string[];
    const classes = slugs.length ? await db.select().from(schema.classes).where(inArray(schema.classes.roomSlug, slugs)) : [];
    const title = (slug: string | null) => {
      const c = classes.find((x: any) => x.roomSlug === slug);
      return c ? (c.topic ? `${c.subject}: ${c.topic}` : c.subject) : slug;
    };
    res.json({
      tickets: rows.map((r: any) => ({
        id: r.t.id,
        category: r.t.category,
        message: r.t.message,
        status: r.t.status,
        answer: r.t.answer,
        answeredAt: r.t.answeredAt,
        createdAt: r.t.createdAt,
        roomSlug: r.t.roomSlug,
        classTitle: title(r.t.roomSlug),
        device: admin ? r.t.device : undefined,
        from: { id: r.t.userId, name: r.name, role: r.role, email: admin ? r.email : undefined },
      })),
    });
  });

  app.post("/api/help/tickets/:id/answer", requireAuth("admin"), async (req, res) => {
    const answer = String(req.body?.answer || "").trim().slice(0, 2000);
    if (!answer) return res.status(400).json({ error: "Write an answer first." });
    const db: any = await getDb();
    const [t] = await db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, req.params.id));
    if (!t) return res.status(404).json({ error: "Request not found" });
    const status = req.body?.close ? "closed" : "answered";
    await db.update(schema.supportTickets).set({ answer, status, answeredBy: req.user!.id, answeredAt: new Date() }).where(eq(schema.supportTickets.id, t.id));
    await notify([t.userId], { kind: "ticket_reply", title: "Reply to your help request", body: `${answer}\n\nYou asked: “${String(t.message).slice(0, 200)}”`, data: { ticketId: t.id } }, { email: true });
    res.json({ ok: true, status });
  });

  app.post("/api/help/tickets/:id/status", requireAuth("admin"), async (req, res) => {
    const status = String(req.body?.status || "");
    if (!STATUSES.includes(status as any)) return res.status(400).json({ error: "Unknown status" });
    const db: any = await getDb();
    const done = await db.update(schema.supportTickets).set({ status }).where(eq(schema.supportTickets.id, req.params.id)).returning();
    if (!done.length) return res.status(404).json({ error: "Request not found" });
    res.json({ ok: true, status });
  });
}
