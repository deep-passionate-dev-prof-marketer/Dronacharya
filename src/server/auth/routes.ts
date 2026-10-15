/**
 * Sign-in routes.
 *  - Email and password (set by an admin on People; temporary passwords must be changed at first sign-in).
 *    Rate-limited per address and per email, with the same answer whether or not the account exists.
 *  - Email one-time code, only when the school runs its own mail server (SMTP_URL).
 *  - Signed class invite links for learners and parents (stored, use-limited, revocable).
 *  - Test "sign in as…" accounts when AUTH_DEV_LOGIN=1 (in production only behind DEV_LOGIN_PASSCODE: staging).
 */
import crypto from "crypto";
import express from "express";
import { and, eq, gt, isNull, desc, lt, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { endSession, forgetSession, requireAuth, revokeUserSessions, signToken, startSession, verifyToken } from "./session";
import { dummyPasswordHash, hashPassword, passwordProblem, verifyPassword } from "./password";
import { createLimiter } from "../rateLimit";
import { mailEnabled, sendMail } from "../mail";
import { isProduction } from "../config";
import { canHost, isEnrolled } from "../roomAccess";

const STAFF_ROLES = ["admin", "instructor", "sales_rep", "auditor"];

/** Test accounts: on by default in development; in production only with AUTH_DEV_LOGIN=1 (and a passcode, checked at boot). */
export const devLoginEnabled = () =>
  process.env.AUTH_DEV_LOGIN === "1" || (!isProduction() && process.env.AUTH_DEV_LOGIN !== "0");
const devPasscodeRequired = () => Boolean(process.env.DEV_LOGIN_PASSCODE);


export const publicUser = (u: any) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  avatarColor: u.avatarColor,
  studentCode: u.studentCode,
  country: u.country,
  languageTag: u.languageTag,
  gradeLevel: u.gradeLevel,
});

/** A same-site path to go to after sign-in ("/x", never "//host" or "/\host") */
export const safeNext = (next: unknown) => {
  const n = String(next || "/");
  return /^\/(?![/\\])/.test(n) ? n.slice(0, 500) : "/";
};

const appUrl = (req: express.Request) => (process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

/**
 * Signed invite for a learner (or parent) to open a class without a password. Stored so it can be
 * use-limited and revoked; the token itself carries only an id.
 */
export async function createInviteToken(userId: string, roomSlug: string, opts: { createdBy?: string; ttlDays?: number; maxUses?: number } = {}) {
  const ttlDays = opts.ttlDays ?? 7;
  const jti = crypto.randomUUID();
  const db: any = await getDb();
  await db.insert(schema.inviteTokens).values({
    jti,
    userId,
    roomSlug,
    createdBy: opts.createdBy || null,
    expiresAt: new Date(Date.now() + ttlDays * 864e5),
    maxUses: opts.maxUses ?? 10,
  });
  return signToken({ typ: "invite", jti, room: roomSlug }, ttlDays * 86400, userId);
}

export async function inviteUrl(req: express.Request, userId: string, roomSlug: string, createdBy?: string) {
  const token = await createInviteToken(userId, roomSlug, { createdBy });
  return `${appUrl(req)}/?room=${encodeURIComponent(roomSlug)}&invite=${encodeURIComponent(token)}`;
}

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

async function findUserByEmail(email: string) {
  const db: any = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase()));
  return u;
}


