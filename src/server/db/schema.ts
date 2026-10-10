/**
 * Postgres schema (Drizzle). Runs on PGlite (embedded, file-backed) in development and on
 * Supabase/any Postgres in production via DATABASE_URL. Complex legacy objects are kept as jsonb
 * so the existing typed logic (device policies, requests, engagement summaries) is reused as-is.
 */
import { pgTable, text, integer, boolean, timestamp, jsonb, serial, primaryKey, index, real, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // admin | instructor | sales_rep | auditor | student | parent
  avatarColor: text("avatar_color"),
  studentCode: text("student_code").unique(),
  country: text("country"),
  languageTag: text("language_tag"),
  gradeLevel: integer("grade_level"),
  /** IANA zone, learned from the device snapshot on join (or booking / teacher roster) */
  timezone: text("timezone"),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** External identities (Google sub, email-OTP) linked to a user. */
export const identities = pgTable(
  "identities",
  {
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    userId: text("user_id").notNull().references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.provider, t.subject] })]
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  userAgent: text("user_agent"),
  ip: text("ip"),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
});

/** Parent/guardian ↔ learner links. */
export const guardians = pgTable(
  "guardians",
  {
    parentId: text("parent_id").notNull().references(() => users.id),
    studentId: text("student_id").notNull().references(() => users.id),
    relation: text("relation").notNull().default("parent"),
  },
  (t) => [primaryKey({ columns: [t.parentId, t.studentId] })]
);

/** A scheduled class/session. `kind` drives the on-screen label; booking matcher writes here. */
export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    roomSlug: text("room_slug").notNull().unique(),
    kind: text("kind").notNull(), // admission | demo | counselling | doubt_clearing | enrolled
    subject: text("subject").notNull(),
    course: text("course"),
    topic: text("topic"),
    gradeLevel: integer("grade_level"),
    program: text("program"),
    language: text("language").notNull().default("en"),
    teacherId: text("teacher_id"),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    classSize: integer("class_size").notNull().default(1),
    /** Named batch, e.g. "G10 IGCSE · Batch A · 2026" (analytics falls back to programme + grade) */
    cohort: text("cohort"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("classes_teacher_start").on(t.teacherId, t.scheduledStart)]
);

export const classEnrollments = pgTable(
  "class_enrollments",
  {
    classId: text("class_id").notNull().references(() => classes.id),
    studentKey: text("student_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentKey] })]
);

export const attendanceEvents = pgTable(
  "attendance_events",
  {
    id: serial("id").primaryKey(),
    roomSlug: text("room_slug").notNull(),
    userId: text("user_id").notNull(),
    name: text("name"),
    role: text("role"),
    event: text("event").notNull(), // join | leave
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    /** LiveKit webhook id: deliveries are at-least-once, so duplicates are ignored */
    eventId: text("event_id"),
  },
  (t) => [index("attendance_room_user").on(t.roomSlug, t.userId), uniqueIndex("attendance_event_id").on(t.eventId)]
);

/** Generic key/value store for write-through legacy hubs (device rules/policies/requests). */
export const kvStore = pgTable(
  "kv_store",
  {
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.namespace, t.key] })]
);

/** Append-only audit trails (device access events, security events). */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    stream: text("stream").notNull(), // device_access | security
    at: timestamp("at", { withTimezone: true }).notNull(),
    roomSlug: text("room_slug"),
    userId: text("user_id"),
    type: text("type").notNull(),
    data: jsonb("data").notNull(),
  },
  (t) => [index("audit_stream_at").on(t.stream, t.at)]
);

export const engagementSamples = pgTable(
  "engagement_samples",
  {
    id: serial("id").primaryKey(),
    roomSlug: text("room_slug").notNull(),
    participantId: text("participant_id").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    data: jsonb("data").notNull(),
  },
  (t) => [index("engagement_room_at").on(t.roomSlug, t.at)]
);

