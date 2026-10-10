/**
 * Session facts: everything analytics needs about one finished class, measured once from the raw
 * records (recording, class, enrolments, LiveKit attendance webhooks, engagement samples,
 * transcript, polls, audit events, auditor reviews) and stored in session_facts / session_learners.
 *
 * Computed 20 s after a class ends and again 10 min later (late engagement samples, the last
 * transcript lines), when an auditor submits a review, and in background batches for any finished
 * class without facts or with facts from an older definition (FACTS_VERSION).
 */
import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { classByRoom } from "../classesHub";
import { computeAttendance } from "../attendance";
import { findFaculty } from "../../services/matching/facultyRoster";
import { computeComponents, SessionMeasures } from "./quality";

/** Bump when the fact definitions change: older rows are recomputed in the background. */
export const FACTS_VERSION = 1;
/** Present at least this long (or a quarter of a short class) to count as attended */
export const attendedThresholdMin = (sessionMin: number) => Math.min(5, sessionMin * 0.25);
export const ABORTED_UNDER_MIN = 3;

const CAPTURE_TYPES = new Set(["printscreen_key", "snip_shortcut", "screen_capture_api", "print_attempt", "desktop_capture_blocked"]);
const STAFF_ROLES = new Set(["instructor", "admin", "sales_rep", "auditor", "ta"]);

export interface Interval {
  start: number;
  end: number;
}

/** Presence intervals from join/leave events, clipped to the session. */
export function presenceIntervals(events: Array<{ event: string; at: Date | string }>, start: number, end: number): Interval[] {
  const sorted = events.map((e) => ({ event: e.event, t: new Date(e.at).getTime() })).sort((a, b) => a.t - b.t);
  const out: Interval[] = [];
  let open: number | null = null;
  for (const e of sorted) {
    if (e.t > end) break;
    if (e.event === "join") {
      if (open === null) open = Math.max(e.t, start);
    } else if (open !== null) {
      const t = Math.max(e.t, start);
      if (t > open) out.push({ start: open, end: t });
      open = null;
    }
  }
  if (open !== null && end > open) out.push({ start: open, end });
  return out;
}

/** Largest number of people present at the same time. */
export function peakConcurrency(intervalsPerPerson: Interval[][]): number {
  const points: Array<[number, number]> = [];
  for (const list of intervalsPerPerson) for (const i of list) points.push([i.start, 1], [i.end, -1]);
  // At the same instant, leaves before joins (a reconnect isn't two people)
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let peak = 0;
  for (const [, d] of points) {
    cur += d;
    peak = Math.max(peak, cur);
  }
  return peak;
}

