/**
 * Small persistence helpers for the write-through hubs (they keep a hot in-memory copy for their
 * synchronous rules logic and persist every change here). Single-instance by design: to scale out,
 * move reads to the database per request.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./index";

export async function kvLoad<T>(namespace: string): Promise<Array<{ key: string; value: T }>> {
  const db: any = await getDb();
  const rows = await db.select().from(schema.kvStore).where(eq(schema.kvStore.namespace, namespace));
  return rows.map((r: any) => ({ key: r.key, value: r.value as T }));
}

export async function kvUpsert(namespace: string, entries: Array<{ key: string; value: unknown }>) {
  if (!entries.length) return;
  const db: any = await getDb();
  await db
    .insert(schema.kvStore)
    .values(entries.map((e) => ({ namespace, key: e.key, value: e.value, updatedAt: new Date() })))
    .onConflictDoUpdate({
      target: [schema.kvStore.namespace, schema.kvStore.key],
      set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
    });
}

export async function kvDelete(namespace: string, key: string) {
  const db: any = await getDb();
  await db.delete(schema.kvStore).where(and(eq(schema.kvStore.namespace, namespace), eq(schema.kvStore.key, key)));
}

export async function auditInsert(stream: string, e: { id: string; at: string; type: string; roomSlug?: string; userId?: string; data: unknown }) {
  const db: any = await getDb();
  await db
    .insert(schema.auditEvents)
    .values({ id: e.id, stream, at: new Date(e.at), type: e.type, roomSlug: e.roomSlug || null, userId: e.userId || null, data: e.data })
    .onConflictDoNothing();
}

/** Most recent events of a stream, oldest first. */
export async function auditLoad<T>(stream: string, limit = 20000): Promise<T[]> {
  const db: any = await getDb();
  const rows = await db.select().from(schema.auditEvents).where(eq(schema.auditEvents.stream, stream)).orderBy(desc(schema.auditEvents.at)).limit(limit);
  return rows.reverse().map((r: any) => r.data as T);
}

/** Fire-and-forget write with logging (hubs never block a request on persistence). */
export function persist(label: string, p: Promise<unknown>) {
  p.catch((err) => console.error(`[db] ${label} failed:`, err));
}
