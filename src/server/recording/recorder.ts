/**
 * Class recordings: every class is recorded as its transcript (what each speaker said, with times),
 * stored in the school's own database. When a recording stops, lecture notes are generated from it.
 * (Older video recordings, if any, are still played back from storage.)
 */
import crypto from "crypto";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "../db";
import { classByRoom } from "../classesHub";
import { buildNotes, TranscriptEntry } from "./notes";

export interface RecordingRow {
  id: string;
  roomSlug: string;
  mode: "video" | "transcript_only";
  status: "recording" | "processing" | "ready" | "failed";
  egressId: string | null;
  storage: string | null;
  filePath: string | null;
  error: string | null;
  startedBy: string | null;
  excluded: string[];
  startedAt: string;
  endedAt: string | null;
}

export function toRecording(r: any): RecordingRow {
  return {
    ...r,
    excluded: Array.isArray(r.excluded) ? r.excluded : [],
    startedAt: new Date(r.startedAt).toISOString(),
    endedAt: r.endedAt ? new Date(r.endedAt).toISOString() : null,
  };
}

export async function getRecording(id: string): Promise<RecordingRow | null> {
  const db: any = await getDb();
  const [r] = await db.select().from(schema.recordings).where(eq(schema.recordings.id, id));
  return r ? toRecording(r) : null;
}

/** Starts recording a class (its transcript). */
export async function startRecording(roomSlug: string, startedBy: string): Promise<RecordingRow> {
  const db: any = await getDb();
  const id = `rec-${crypto.randomUUID()}`;
  await db.insert(schema.recordings).values({ id, roomSlug, mode: "transcript_only", status: "recording", egressId: null, storage: null, filePath: null, error: null, startedBy, excluded: [] });
  return (await getRecording(id))!;
}

/** Stops a recording; notes are generated once the transcript is final. */
export async function stopRecording(id: string, endedAt: Date = new Date()): Promise<RecordingRow | null> {
  const rec = await getRecording(id);
  if (!rec || rec.status !== "recording") return rec;
  const db: any = await getDb();
  await db.update(schema.recordings).set({ status: "ready", endedAt }).where(eq(schema.recordings.id, id));
  // Give the last caption lines a moment to arrive, then write notes
  setTimeout(() => generateNotes(id).catch((e) => console.error("[notes] generation failed:", e)), Number(process.env.NOTES_DELAY_MS || 8000));
  return getRecording(id);
}

export async function transcriptFor(roomSlug: string, from: Date, to: Date): Promise<TranscriptEntry[]> {
  const db: any = await getDb();
  const rows = await db
    .select()
    .from(schema.transcriptLines)
    .where(and(eq(schema.transcriptLines.roomSlug, roomSlug), gte(schema.transcriptLines.at, from), lte(schema.transcriptLines.at, to)))
    .orderBy(asc(schema.transcriptLines.at), asc(schema.transcriptLines.id));
  return rows.map((r: any) => ({ at: new Date(r.at).toISOString(), speakerId: r.speakerId, speakerName: r.speakerName, text: r.text }));
}

export async function generateNotes(recordingId: string) {
  const rec = await getRecording(recordingId);
  if (!rec) return null;
  const end = rec.endedAt ? new Date(new Date(rec.endedAt).getTime() + 30_000) : new Date();
  const lines = await transcriptFor(rec.roomSlug, new Date(rec.startedAt), end);
  const cls = await classByRoom(rec.roomSlug);
  const notes = await buildNotes(lines, { subject: cls?.subject, topic: cls?.topic || undefined, kind: cls?.kind });
  const db: any = await getDb();
  const id = `notes-${rec.id}`;
  await db
    .insert(schema.lectureNotes)
    .values({ id, roomSlug: rec.roomSlug, recordingId: rec.id, generator: notes.generator, data: notes })
    .onConflictDoUpdate({ target: schema.lectureNotes.id, set: { generator: notes.generator, data: notes, createdAt: new Date() } });
  console.log(`[notes] ${notes.generator} notes for ${rec.roomSlug} (${lines.length} lines)`);
  return notes;
}
