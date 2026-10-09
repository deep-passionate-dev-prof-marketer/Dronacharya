/**
 * Sign-in routes.
 *  - Google Workspace (OIDC + PKCE) when GOOGLE_CLIENT_ID/SECRET are set; staff must be on GOOGLE_ALLOWED_DOMAIN.
 *  - Email one-time code for students and parents.
 *  - Signed invite links (demo/class links sent to families).
 *  - Dev "sign in as…" for testing with seeded dummy accounts (AUTH_DEV_LOGIN=1 only; never in production).
 */
import crypto from "crypto";
import express from "express";
import { and, eq, gt, isNull, desc } from "drizzle-orm";
import { getDb, schema } from "../db";
import { endSession, forgetSession, requireAuth, signToken, startSession, verifyToken } from "./session";

const STAFF_ROLES = ["admin", "instructor", "sales_rep", "auditor"];

export const devLoginEnabled = () =>
  process.env.AUTH_DEV_LOGIN === "1" || (process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN !== "0");

const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const publicUser = (u: any) => ({
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

/** Signed, expiring invite for a learner to join a class without a password (sent in booking links). */
export async function createInviteToken(userId: string, roomSlug: string, ttlDays = 7) {
  return signToken({ inv: 1, room: roomSlug }, ttlDays * 86400, userId);
}

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

async function findUserByEmail(email: string) {
  const db: any = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase()));
  return u;
}

let googleConfig: Promise<any> | null = null;
async function google() {
  if (!googleConfig) {
    googleConfig = (async () => {
      const oidc = await import("openid-client");
      const config = await oidc.discovery(new URL("https://accounts.google.com"), process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!);
      return { oidc, config };
    })();
    googleConfig.catch(() => (googleConfig = null));
  }
  return googleConfig;
}

