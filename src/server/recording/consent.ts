/**
 * Recording consent. Classes are recorded automatically; a learner whose parent/guardian declined
 * is kept out of the recording (hidden from the video layout, their speech not stored).
 * With no decision on record the school default applies (RECORDING_CONSENT_DEFAULT=include|exclude).
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";

const LEARNER_ROLES = ["student"];

export function recordingDefaultIncluded() {
  return (process.env.RECORDING_CONSENT_DEFAULT || "include") !== "exclude";
}

/** Latest decision per user for a consent kind (undefined = no decision). */
export async function latestConsents(userIds: string[], kind: "analytics" | "recording"): Promise<Map<string, { granted: boolean; at: string; decidedBy: string }>> {
  const out = new Map<string, { granted: boolean; at: string; decidedBy: string }>();
  if (!userIds.length) return out;
  const db: any = await getDb();
  const rows = await db
    .select()
    .from(schema.consents)
    .where(and(eq(schema.consents.kind, kind), inArray(schema.consents.userId, userIds)))
    .orderBy(asc(schema.consents.at), asc(schema.consents.id));
  for (const r of rows) out.set(r.userId, { granted: r.granted, at: new Date(r.at).toISOString(), decidedBy: r.decidedBy });
  return out;
}

/** True when this person must be kept out of class recordings. Staff are always recorded. */
export async function isRecordingExcluded(user: { id: string; role: string }): Promise<boolean> {
  if (!LEARNER_ROLES.includes(user.role)) return false;
  const c = (await latestConsents([user.id], "recording")).get(user.id);
  return c ? !c.granted : !recordingDefaultIncluded();
}