/** Minutes when the host and at least one learner were present together. */
export function contactMinutes(host: Interval[], learners: Interval[][]): number {
  // Union of learner presence
  const all = learners.flat().sort((a, b) => a.start - b.start);
  const union: Interval[] = [];
  for (const i of all) {
    const last = union[union.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else union.push({ ...i });
  }
  let ms = 0;
  for (const h of host) for (const u of union) ms += Math.max(0, Math.min(h.end, u.end) - Math.max(h.start, u.start));
  return Math.round((ms / 60000) * 10) / 10;
}

const isQuestion = (text: string) => /\?\s*$/.test(text.trim()) || /^(why|how|what|when|where|who|which|can|could|is|are|does|do|will|should)\b/i.test(text.trim());

/** Delay in minutes between the scheduled and actual start, when the class ran on its scheduled day. */
export function startDelay(scheduledStart: Date | null, startedAt: Date): number | null {
  if (!scheduledStart) return null;
  const d = (startedAt.getTime() - scheduledStart.getTime()) / 60000;
  // A room reused on another day isn't "late" by days; only judge starts within 2 hours of the slot
  return Math.abs(d) <= 120 ? Math.round(d * 10) / 10 : null;
}

export async function computeSessionFacts(recordingId: string) {
  const db: any = await getDb();
  const [rec] = await db.select().from(schema.recordings).where(eq(schema.recordings.id, recordingId));
  if (!rec || !rec.endedAt) return null;
  const start = new Date(rec.startedAt).getTime();
  const end = new Date(rec.endedAt).getTime();
  if (end <= start) return null;
  const windowFrom = new Date(start - 60 * 60_000);
  const windowTo = new Date(end);
  const room = rec.roomSlug as string;
  const cls = await classByRoom(room);

  // ---- teacher (the class's teacher) and host (who actually ran it; differs for substitutes) ----
  const teacherId: string | null = cls?.teacherId || rec.startedBy || null;
  const hostId: string | null = rec.startedBy || teacherId;
  const [teacher] = teacherId ? await db.select().from(schema.users).where(eq(schema.users.id, teacherId)) : [];
  const roster = teacherId ? findFaculty(teacherId) : undefined;

  // ---- learners: enrolled + anyone with the learner role who joined ----
  const keys: string[] = cls?.studentKeys || [];
  const enrolledUsers = keys.length
    ? await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.role, "student"), or(inArray(schema.users.id, keys), inArray(schema.users.studentCode, keys))))
    : [];
  const enrolledIds = new Set<string>(enrolledUsers.map((u: any) => u.id));

  const att = await db
    .select()
    .from(schema.attendanceEvents)
    .where(and(eq(schema.attendanceEvents.roomSlug, room), gte(schema.attendanceEvents.at, windowFrom), lte(schema.attendanceEvents.at, windowTo)))
    .orderBy(asc(schema.attendanceEvents.at));
  const attendeeIds = [...new Set<string>(att.map((a: any) => a.userId))];
  const attendeeUsers = attendeeIds.length ? await db.select().from(schema.users).where(inArray(schema.users.id, attendeeIds)) : [];
  const userById = new Map<string, any>([...enrolledUsers, ...attendeeUsers].map((u: any) => [u.id, u]));
  const learnerIds = new Set<string>(enrolledIds);
  for (const a of att) {
    const u = userById.get(a.userId);
    const role = u?.role || a.role;
    if (role === "student" || (!u && !STAFF_ROLES.has(role))) learnerIds.add(a.userId);
  }

  // ---- engagement samples (consenting learners only; a later withdrawal removes past values too) ----
  const withdrawn = await analyticsWithdrawn([...learnerIds]);
  const samples = await db
    .select()
    .from(schema.engagementSamples)
    .where(and(eq(schema.engagementSamples.roomSlug, room), gte(schema.engagementSamples.at, new Date(start)), lte(schema.engagementSamples.at, new Date(end + 60_000))));
  const attentionBy = new Map<string, number[]>();
  const states: Record<string, number> = {};
  for (const s of samples) {
    const pid = s.participantId as string;
    if (!learnerIds.has(pid) || withdrawn.has(pid)) continue;
    const sum = (s.data as any)?.summary || {};
    const eye = Number(sum.eyeContact);
    const presence = Number.isFinite(Number(sum.presence)) ? Number(sum.presence) : 1;
    const perclos = Number.isFinite(Number(sum.perclos)) ? Number(sum.perclos) : 0;
    // Camera off / nobody in frame tells us nothing about attention: skip those samples
    if (Number.isFinite(eye) && presence >= 0.5) attentionBy.set(pid, [...(attentionBy.get(pid) || []), Math.max(0, Math.min(1, eye * (1 - perclos)))]);
    if (sum.dominant) states[sum.dominant] = (states[sum.dominant] || 0) + 1;
  }
  const stateTotal = Object.values(states).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(states)) states[k] = Math.round((states[k] / stateTotal) * 1000) / 1000;

  // ---- device snapshots from join evaluations (learners only) ----
  const audit = await db
    .select()
    .from(schema.auditEvents)
    .where(
      and(
        inArray(schema.auditEvents.stream, ["room_control", "security", "device_access"]),
        eq(schema.auditEvents.roomSlug, room),
        gte(schema.auditEvents.at, new Date(start - 3 * 3600_000)),
        lte(schema.auditEvents.at, windowTo)
      )
    )
    .orderBy(asc(schema.auditEvents.at));
  const deviceBy = new Map<string, { type?: string; timezone?: string }>();
  let mutes = 0;
  let removals = 0;
  let captureAttempts = 0;
  let deviceBlocks = 0;
  for (const e of audit) {
    const t = new Date(e.at).getTime();
    if (e.stream === "device_access") {
      if (e.type === "join_blocked" && t >= start - 15 * 60_000) deviceBlocks++;
      if (/^join_/.test(e.type) && e.userId) {
        const d = (e.data as any)?.device || {};
        deviceBy.set(e.userId, { type: d.effectiveDeviceType || d.deviceType, timezone: d.timezone });
      }
      continue;
    }
    if (t < start) continue;
    if (e.stream === "room_control") {
      if (e.type === "mute" || e.type === "stop_video") mutes++;
      else if (e.type === "remove") removals++;
    } else if (e.stream === "security" && CAPTURE_TYPES.has(e.type)) captureAttempts++;
  }

  // ---- per-learner attendance ----
  const learners = [...learnerIds].map((id) => {
    const u = userById.get(id);
    const events = att.filter((a: any) => a.userId === id);
    const result = computeAttendance(
      events.map((a: any) => ({ event: a.event, at: a.at })),
      new Date(start),
      new Date(end)
    );
    const intervals = presenceIntervals(events, start, end);
    // A few seconds in the room isn't attending
    const status = result.status !== "absent" && result.minutesPresent < attendedThresholdMin((end - start) / 60000) ? "absent" : result.status;
    const att2 = attentionBy.get(id);
    const dev = deviceBy.get(id);
    return {
      id,
      name: u?.name || events[0]?.name || null,
      country: u?.country || null,
      timezone: u?.timezone || dev?.timezone || null,
      gradeLevel: u?.gradeLevel ?? cls?.gradeLevel ?? null,
      deviceType: dev?.type || null,
      enrolled: enrolledIds.has(id),
      status,
      minutesPresent: result.minutesPresent,
      intervals,
      attention: att2?.length ? att2.reduce((a, b) => a + b, 0) / att2.length : null,
    };
  });
  const present = learners.filter((l) => l.status !== "absent");
  const attentionVals = present.map((l) => l.attention).filter((a): a is number => a !== null);

  // ---- transcript: talk share and learner questions ----
  const lines = await db
    .select()
    .from(schema.transcriptLines)
    .where(and(eq(schema.transcriptLines.roomSlug, room), gte(schema.transcriptLines.at, new Date(start)), lte(schema.transcriptLines.at, new Date(end + 30_000))));
  let teacherChars = 0;
  let totalChars = 0;
  let learnerQuestions = 0;
  for (const l of lines) {
    const n = String(l.text || "").length;
    totalChars += n;
    if (teacherId && l.speakerId === teacherId) teacherChars += n;
    else if (learnerIds.has(l.speakerId) && isQuestion(l.text)) learnerQuestions++;
  }

  // ---- polls ----
  const polls = await db
    .select()
    .from(schema.polls)
    .where(and(eq(schema.polls.roomSlug, room), gte(schema.polls.createdAt, new Date(start)), lte(schema.polls.createdAt, new Date(end))));
  const pollIds = polls.map((p: any) => p.id);
  const votes = pollIds.length ? await db.select({ n: sql<number>`count(*)` }).from(schema.pollVotes).where(inArray(schema.pollVotes.pollId, pollIds)) : [{ n: 0 }];

  // ---- reviews, notes ----
  const reviews = await db
    .select()
    .from(schema.classReviews)
    .where(and(eq(schema.classReviews.recordingId, recordingId), eq(schema.classReviews.status, "submitted")));
  const reviewMeans = reviews
    .map((r: any) => Object.values(r.scores || {}).map(Number).filter((x) => x >= 1 && x <= 4))
    .filter((xs: number[]) => xs.length)
    .map((xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length);
  const reviewScore = reviewMeans.length ? reviewMeans.reduce((a: number, b: number) => a + b, 0) / reviewMeans.length : null;
  const [notes] = await db.select({ id: schema.lectureNotes.id }).from(schema.lectureNotes).where(eq(schema.lectureNotes.recordingId, recordingId));

  const scheduledStart = cls?.scheduledStart ? new Date(cls.scheduledStart) : null;
  // No join/leave data at all (webhooks not configured / failed): attendance is unknown, not zero
  const attendanceTracked = att.length > 0;
  const hostIntervals = hostId ? presenceIntervals(att.filter((a: any) => a.userId === hostId), start, end) : [];
  const enrolledPresent = present.filter((l) => l.enrolled);
  const measures: SessionMeasures = {
    enrolled: enrolledIds.size,
    attended: present.length,
    plannedSize: cls?.classSize ?? null,
    startDelayMin: startDelay(scheduledStart, new Date(start)),
    lateCount: present.filter((l) => l.status === "late").length,
    attentionAvg: attentionVals.length ? attentionVals.reduce((a, b) => a + b, 0) / attentionVals.length : null,
    engagedLearners: attentionVals.length,
    learnerQuestions,
    polls: polls.length,
    pollVotes: Number(votes[0]?.n || 0),
    durationMin: Math.round(((end - start) / 60000) * 10) / 10,
    scheduledDurationMin: cls?.durationMin ?? null,
    mutes,
    removals,
    captureAttempts,
    reviewScore,
    attendanceTracked,
  };
  const demo = recordingId.startsWith("demo-") || room.startsWith("demo-");
  const fact = {
    recordingId,
    roomSlug: room,
    classId: cls?.id || null,
    kind: cls?.kind || "adhoc",
    subject: cls?.subject || null,
    course: cls?.course || null,
    topic: cls?.topic || null,
    gradeLevel: cls?.gradeLevel ?? null,
    program: cls?.program || null,
    cohort: cls?.cohort || null,
    language: cls?.language || null,
    teacherId,
    hostId,
    teacherName: teacher?.name || cls?.teacherName || null,
    teacherCountry: teacher?.country || roster?.countryIso3 || null,
    teacherTimezone: teacher?.timezone || roster?.timezone || null,
    startedAt: new Date(start),
    endedAt: new Date(end),
    durationMin: measures.durationMin,
    contactMin: hostIntervals.length ? contactMinutes(hostIntervals, present.map((l) => l.intervals)) : null,
    aborted: measures.durationMin < ABORTED_UNDER_MIN,
    scheduledStart,
    scheduledDurationMin: measures.scheduledDurationMin,
    startDelayMin: measures.startDelayMin,
    plannedSize: measures.plannedSize,
    attendanceTracked,
    enrolled: measures.enrolled,
    attended: measures.attended,
    enrolledAttended: enrolledPresent.length,
    enrolledMinutes: Math.round(enrolledPresent.reduce((a, l) => a + l.minutesPresent, 0) * 10) / 10,
    peakLearners: peakConcurrency(present.map((l) => l.intervals)),
    lateCount: measures.lateCount,
    earlyLeaveCount: present.filter((l) => l.status === "left_early").length,
    avgMinutesPresent: present.length ? Math.round((present.reduce((a, l) => a + l.minutesPresent, 0) / present.length) * 10) / 10 : null,
    attentionAvg: measures.attentionAvg,
    engagedLearners: measures.engagedLearners,
    states,
    transcriptLines: lines.length,
    teacherTalkShare: totalChars ? Math.round((teacherChars / totalChars) * 1000) / 1000 : null,
    learnerQuestions,
    polls: measures.polls,
    pollVotes: measures.pollVotes,
    mutes,
    removals,
    captureAttempts,
    deviceBlocks,
    notesGenerated: Boolean(notes),
    reviewScore,
    components: computeComponents(measures),
    demo,
    factsVersion: FACTS_VERSION,
    computedAt: new Date(),
  };

  // Facts and learner rows change together
  await db.transaction(async (tx: any) => {
    await tx.insert(schema.sessionFacts).values(fact).onConflictDoUpdate({ target: schema.sessionFacts.recordingId, set: { ...fact } });
    await tx.delete(schema.sessionLearners).where(eq(schema.sessionLearners.recordingId, recordingId));
    if (!learners.length) return;
    await tx.insert(schema.sessionLearners).values(
      learners.map((l) => ({
        recordingId,
        learnerId: l.id,
        name: l.name,
        country: l.country,
        timezone: l.timezone,
        gradeLevel: l.gradeLevel,
        deviceType: l.deviceType,
        enrolled: l.enrolled,
        status: l.status,
        minutesPresent: l.minutesPresent,
        attention: l.attention,
        demo,
      }))
    );
  });
  for (const fn of listeners) fn();
  return fact;
}

