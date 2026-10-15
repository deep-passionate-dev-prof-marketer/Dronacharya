/**
 * Production configuration checks. Problems stop the server from starting (a guessable session
 * secret or open test sign-in would let anyone in); warnings are logged so a half-configured
 * deployment is obvious in the logs.
 */
const KNOWN_SECRETS = new Set(["change-me-to-64-random-hex-chars", "dev-only-insecure-session-secret-change-me-0123456789"]);

export const isProduction = (env = process.env) => env.NODE_ENV === "production";

export function productionConfigProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  if (!isProduction(env)) return [];
  const problems: string[] = [];
  const secret = env.SESSION_SECRET || "";
  if (secret.length < 32 || KNOWN_SECRETS.has(secret) || new Set(secret).size < 12) {
    problems.push("SESSION_SECRET must be 32+ random characters, not the example value (e.g. `openssl rand -hex 32`).");
  }
  if (env.AUTH_DEV_LOGIN === "1" && (env.DEV_LOGIN_PASSCODE || "").length < 8) {
    problems.push("AUTH_DEV_LOGIN=1 needs DEV_LOGIN_PASSCODE (8+ characters) in production, or set AUTH_DEV_LOGIN=0.");
  }
  return problems;
}

export function productionConfigWarnings(env: NodeJS.ProcessEnv = process.env): string[] {
  if (!isProduction(env)) return [];
  const warnings: string[] = [];
  if (!env.BOOTSTRAP_ADMIN_EMAIL) warnings.push("BOOTSTRAP_ADMIN_EMAIL is not set: no admin account is created on a new database.");
  if (!env.DATABASE_URL) warnings.push("DATABASE_URL is not set: using the embedded database, which is lost when the container restarts.");
  if (!env.MEDIA_ANNOUNCED_IP) {
    warnings.push("MEDIA_ANNOUNCED_IP is not set: the media server announces this machine's first network address. Set it to the server's public IP.");
  }
  if (env.AUTH_DEV_LOGIN === "1") warnings.push("Test sign-in is ON (behind DEV_LOGIN_PASSCODE). Use this for staging only.");
  if (!env.PUBLIC_APP_URL) warnings.push("PUBLIC_APP_URL is not set: links in emails use the request's host.");
  return warnings;
}

/** Called first thing in server.ts. */
export function checkConfigOrExit() {
  const problems = productionConfigProblems();
  for (const w of productionConfigWarnings()) console.warn(`[config] ${w}`);
  if (problems.length) {
    for (const p of problems) console.error(`[config] ${p}`);
    console.error("[config] Refusing to start in production until these are fixed.");
    process.exit(1);
  }
}
