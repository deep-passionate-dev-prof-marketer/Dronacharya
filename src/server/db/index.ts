/**
 * Database connection.
 * - DATABASE_URL set (Supabase / any Postgres) → node-postgres pool.
 * - Otherwise → PGlite: real Postgres compiled to WASM, stored in data/pglite (the "dummy" DB for testing).
 * Migrations in ./migrations run on startup for both.
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(here, "migrations");

let dbPromise: Promise<Db> | null = null;
let closeFn: (() => Promise<void>) | null = null;
export let dbKind: "postgres" | "pglite" = "pglite";

function withoutSslMode(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return url;
  }
}

async function open(): Promise<Db> {
  dbKind = process.env.DATABASE_URL ? "postgres" : "pglite";
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    // TLS: verify the server with the provider's CA when given (Supabase publishes one); otherwise
    // encrypt without verification, and say so in production logs
    const wantsTls = /supabase|sslmode=require/.test(process.env.DATABASE_URL);
    const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
    if (wantsTls && !ca && process.env.NODE_ENV === "production") console.warn("[db] DATABASE_CA_CERT not set: database TLS is encrypted but the server certificate isn't verified");
    const pool = new Pool({
      // Our ssl settings apply only if the URL doesn't carry its own sslmode
      connectionString: withoutSslMode(process.env.DATABASE_URL),
      ssl: ca ? { ca, rejectUnauthorized: true } : wantsTls ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
    });
    const db = drizzlePg(pool, { schema });
    closeFn = () => pool.end();
    await migratePg(db, { migrationsFolder: MIGRATIONS });
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), "data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  closeFn = () => client.close();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

/** Lazily opened, migrated database handle (shared). */
export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = open();
    dbPromise.then(
      () => console.log(`[db] ready (${dbKind})`),
      (err) => console.error("[db] failed to open:", err)
    );
  }
  return dbPromise;
}

export { schema };

/** Flush and close the database (PGlite needs this to avoid crash recovery on next start). */
export async function closeDb() {
  if (closeFn) await closeFn().catch(() => {});
  closeFn = null;
}