/** Learners whose latest analytics consent decision is "no". */
async function analyticsWithdrawn(ids: string[]) {
  if (!ids.length) return new Set<string>();
  const db: any = await getDb();
  const rows = await db
    .select()
    .from(schema.consents)
    .where(and(eq(schema.consents.kind, "analytics"), inArray(schema.consents.userId, ids)))
    .orderBy(asc(schema.consents.at));
  const latest = new Map<string, boolean>();
  for (const r of rows) latest.set(r.userId, r.granted);
  return new Set([...latest].filter(([, granted]) => !granted).map(([id]) => id));
}

/**
 * Withdrawing analytics consent clears the learner's attention from past classes at once, then
 * recomputes those classes' averages in the background.
 */
export async function forgetLearnerAttention(learnerId: string) {
  const db: any = await getDb();
  const rows = await db.update(schema.sessionLearners).set({ attention: null }).where(eq(schema.sessionLearners.learnerId, learnerId)).returning({ id: schema.sessionLearners.recordingId });
  for (const fn of listeners) fn();
  (async () => {
    for (const { id } of rows) await computeSessionFacts(id).catch(() => {});
  })();
  return rows.length;
}

/** Called whenever facts are written (the analytics API clears its cache). */
const listeners = new Set<() => void>();
export const onFactsWritten = (fn: () => void) => listeners.add(fn);

