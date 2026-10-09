/**
 * Postgres schema (Drizzle). Runs on PGlite (embedded, file-backed) in development and on
 * Supabase/any Postgres in production via DATABASE_URL. Complex legacy objects are kept as jsonb
 * so the existing typed logic (device policies, requests, engagement summaries) is reused as-is.
 */
import { pgTable, text, integer, boolean, timestamp, jsonb, serial, primaryKey, index } from "drizzle-orm/pg-core";

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
  },
  (t) => [index("attendance_room_user").on(t.roomSlug, t.userId)]
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
  filePath: text("file_path"),
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