/** Consent decisions (analytics, recording). Latest row per (user, kind) wins; history kept. */
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(), // analytics | recording
  granted: boolean("granted").notNull(),
  decidedBy: text("decided_by").notNull(), // self or the guardian's user id
  guardianName: text("guardian_name"),
  country: text("country"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const transcriptLines = pgTable(
  "transcript_lines",
  {
    id: serial("id").primaryKey(),
    roomSlug: text("room_slug").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    speakerId: text("speaker_id"),
    speakerName: text("speaker_name"),
    text: text("text").notNull(),
    translated: text("translated"),
    lang: text("lang"),
  },
  (t) => [index("transcript_room_at").on(t.roomSlug, t.at)]
);

export const recordings = pgTable("recordings", {
  id: text("id").primaryKey(),
  roomSlug: text("room_slug").notNull(),
  mode: text("mode").notNull(), // video | transcript_only
  status: text("status").notNull(), // recording | processing | ready | failed
  egressId: text("egress_id"),
  storage: text("storage"), // local | s3 (where the video file lives)
  filePath: text("file_path"),
  startedBy: text("started_by"),
  /** Identities kept out of the recording (no recording consent) at start; updated live */
  excluded: jsonb("excluded").notNull().default([]),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const lectureNotes = pgTable("lecture_notes", {
  id: text("id").primaryKey(),
  roomSlug: text("room_slug").notNull(),
  recordingId: text("recording_id"),
  generator: text("generator").notNull(), // gemini | extractive
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const polls = pgTable("polls", {
  id: text("id").primaryKey(),
  roomSlug: text("room_slug").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // string[]
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: text("poll_id").notNull().references(() => polls.id),
    userId: text("user_id").notNull(),
    optionIndex: integer("option_index").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] })]
);

/** Teacher remarks/praise about a learner (shown to the learner and their parents). */
export const remarks = pgTable(
  "remarks",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull().references(() => users.id),
    teacherId: text("teacher_id").notNull().references(() => users.id),
    roomSlug: text("room_slug"),
    kind: text("kind").notNull(), // e.g. Star Performer, Deep Question, Keep Focused
    stars: integer("stars").notNull().default(0),
    note: text("note").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("remarks_student_at").on(t.studentId, t.at)]
);

/**
 * One row per finished class session (recording): everything analytics slices on, measured once
 * when the class ends. Quality is computed at query time from `components` and the current weights.
 */
export const sessionFacts = pgTable(
  "session_facts",
  {
    recordingId: text("recording_id").primaryKey(),
    roomSlug: text("room_slug").notNull(),
    classId: text("class_id"),
    kind: text("kind").notNull(), // class kind, or "adhoc"
    subject: text("subject"),
    course: text("course"),
    topic: text("topic"),
    gradeLevel: integer("grade_level"),
    program: text("program"),
    cohort: text("cohort"),
    language: text("language"),
    teacherId: text("teacher_id"),
    /** Who actually ran it (a substitute differs from the class teacher) */
    hostId: text("host_id"),
    teacherName: text("teacher_name"),
    teacherCountry: text("teacher_country"),
    teacherTimezone: text("teacher_timezone"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    durationMin: real("duration_min").notNull(),
    /** Minutes the host and at least one learner were in the room together */
    contactMin: real("contact_min"),
    /** Shorter than 3 minutes (a false start): kept but left out of analytics */
    aborted: boolean("aborted").notNull().default(false),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledDurationMin: integer("scheduled_duration_min"),
    startDelayMin: real("start_delay_min"),
    plannedSize: integer("planned_size"),
    /** False when no LiveKit join/leave data exists for the class (attendance unknown, not zero) */
    attendanceTracked: boolean("attendance_tracked").notNull().default(true),
    enrolled: integer("enrolled").notNull().default(0),
    attended: integer("attended").notNull().default(0),
    /** Enrolled learners who attended, and their minutes present (for pooled presence) */
    enrolledAttended: integer("enrolled_attended").notNull().default(0),
    enrolledMinutes: real("enrolled_minutes").notNull().default(0),
    peakLearners: integer("peak_learners").notNull().default(0),
    lateCount: integer("late_count").notNull().default(0),
    earlyLeaveCount: integer("early_leave_count").notNull().default(0),
    avgMinutesPresent: real("avg_minutes_present"),
    attentionAvg: real("attention_avg"),
    engagedLearners: integer("engaged_learners").notNull().default(0),
    states: jsonb("states").notNull().default({}),
    transcriptLines: integer("transcript_lines").notNull().default(0),
    teacherTalkShare: real("teacher_talk_share"),
    learnerQuestions: integer("learner_questions").notNull().default(0),
    polls: integer("polls").notNull().default(0),
    pollVotes: integer("poll_votes").notNull().default(0),
    mutes: integer("mutes").notNull().default(0),
    removals: integer("removals").notNull().default(0),
    captureAttempts: integer("capture_attempts").notNull().default(0),
    deviceBlocks: integer("device_blocks").notNull().default(0),
    notesGenerated: boolean("notes_generated").notNull().default(false),
    reviewScore: real("review_score"),
    components: jsonb("components").notNull().default({}),
    demo: boolean("demo").notNull().default(false),
    factsVersion: integer("facts_version").notNull().default(1),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("facts_started").on(t.startedAt), index("facts_teacher").on(t.teacherId, t.startedAt), index("facts_room").on(t.roomSlug), index("facts_class").on(t.classId)]
);

/** One row per learner per finished session (attendance, geography, device, attention). */
export const sessionLearners = pgTable(
  "session_learners",
  {
    recordingId: text("recording_id").notNull(),
    learnerId: text("learner_id").notNull(),
    name: text("name"),
    country: text("country"),
    timezone: text("timezone"),
    gradeLevel: integer("grade_level"),
    deviceType: text("device_type"),
    enrolled: boolean("enrolled").notNull().default(false),
    status: text("status").notNull(), // present | late | left_early | absent
    minutesPresent: real("minutes_present").notNull().default(0),
    attention: real("attention"),
    demo: boolean("demo").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.recordingId, t.learnerId] }), index("learners_learner").on(t.learnerId)]
);

/**
 * An auditor's review of a class (live or from the recording), on an anchored 1–4 rubric.
 * Feeds class quality (when present) and "observed quality" per teacher. Submitted reviews are final.
 */
export const classReviews = pgTable(
  "class_reviews",
  {
    id: text("id").primaryKey(),
    recordingId: text("recording_id").notNull(),
    roomSlug: text("room_slug").notNull(),
    teacherId: text("teacher_id"),
    auditorId: text("auditor_id").notNull().references(() => users.id),
    rubric: text("rubric").notNull(), // teaching_v1 | counselling_v1
    /** criterion -> 1..4 */
    scores: jsonb("scores").notNull(),
    total: real("total"), // mean of the scores, 1..4
    note: text("note"),
    status: text("status").notNull().default("draft"), // draft | submitted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [index("reviews_recording").on(t.recordingId), uniqueIndex("reviews_one_per_auditor").on(t.recordingId, t.auditorId)]
);
