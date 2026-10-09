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

async function open(): Promise<Db> {
  dbKind = process.env.DATABASE_URL ? "postgres" : "pglite";
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /supabase|sslmode=require/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
      max: 10,
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
