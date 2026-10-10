/**
 * Learner and teacher timezones for analytics. Nobody types a timezone: it comes from the device
 * snapshot sent with every classroom join and from bookings, and is only stored when it's a real
 * IANA zone.
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

let zones: Set<string> | null = null;
export function validTimezone(tz: unknown): string | null {
  const s = String(tz || "").trim();
  if (!s || s.length > 64) return null;
  if (!zones) {
    try {
      zones = new Set((Intl as any).supportedValuesOf("timeZone") as string[]);
      zones.add("UTC");
    } catch {
      zones = new Set();
    }
  }
  if (zones.has(s)) return s;
  // Older names (e.g. Asia/Calcutta) aren't in the canonical list but every runtime still accepts them
  try {
    new Intl.DateTimeFormat("en", { timeZone: s });
    return s;
  } catch {
    return null;
  }
}

const known = new Map<string, string>();
/** Saves a user's timezone when it changes (at most one write per user per zone per process). */
export async function rememberTimezone(userId: string, tz: unknown) {
  const zone = validTimezone(tz);
  if (!zone || known.get(userId) === zone) return;
  known.set(userId, zone);
  const db: any = await getDb();
  await db.update(schema.users).set({ timezone: zone }).where(eq(schema.users.id, userId));
}