// Sign-in code limits: per email and per network address
const otpStartByEmail = createLimiter(3, 15 * 60_000);
const otpStartByIp = createLimiter(20, 15 * 60_000);
const otpVerifyByEmail = createLimiter(10, 15 * 60_000);
const otpVerifyByIp = createLimiter(50, 15 * 60_000);
// Staging (production build with test accounts): tight, against passcode guessing. Local dev: roomy,
// so test suites that sign in many accounts don't trip it.
const devLoginByIpProd = createLimiter(30, 5 * 60_000);
const devLoginByIpDev = createLimiter(1000, 5 * 60_000);
const devLoginByIp = { hit: (key: string) => (process.env.NODE_ENV === "production" ? devLoginByIpProd : devLoginByIpDev).hit(key) };
const inviteAcceptByIp = createLimiter(30, 15 * 60_000);
/** Failed password sign-ins only: a school network (one address, many learners) never locks itself out */
const passwordFailsByIp = createLimiter(100, 15 * 60_000);
const passwordFailsByEmail = createLimiter(8, 15 * 60_000);
const passwordChanges = createLimiter(8, 15 * 60_000);

const passcodeOk = (req: express.Request) => {
  const expected = process.env.DEV_LOGIN_PASSCODE || "";
  if (!expected) return true;
  const given = String(req.get("x-dev-passcode") || req.body?.passcode || "");
  const a = Buffer.from(hash(given));
  const b = Buffer.from(hash(expected));
  return crypto.timingSafeEqual(a, b);
};

