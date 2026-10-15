/**
 * Passwords: stored only as salted scrypt hashes (Node's built-in crypto, nothing external).
 * Format: scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>, so the cost can be raised later and old hashes
 * still verify.
 */
import crypto from "crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every((x) => Number.isInteger(x) && x > 0) || n > 1 << 20) return false;
  const salt = Buffer.from(parts[4], "base64");
  const want = Buffer.from(parts[5], "base64");
  const got = await scrypt(password, salt, n, r, p);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/** A hash to compare against when the account doesn't exist, so timing doesn't reveal which emails are real */
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = () => (dummyHash ||= hashPassword(crypto.randomBytes(16).toString("hex")));

const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "iloveyou",
  "letmein123",
  "welcome123",
  "admin12345",
  "school1234",
  "abcdefghij",
]);

/** Why a password isn't good enough (null = fine). At least 10 characters, not common, not your name or email. */
export function passwordProblem(password: string, who: { email?: string | null; name?: string | null } = {}): string | null {
  if (typeof password !== "string" || password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "That's too long (200 characters at most).";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "That password is too easy to guess.";
  const local = (who.email || "").split("@")[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return "Don't use your email address in your password.";
  const first = (who.name || "").split(/\s+/)[0]?.toLowerCase() || "";
  if (first.length >= 4 && lower.includes(first)) return "Don't use your name in your password.";
  return null;
}

/** A temporary password an admin can read out or write down: 3 groups of 4, no look-alike characters */
export function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = () => Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return `${pick()}-${pick()}-${pick()}`;
}
