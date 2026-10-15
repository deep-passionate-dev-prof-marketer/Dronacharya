/**
 * Signed sessions: an HS256 JWT in an HttpOnly cookie, backed by a `sessions` row so a session can
 * be revoked (logout, disabled user). The browser can't read or forge it, so every server check
 * uses `req.user` instead of whatever role the client claims.
 */
import crypto from "crypto";
import type express from "express";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export type Role = "admin" | "instructor" | "sales_rep" | "auditor" | "student" | "parent";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor?: string | null;
  studentCode?: string | null;
  country?: string | null;
  languageTag?: string | null;
  timezone?: string | null;
  gradeLevel?: number | null;
  /** Signed in with an admin's temporary password: must pick their own before anything else */
  mustChangePassword?: boolean;
  sid: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export const COOKIE = "dr_session";
const TTL_MS = 8 * 3600 * 1000;
const REFRESH_WHEN_LEFT_MS = 4 * 3600 * 1000;
/** A session ends 14 days after sign-in however active it is */
const MAX_SESSION_MS = 14 * 86400 * 1000;

let devSecretWarned = false;
function secret(): Uint8Array {
  let s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (32+ chars) is required in production");
    if (!devSecretWarned) {
      console.warn("[auth] SESSION_SECRET not set; using an insecure development secret");
      devSecretWarned = true;
    }
    s = "dev-only-insecure-session-secret-change-me-0123456789";
  }
  return new TextEncoder().encode(s);
}

export async function signToken(claims: Record<string, unknown>, ttlSec: number, subject?: string) {
  const jwt = new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${ttlSec}s`);
  if (subject) jwt.setSubject(subject);
  return jwt.sign(secret());
}

/**
 * Verifies a token. `typ` must match the kind of token expected ("session", "ws", "invite", "oidc"),
 * so one kind can never be replayed as another (e.g. a 60-second socket ticket as a session cookie).
 */
export async function verifyToken<T = Record<string, unknown>>(token: string, typ?: string): Promise<(T & { sub?: string; exp?: number; typ?: string }) | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typ && payload.typ !== typ) return null;
    return payload as any;
  } catch {
    return null;
  }
}

const cookieOptions = (req: express.Request) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" || req.secure,
  path: "/",
  maxAge: TTL_MS,
});

/** Creates a DB session for this user and sets the cookie. */
export async function startSession(req: express.Request, res: express.Response, userId: string, provider: string) {
  const db: any = await getDb();
  const sid = crypto.randomUUID();
  await db.insert(schema.sessions).values({
    id: sid,
    userId,
    provider,
    expiresAt: new Date(Date.now() + TTL_MS),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    // req.ip honours "trust proxy" (the first X-Forwarded-For entry can be set by the client)
    ip: String(req.ip || "").slice(0, 64),
  });
  res.cookie(COOKIE, await signToken({ sid, typ: "session" }, TTL_MS / 1000, userId), cookieOptions(req));
}

export async function endSession(req: express.Request, res: express.Response) {
  if (req.user) {
    const db: any = await getDb();
    await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.id, req.user.sid));
  }
  res.clearCookie(COOKIE, { path: "/" });
}

// Short cache so every request doesn't hit the DB; revocation applies within 30s
const cache = new Map<string, { user: SessionUser | null; at: number }>();
const CACHE_MS = 30_000;

export function forgetSession(sid: string) {
  cache.delete(sid);
}

/** Signs a person out everywhere (disabled account, role change): revokes their sessions and drops cached ones. */
export async function revokeUserSessions(userId: string) {
  const db: any = await getDb();
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.userId, userId));
  for (const [sid, hit] of cache) if (hit.user?.id === userId) cache.delete(sid);
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** Resolves the signed-in user from a raw Cookie header (used by HTTP middleware and WebSocket upgrades). */
export async function userFromCookieHeader(cookieHeader: string | undefined): Promise<{ user: SessionUser; exp: number } | null> {
  const token = readCookie(cookieHeader, COOKIE);
  return token ? userFromToken(token, "session") : null;
}

/** Resolves the user behind a session token, or behind a short-lived WebSocket ticket (typ "ws"). */
export async function userFromToken(token: string, typ: "session" | "ws"): Promise<{ user: SessionUser; exp: number } | null> {
  const claims = await verifyToken<{ sid: string }>(token, typ);
  if (!claims?.sid || !claims.sub) return null;
  const hit = cache.get(claims.sid);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.user ? { user: hit.user, exp: (claims.exp || 0) * 1000 } : null;

  const db: any = await getDb();
  const [row] = await db
    .select({ s: schema.sessions, u: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, claims.sid));
  const valid =
    row &&
    !row.s.revokedAt &&
    new Date(row.s.expiresAt).getTime() > Date.now() &&
    // Sliding expiry never extends a session past its absolute lifetime
    Date.now() - new Date(row.s.createdAt).getTime() < MAX_SESSION_MS &&
    !row.u.disabled &&
    row.u.id === claims.sub;
  const user: SessionUser | null = valid
    ? {
        id: row.u.id,
        email: row.u.email,
        name: row.u.name,
        role: row.u.role,
        avatarColor: row.u.avatarColor,
        studentCode: row.u.studentCode,
        country: row.u.country,
        languageTag: row.u.languageTag,
        timezone: row.u.timezone,
        gradeLevel: row.u.gradeLevel,
        mustChangePassword: Boolean(row.u.mustChangePassword),
        sid: row.s.id,
      }
    : null;
  cache.set(claims.sid, { user, at: Date.now() });
  return user ? { user, exp: (claims.exp || 0) * 1000 } : null;
}

/** Global middleware: attaches req.user when a valid session cookie is present, and slides its expiry. */
export function attachUser(): express.RequestHandler {
  return async (req, res, next) => {
    try {
      const found = await userFromCookieHeader(req.headers.cookie);
      if (found) {
        req.user = found.user;
        if (found.exp - Date.now() < REFRESH_WHEN_LEFT_MS) {
          const db: any = await getDb();
          await db.update(schema.sessions).set({ expiresAt: new Date(Date.now() + TTL_MS) }).where(eq(schema.sessions.id, found.user.sid));
          res.cookie(COOKIE, await signToken({ sid: found.user.sid, typ: "session" }, TTL_MS / 1000, found.user.id), cookieOptions(req));
        }
      }
    } catch (err) {
      console.warn("[auth] session check failed:", err);
    }
    next();
  };
}

/** Route guard: 401 when signed out, 403 when the role isn't allowed. */
export function requireAuth(...roles: Role[]): express.RequestHandler {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Please sign in." });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: "You don't have access to this." });
    next();
  };
}