export function setupAuthRoutes(app: express.Express) {
  app.get("/api/auth/providers", (_req, res) => {
    // Email codes need a mail server in production (in development codes are printed in the server log)
    res.json({ password: true, emailOtp: mailEnabled() || !isProduction(), dev: devLoginEnabled(), devPasscode: devLoginEnabled() && devPasscodeRequired() });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.status(401).json({ user: null });
    const { sid, ...user } = req.user;
    // Forensic watermark id: the person's school id plus a session fingerprint, so a leaked
    // screenshot or recording can be traced to the exact sign-in
    const visibleId = user.role === "student" && user.studentCode ? user.studentCode : user.id;
    res.json({ user: { ...user, watermarkId: `${visibleId} · ${sid.slice(0, 6).toUpperCase()}` } });
  });

  /** 60 s ticket so a WebSocket opened before sign-in can authenticate (typ "ws": never valid as a session). */
  app.get("/api/auth/ws-ticket", requireAuth(), async (req, res) => {
    res.json({ ticket: await signToken({ sid: req.user!.sid, typ: "ws" }, 60, req.user!.id) });
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.user) forgetSession(req.user.sid);
    await endSession(req, res);
    res.json({ ok: true });
  });

  // ---------------- test accounts (development, or staging behind a passcode) ----------------
  const devGate: express.RequestHandler = (req, res, next) => {
    if (!devLoginEnabled()) return res.status(404).json({ error: "Not available" });
    if (!devLoginByIp.hit(req.ip || "?")) return res.status(429).json({ error: "Too many attempts. Wait a few minutes." });
    if (!passcodeOk(req)) return res.status(403).json({ error: "That passcode isn't right.", passcode: true });
    next();
  };

  app.get("/api/auth/dev/accounts", devGate, async (_req, res) => {
    const db: any = await getDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.disabled, false));
    res.json({ accounts: rows.map(publicUser) });
  });

  app.post("/api/auth/dev/login", devGate, async (req, res) => {
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, String(req.body?.userId || "")));
    if (!u || u.disabled) return res.status(404).json({ error: "Unknown account" });
    await startSession(req, res, u.id, "dev");
    res.json({ user: publicUser(u) });
  });

  // ---------------- email and password ----------------
  app.post("/api/auth/password/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
    const password = String(req.body?.password || "").slice(0, 200);
    if (!email.includes("@") || !password) return res.status(400).json({ error: "Enter your email and password." });
    const ip = req.ip || "?";
    if (passwordFailsByIp.full(ip) || passwordFailsByEmail.full(email)) {
      return res.status(429).json({ error: "Too many tries. Wait 15 minutes, or ask the school office to reset your password." });
    }
    const user = await findUserByEmail(email);
    // Same work and the same answer whether or not the account exists
    const ok = await verifyPassword(password, user?.passwordHash || (await dummyPasswordHash()));
    if (!user || !ok || user.disabled || !user.passwordHash) {
      passwordFailsByIp.hit(ip);
      passwordFailsByEmail.hit(email);
      return res.status(401).json({ error: "That email and password don't match." });
    }
    passwordFailsByEmail.reset(email);
    await startSession(req, res, user.id, "password");
    res.json({ user: publicUser(user), mustChangePassword: Boolean(user.mustChangePassword) });
  });

  /** Change your own password (needs the current one; a temporary one counts) */
  app.post("/api/auth/password/change", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, req.user!.id));
    if (!passwordChanges.hit(u.id)) return res.status(429).json({ error: "Too many tries. Wait 15 minutes." });
    if (u.passwordHash && !(await verifyPassword(String(req.body?.current || ""), u.passwordHash))) return res.status(400).json({ error: "Your current password isn't right." });
    const next = String(req.body?.next || "");
    const problem = passwordProblem(next, u);
    if (problem) return res.status(400).json({ error: problem });
    if (u.passwordHash && (await verifyPassword(next, u.passwordHash))) return res.status(400).json({ error: "Choose a password you haven't used here." });
    await db.update(schema.users).set({ passwordHash: await hashPassword(next), mustChangePassword: false, passwordUpdatedAt: new Date() }).where(eq(schema.users.id, u.id));
    // Signed in elsewhere with the old password? Those sessions end; this one carries on
    await revokeUserSessions(u.id);
    await startSession(req, res, u.id, "password");
    res.json({ ok: true });
  });

  app.post("/api/auth/otp/start", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
    // Same answer whether or not the account exists, so emails can't be enumerated
    const ok = { ok: true, message: "If that email is registered, a 6-digit code is on its way. It works for 10 minutes." };
    if (!email.includes("@")) return res.status(400).json({ error: "Enter your email address." });
    if (!mailEnabled() && isProduction()) return res.status(503).json({ error: "Email codes aren't set up on this server. Sign in with your password, or ask the school office to reset it." });
    if (!otpStartByIp.hit(req.ip || "?") || !otpStartByEmail.hit(email)) {
      return res.status(429).json({ error: "Too many codes requested. Wait 15 minutes and try again." });
    }
    const user = await findUserByEmail(email);
    if (!user || user.disabled) return res.json(ok);
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const db: any = await getDb();
    // A new code replaces any earlier ones
    await db.update(schema.otpCodes).set({ usedAt: new Date() }).where(and(eq(schema.otpCodes.email, email), isNull(schema.otpCodes.usedAt)));
    await db.insert(schema.otpCodes).values({ email, codeHash: hash(`${email}:${code}`), expiresAt: new Date(Date.now() + 10 * 60_000) });
    const sent = await sendMail({
      to: email,
      subject: `${code} is your 21K School sign-in code`,
      text: `Hi ${user.name.split(" ")[0]},\n\nYour sign-in code is ${code}. It works for 10 minutes.\n\nIf you didn't ask for it, you can ignore this email.\n\n21K School`,
    });
    if (!sent && !isProduction()) console.log(`[auth][dev] sign-in code for ${email}: ${code}`);
    if (!sent && isProduction()) console.warn(`[auth] couldn't email a sign-in code (SMTP_URL not set or failing)`);
    res.json(ok);
  });

  app.post("/api/auth/otp/verify", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 200);
    const code = String(req.body?.code || "").replace(/\D/g, "").slice(0, 6);
    if (!otpVerifyByIp.hit(req.ip || "?") || !otpVerifyByEmail.hit(email)) {
      return res.status(429).json({ error: "Too many tries. Wait 15 minutes and request a new code." });
    }
    const db: any = await getDb();
    const [row] = await db
      .select()
      .from(schema.otpCodes)
      .where(and(eq(schema.otpCodes.email, email), isNull(schema.otpCodes.usedAt), gt(schema.otpCodes.expiresAt, new Date())))
      .orderBy(desc(schema.otpCodes.id))
      .limit(1);
    if (!row) return res.status(400).json({ error: "That code has expired. Request a new one." });
    // Count the attempt atomically before comparing, so parallel guesses can't share one attempt
    const [counted] = await db
      .update(schema.otpCodes)
      .set({ attempts: sql`${schema.otpCodes.attempts} + 1` })
      .where(and(eq(schema.otpCodes.id, row.id), lt(schema.otpCodes.attempts, 5), isNull(schema.otpCodes.usedAt)))
      .returning({ id: schema.otpCodes.id });
    if (!counted) return res.status(400).json({ error: "Too many wrong codes. Request a new one." });
    if (row.codeHash !== hash(`${email}:${code}`)) return res.status(400).json({ error: "That code isn't right." });
    // Use it exactly once
    const [used] = await db
      .update(schema.otpCodes)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.otpCodes.id, row.id), isNull(schema.otpCodes.usedAt)))
      .returning({ id: schema.otpCodes.id });
    if (!used) return res.status(400).json({ error: "That code has already been used. Request a new one." });
    const user = await findUserByEmail(email);
    if (!user || user.disabled) return res.status(400).json({ error: "Account unavailable." });
    otpVerifyByEmail.reset(email);
    await startSession(req, res, user.id, "email_otp");
    res.json({ user: publicUser(user) });
  });

  // ---------------- invite links (class links for learners and parents) ----------------
  app.post("/api/auth/invite/accept", async (req, res) => {
    if (!inviteAcceptByIp.hit(req.ip || "?")) return res.status(429).json({ error: "Too many attempts. Wait a few minutes." });
    const claims = await verifyToken<{ jti: string; room: string }>(String(req.body?.token || ""), "invite");
    if (!claims?.jti || !claims.sub) return res.status(400).json({ error: "This class link has expired. Ask for a new one." });
    const db: any = await getDb();
    const [counted] = await db
      .update(schema.inviteTokens)
      .set({ uses: sql`${schema.inviteTokens.uses} + 1` })
      .where(
        and(
          eq(schema.inviteTokens.jti, claims.jti),
          eq(schema.inviteTokens.userId, claims.sub),
          isNull(schema.inviteTokens.revokedAt),
          gt(schema.inviteTokens.expiresAt, new Date()),
          lt(schema.inviteTokens.uses, schema.inviteTokens.maxUses)
        )
      )
      .returning({ room: schema.inviteTokens.roomSlug });
    if (!counted) return res.status(400).json({ error: "This class link has expired or was used too many times. Ask for a new one." });
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, claims.sub));
    if (!u || u.disabled || !["student", "parent"].includes(u.role)) return res.status(400).json({ error: "Account unavailable." });
    await startSession(req, res, u.id, "invite");
    res.json({ user: publicUser(u), roomSlug: counted.room });
  });

  /**
   * A sign-in link for one learner (or their parent). Admins: any learner or parent. Teachers and
   * counsellors: only learners enrolled in a class they host (and those learners' parents).
   */
  app.post("/api/auth/invite", requireAuth("admin", "instructor", "sales_rep"), async (req, res) => {
    const userId = String(req.body?.userId || "");
    const roomSlug = String(req.body?.roomSlug || "").slice(0, 120);
    if (!userId || !roomSlug) return res.status(400).json({ error: "userId and roomSlug are required" });
    const db: any = await getDb();
    const [target] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (!target || target.disabled || !["student", "parent"].includes(target.role)) return res.status(403).json({ error: "Invite links are only for learners and parents." });
    if (req.user!.role !== "admin") {
      const allowed = (await canHost(req.user!, roomSlug)) && (await isEnrolled(target.id, target.role, roomSlug));
      if (!allowed) return res.status(403).json({ error: "You can only invite learners enrolled in a class you host." });
    }
    res.json({ url: await inviteUrl(req, target.id, roomSlug, req.user!.id) });
  });
}
