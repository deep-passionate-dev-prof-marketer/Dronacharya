/**
 * Class recordings.
 *  - Video: LiveKit Egress composites the room into an MP4 using our own layout page
 *    (/recording-layout.html), which leaves out learners without recording consent.
 *    Needs the Egress service (LIVEKIT_EGRESS=1; docker image livekit/egress or LiveKit Cloud).
 *  - Transcript-only: when Egress isn't available the class is still "recorded" as its transcript,
 *    and the UI says plainly that video wasn't recorded.
 * When a recording stops, lecture notes are generated from the stored transcript.
 */
import crypto from "crypto";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { EgressClient, EgressStatus } from "livekit-server-sdk";
import type { EgressInfo } from "livekit-server-sdk";
import { getDb, schema } from "../db";
import { livekitConfig } from "../livekitHub";
import { classByRoom } from "../classesHub";
import { recordingStorage } from "./storage";
import { buildNotes, TranscriptEntry } from "./notes";

let egress: EgressClient | null = null;
function egressClient(): EgressClient | null {
  const cfg = livekitConfig();
  if (!cfg || process.env.LIVEKIT_EGRESS !== "1") return null;
  if (!egress) egress = new EgressClient(cfg.url.replace(/^ws/, "http"), cfg.apiKey, cfg.apiSecret);
  return egress;
}

export function egressEnabled() {
  return Boolean(egressClient());
}

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

function layoutUrl(): string {
  if (process.env.RECORDING_LAYOUT_URL) return process.env.RECORDING_LAYOUT_URL;
  const base = (process.env.PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  return `${base}/recording-layout.html`;
}

/** Starts recording a class (video when Egress is available, otherwise transcript-only). */
export async function startRecording(roomSlug: string, startedBy: string): Promise<RecordingRow> {
  const db: any = await getDb();
  const id = `rec-${crypto.randomUUID()}`;
  let mode: RecordingRow["mode"] = "transcript_only";
  let egressId: string | null = null;
  let storage: string | null = null;
  let filePath: string | null = null;
  let error: string | null = null;

  const client = egressClient();
  if (client) {
    try {
      const store = recordingStorage();
      const fileName = `${roomSlug}-${new Date().toISOString().replace(/[:.]/g, "-")}.mp4`;
      const info = await client.startRoomCompositeEgress(roomSlug, { file: store.egressOutput(fileName) }, { customBaseUrl: layoutUrl() });
      mode = "video";
      egressId = info.egressId;
      storage = store.kind;
      filePath = store.storedPath(fileName);
    } catch (err: any) {
      error = `Video recording unavailable: ${String(err?.message || err).slice(0, 200)}`;
      console.warn("[recording] egress start failed, recording transcript only:", err?.message || err);
    }
  } else {
    error = "Video recording isn't set up on this server (LiveKit Egress); the transcript is recorded.";
  }

  await db.insert(schema.recordings).values({ id, roomSlug, mode, status: "recording", egressId, storage, filePath, error, startedBy, excluded: [] });
  return (await getRecording(id))!;
}

/** Stops a recording; notes are generated once the transcript is final. */
export async function stopRecording(id: string, endedAt: Date = new Date()): Promise<RecordingRow | null> {
  const rec = await getRecording(id);
  if (!rec || rec.status !== "recording") return rec;
  const db: any = await getDb();
  let status: RecordingRow["status"] = "ready";
  if (rec.mode === "video" && rec.egressId) {
    status = "processing"; // becomes ready on the egress_ended webhook
    const client = egressClient();
    if (client) await client.stopEgress(rec.egressId).catch((e) => console.warn("[recording] stopEgress:", e?.message || e));
  }
  await db.update(schema.recordings).set({ status, endedAt }).where(eq(schema.recordings.id, id));
  // Give the last caption lines a moment to arrive, then write notes
  setTimeout(() => generateNotes(id).catch((e) => console.error("[notes] generation failed:", e)), Number(process.env.NOTES_DELAY_MS || 8000));
  return getRecording(id);
}

/** Egress finished (webhook): mark the file ready or failed. */
export async function onEgressEnded(info: EgressInfo) {
  const db: any = await getDb();
  const [row] = await db.select().from(schema.recordings).where(eq(schema.recordings.egressId, info.egressId));
  if (!row) return;
  const file = info.fileResults?.[0];
  if (info.status === EgressStatus.EGRESS_COMPLETE && file) {
    const stored = row.storage === "local" ? (file.filename || "").split("/").pop() || row.filePath : row.filePath;
    await db.update(schema.recordings).set({ status: "ready", filePath: stored, endedAt: row.endedAt || new Date() }).where(eq(schema.recordings.id, row.id));
  } else if (info.status === EgressStatus.EGRESS_FAILED || info.status === EgressStatus.EGRESS_ABORTED || info.status === EgressStatus.EGRESS_LIMIT_REACHED) {
    await db
      .update(schema.recordings)
      .set({ status: "failed", error: `Video recording failed: ${info.error || EgressStatus[info.status]}`.slice(0, 300), endedAt: row.endedAt || new Date() })
      .where(eq(schema.recordings.id, row.id));
  }
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