export function setupAuthRoutes(app: express.Express) {
  app.get("/api/auth/providers", (_req, res) => {
    res.json({ google: googleEnabled(), emailOtp: true, dev: devLoginEnabled() });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.status(401).json({ user: null });
    const { sid, ...user } = req.user;
    // Forensic watermark id: the person's school id plus a session fingerprint, so a leaked
    // screenshot or recording can be traced to the exact sign-in
    const visibleId = user.role === "student" && user.studentCode ? user.studentCode : user.id;
    res.json({ user: { ...user, watermarkId: `${visibleId} · ${sid.slice(0, 6).toUpperCase()}` } });
  });

  /** 60s ticket so a WebSocket opened before sign-in can authenticate (same signature as the session). */
  app.get("/api/auth/ws-ticket", requireAuth(), async (req, res) => {
    res.json({ ticket: await signToken({ sid: req.user!.sid }, 60, req.user!.id) });
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.user) forgetSession(req.user.sid);
    await endSession(req, res);
    res.json({ ok: true });
  });

  // ---------------- dev sign-in (dummy accounts) ----------------
  app.get("/api/auth/dev/accounts", async (_req, res) => {
    if (!devLoginEnabled()) return res.status(404).json({ error: "Not available" });
    const db: any = await getDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.disabled, false));
    res.json({ accounts: rows.map(publicUser) });
  });

  app.post("/api/auth/dev/login", async (req, res) => {
    if (!devLoginEnabled()) return res.status(404).json({ error: "Not available" });
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, String(req.body?.userId || "")));
    if (!u || u.disabled) return res.status(404).json({ error: "Unknown account" });
    await startSession(req, res, u.id, "dev");
    res.json({ user: publicUser(u) });
  });

  // ---------------- Google Workspace OIDC ----------------
  app.get("/api/auth/google/start", async (req, res) => {
    if (!googleEnabled()) return res.status(404).send("Google sign-in is not configured.");
    const { oidc, config } = await google();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const redirect = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    res.cookie("dr_oidc", await signToken({ verifier, state, nonce, redirect, next: String(req.query.next || "/") }, 600), {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure,
      maxAge: 600_000,
      path: "/api/auth/google",
    });
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirect,
      scope: "openid email profile",
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
      state,
      nonce,
      prompt: "select_account",
      ...(process.env.GOOGLE_ALLOWED_DOMAIN ? { hd: process.env.GOOGLE_ALLOWED_DOMAIN } : {}),
    });
    res.redirect(url.href);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const fail = (msg: string) => res.redirect(`/?signin_error=${encodeURIComponent(msg)}`);
    try {
      const raw = String(req.headers.cookie || "").split(";").map((c) => c.trim()).find((c) => c.startsWith("dr_oidc="));
      const flow = raw ? await verifyToken<{ verifier: string; state: string; nonce: string; redirect: string; next: string }>(decodeURIComponent(raw.slice(8))) : null;
      if (!flow) return fail("Sign-in expired, please try again.");
      const { oidc, config } = await google();
      const current = new URL(`${flow.redirect}?${new URLSearchParams(req.query as any)}`);
      const tokens = await oidc.authorizationCodeGrant(config, current, { pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce });
      const claims: any = tokens.claims();
      if (!claims?.email || !claims.email_verified) return fail("Your Google account email isn't verified.");

      const db: any = await getDb();
      const [linked] = await db
        .select({ u: schema.users })
        .from(schema.identities)
        .innerJoin(schema.users, eq(schema.users.id, schema.identities.userId))
        .where(and(eq(schema.identities.provider, "google"), eq(schema.identities.subject, String(claims.sub))));
      const user = linked?.u || (await findUserByEmail(claims.email));
      if (!user || user.disabled) return fail("This account isn't registered with the school. Contact the admissions office.");
      const domain = process.env.GOOGLE_ALLOWED_DOMAIN;
      if (domain && STAFF_ROLES.includes(user.role) && claims.hd !== domain) return fail(`Staff must sign in with a @${domain} account.`);
      if (!linked) await db.insert(schema.identities).values({ provider: "google", subject: String(claims.sub), userId: user.id }).onConflictDoNothing();

      res.clearCookie("dr_oidc", { path: "/api/auth/google" });
      await startSession(req, res, user.id, "google");
      res.redirect(flow.next.startsWith("/") ? flow.next : "/");
    } catch (err) {
      console.warn("[auth] google callback failed:", err);
      fail("Google sign-in failed. Please try again.");
    }
  });

  // ---------------- email one-time code (students & parents) ----------------
  app.post("/api/auth/otp/start", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = email ? await findUserByEmail(email) : null;
    // Same response whether or not the account exists, so emails can't be enumerated
    const ok = { ok: true, message: "If that email is registered, a 6-digit code is on its way." };
    if (!user || user.disabled) return res.json(ok);
    if (STAFF_ROLES.includes(user.role) && googleEnabled()) return res.json(ok); // staff use Google
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const db: any = await getDb();
    await db.insert(schema.otpCodes).values({ email, codeHash: hash(`${email}:${code}`), expiresAt: new Date(Date.now() + 10 * 60_000) });
    if (process.env.SMTP_URL) {
      // TODO(production): send via the school's email provider
      console.log(`[auth] would email sign-in code to ${email}`);
    } else {
      console.log(`[auth][dev] sign-in code for ${email}: ${code}`);
    }
    res.json(ok);
  });

  app.post("/api/auth/otp/verify", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").replace(/\D/g, "");
    const db: any = await getDb();
    const [row] = await db
      .select()
      .from(schema.otpCodes)
      .where(and(eq(schema.otpCodes.email, email), isNull(schema.otpCodes.usedAt), gt(schema.otpCodes.expiresAt, new Date())))
      .orderBy(desc(schema.otpCodes.id))
      .limit(1);
    if (!row || row.attempts >= 5) return res.status(400).json({ error: "That code has expired. Request a new one." });
    if (row.codeHash !== hash(`${email}:${code}`)) {
      await db.update(schema.otpCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.otpCodes.id, row.id));
      return res.status(400).json({ error: "That code isn't right." });
    }
    await db.update(schema.otpCodes).set({ usedAt: new Date() }).where(eq(schema.otpCodes.id, row.id));
    const user = await findUserByEmail(email);
    if (!user || user.disabled) return res.status(400).json({ error: "Account unavailable." });
    await startSession(req, res, user.id, "email_otp");
    res.json({ user: publicUser(user) });
  });

  // ---------------- invite links (demo / class links for families) ----------------
  app.post("/api/auth/invite/accept", async (req, res) => {
    const claims = await verifyToken<{ inv: number; room: string }>(String(req.body?.token || ""));
    if (!claims?.inv || !claims.sub) return res.status(400).json({ error: "This class link has expired. Ask for a new one." });
    const db: any = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, claims.sub));
    if (!u || u.disabled) return res.status(400).json({ error: "Account unavailable." });
    await startSession(req, res, u.id, "invite");
    res.json({ user: publicUser(u), roomSlug: claims.room });
  });

  app.post("/api/auth/invite", requireAuth("admin", "instructor", "sales_rep"), async (req, res) => {
    const userId = String(req.body?.userId || "");
    const roomSlug = String(req.body?.roomSlug || "");
    if (!userId || !roomSlug) return res.status(400).json({ error: "userId and roomSlug required" });
    const token = await createInviteToken(userId, roomSlug);
    res.json({ url: `${req.protocol}://${req.get("host")}/?room=${encodeURIComponent(roomSlug)}&invite=${encodeURIComponent(token)}` });
  });
}