/** Recordings that can't produce facts (no end, zero length, failed) are not retried every batch. */
const skipped = new Set<string>();

/**
 * Finished classes with no facts, or facts from an older definition (FACTS_VERSION), in batches so
 * it never blocks requests. Runs on the session reconcile interval.
 */
export async function backfillFacts(limit = 25) {
  const db: any = await getDb();
  const rows = await db.execute(
    sql`select r.id from recordings r left join session_facts f on f.recording_id = r.id where r.ended_at is not null and (f.recording_id is null or f.facts_version < ${FACTS_VERSION}) order by r.started_at limit ${limit + skipped.size}`
  );
  const ids: string[] = (rows?.rows || []).map((r: any) => r.id).filter((id: string) => !skipped.has(id));
  let done = 0;
  for (const id of ids) {
    const fact = await computeSessionFacts(id).catch((e) => {
      console.warn("[analytics] facts failed", id, e?.message || e);
      return null;
    });
    if (fact) done++;
    else skipped.add(id);
  }
  if (done) console.log(`[analytics] computed facts for ${done} finished class(es)`);
  return done;
}

/** Compute now and again a little later (late engagement samples, the transcript's last lines). */
export function scheduleFacts(recordingId: string) {
  setTimeout(() => computeSessionFacts(recordingId).catch((e) => console.warn("[analytics] facts failed", e?.message || e)), 20_000).unref?.();
  setTimeout(() => computeSessionFacts(recordingId).catch(() => {}), 10 * 60_000).unref?.();
}
