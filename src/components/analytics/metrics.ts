/**
 * What every analytics number means, how it's shown, and which way is better. The UI shows these
 * definitions next to the numbers ("How we measure"), so nobody has to guess.
 */
import type { Format } from "../charts/scale";

export interface MetricDef {
  label: string;
  format: Format;
  /** Which direction is good (null: neither, e.g. duration) */
  better: "up" | "down" | null;
  definition: string;
  /** Targets key this metric is judged against */
  target?: "quality" | "occupancy" | "attendance" | "onTime";
  /** Fixed scale maximum for bars */
  max?: number;
}

export const METRICS: Record<string, MetricDef> = {
  sessions: { label: "Sessions held", format: "int", better: null, definition: "Classes and counselling sessions that started and ended (sessions under 3 minutes are left out as false starts)." },
  classes: { label: "Classes", format: "int", better: null, definition: "Teaching sessions: classes, demo classes, doubt clearing and ad-hoc sessions." },
  hours: { label: "Hours", format: "hours", better: null, definition: "Total time sessions ran." },
  avgQuality: { label: "Class quality", format: "score", better: "up", target: "quality", max: 100, definition: "Average class quality (0–100). Each class is scored from attendance, on-time start, engagement, interaction, running to schedule and auditor reviews, weighted as set by admins. Classes nobody joined, or with fewer than 3 measurable signals, are not scored." },
  avgTeacherQuality: { label: "Teacher quality", format: "score", better: "up", target: "quality", max: 100, definition: "Average of teachers' quality: each teacher's hours-weighted class quality, pulled toward the school average when they have few classes. Counselling is not included." },
  teacherQuality: { label: "Teacher quality", format: "score", better: "up", target: "quality", max: 100, definition: "Hours-weighted class quality, pulled toward the school average when a teacher has few classes (ranked from 5 classes). The range shows how sure we are." },
  avgOccupancy: { label: "Occupancy", format: "pct", better: "up", target: "occupancy", max: 1, definition: "Learners who attended ÷ seats planned, pooled across classes (a 24-seat class counts 24 times more than a 1:1)." },
  attendanceRate: { label: "Attendance", format: "pct", better: "up", target: "attendance", max: 1, definition: "Enrolled learners who attended (at least 5 minutes, or a quarter of a short class) ÷ enrolled learners." },
  presenceRate: { label: "Time present", format: "pct", better: "up", max: 1, definition: "Minutes enrolled learners spent in class ÷ minutes they could have." },
  avgDurationMin: { label: "Class duration", format: "min", better: null, definition: "Average length of teaching sessions, from start to end." },
  medianDurationMin: { label: "Median duration", format: "min", better: null, definition: "Half of teaching sessions ran shorter than this, half longer." },
  avgCounsellingMin: { label: "Counselling length", format: "min", better: null, definition: "Average time the counsellor and the family were actually talking in counselling and admission sessions (the sales conversation)." },
  medianCounsellingMin: { label: "Median counselling length", format: "min", better: null, definition: "Half of counselling sessions were shorter than this." },
  counsellingNoShowRate: { label: "Counselling no-shows", format: "pct", better: "down", max: 1, definition: "Counselling and admission sessions the family didn't join." },
  classNoShowRate: { label: "Classes nobody joined", format: "pct", better: "down", max: 1, definition: "Teaching sessions with join data where no learner came." },
  avgStartDelayMin: { label: "Start delay", format: "min", better: "down", definition: "Minutes between the scheduled time and when the host started the class (scheduled classes only)." },
  onTimeRate: { label: "On-time starts", format: "pct", better: "up", target: "onTime", max: 1, definition: "Scheduled classes that started within the target delay." },
  avgClassSize: { label: "Class size", format: "num1", better: null, definition: "Average number of learners in class at the busiest moment." },
  learnersReached: { label: "Learners reached", format: "int", better: "up", definition: "Different learners who attended at least one session." },
  learnerAttendances: { label: "Learner attendances", format: "int", better: "up", definition: "Learner seats filled across all sessions." },
  avgAttention: { label: "Engagement", format: "pct", better: "up", max: 1, definition: "Estimated attention of learners who agreed to engagement analytics (eye contact and alertness, measured on their device). An estimate, not a judgement of a learner." },
  engagementCoverage: { label: "Engagement measured", format: "pct", better: null, max: 1, definition: "Sessions where at least one learner shared engagement signals." },
  questionsPerClass: { label: "Learner questions", format: "num1", better: "up", definition: "Questions learners asked per session (from the live transcript)." },
  pollsPerClass: { label: "Polls", format: "num1", better: null, definition: "Polls run per session." },
  captureAttemptsPer100: { label: "Capture attempts", format: "num1", better: "down", definition: "Screenshot, screen-recording and print attempts detected, per 100 sessions." },
  removalsPer100: { label: "Removals", format: "num1", better: "down", definition: "Learners removed by the host, per 100 sessions." },
  notesCoverage: { label: "Classes with notes", format: "pct", better: "up", max: 1, definition: "Sessions that have AI class notes." },
  scoredShare: { label: "Classes scored", format: "pct", better: null, max: 1, definition: "Sessions with enough signals to score." },
  belowTargetShare: { label: "Below quality target", format: "pct", better: "down", max: 1, definition: "Scored classes below the quality target." },
  reviewed: { label: "Auditor reviews", format: "int", better: null, definition: "Sessions with a submitted auditor review." },
  attendanceUnknown: { label: "No join data", format: "int", better: "down", definition: "Sessions where no join or leave events arrived (attendance unknown, not zero)." },
  // Learner-level
  learners: { label: "Learners", format: "int", better: null, definition: "Different learners in the group." },
  seats: { label: "Learner seats", format: "int", better: null, definition: "Learner × session pairs." },
  punctualRate: { label: "Joined on time", format: "pct", better: "up", max: 1, definition: "Learners who came and joined within 5 minutes of the start." },
  lateRate: { label: "Joined late", format: "pct", better: "down", max: 1, definition: "Learners who came but joined more than 5 minutes after the start." },
  leftEarlyRate: { label: "Left early", format: "pct", better: "down", max: 1, definition: "Learners who left well before the end." },
  avgMinutesPresent: { label: "Minutes in class", format: "min", better: "up", definition: "Average minutes a learner who came spent in class." },
};

export const metric = (key: string): MetricDef => METRICS[key] || { label: key, format: "num1", better: null, definition: "" };

/** Metrics offered for each level of breakdown, most useful first. */
export const SESSION_METRIC_KEYS = [
  "avgQuality",
  "avgOccupancy",
  "attendanceRate",
  "avgDurationMin",
  "avgCounsellingMin",
  "onTimeRate",
  "avgStartDelayMin",
  "avgAttention",
  "questionsPerClass",
  "avgClassSize",
  "classNoShowRate",
  "sessions",
  "hours",
  "learnersReached",
  "captureAttemptsPer100",
];
export const LEARNER_METRIC_KEYS = ["attendanceRate", "punctualRate", "lateRate", "leftEarlyRate", "avgMinutesPresent", "avgAttention", "avgQuality", "learners"];

export const DIMENSIONS: Array<{ id: string; label: string; level: "session" | "learner"; filter?: string }> = [
  { id: "teacher", label: "Teacher", level: "session", filter: "teacher" },
  { id: "room", label: "Room", level: "session", filter: "room" },
  { id: "slot", label: "Time slot (30 min)", level: "session" },
  { id: "weekday", label: "Weekday", level: "session" },
  { id: "week", label: "Week", level: "session" },
  { id: "course", label: "Course", level: "session", filter: "course" },
  { id: "subject", label: "Subject", level: "session", filter: "subject" },
  { id: "cohort", label: "Cohort", level: "session", filter: "cohort" },
  { id: "grade", label: "Grade", level: "session", filter: "grade" },
  { id: "class_size", label: "Class size (1:1 … 1:24)", level: "session", filter: "size" },
  { id: "kind", label: "Session type", level: "session", filter: "kind" },
  { id: "program", label: "Programme", level: "session", filter: "program" },
  { id: "language", label: "Teaching language", level: "session", filter: "language" },
  { id: "teacher_timezone", label: "Teacher timezone", level: "session" },
  { id: "teacher_country", label: "Teacher country", level: "session" },
  { id: "country", label: "Learner country", level: "learner", filter: "country" },
  { id: "learner_timezone", label: "Learner timezone", level: "learner", filter: "timezone" },
  { id: "learner_grade", label: "Learner grade", level: "learner" },
  { id: "device", label: "Learner device", level: "learner", filter: "device" },
];
export const dimension = (id: string) => DIMENSIONS.find((d) => d.id === id) || DIMENSIONS[0];

export const FILTERS: Array<{ id: string; label: string }> = [
  { id: "teacher", label: "Teacher" },
  { id: "kind", label: "Session type" },
  { id: "course", label: "Course" },
  { id: "subject", label: "Subject" },
  { id: "cohort", label: "Cohort" },
  { id: "grade", label: "Grade" },
  { id: "size", label: "Class size" },
  { id: "room", label: "Room" },
  { id: "program", label: "Programme" },
  { id: "language", label: "Language" },
  { id: "country", label: "Learner country" },
  { id: "timezone", label: "Learner timezone" },
  { id: "device", label: "Learner device" },
];

/** Fixed colour per session type (categorical order never changes with filters). */
export const KIND_COLOR: Record<string, string> = {
  enrolled: "var(--color-series-1)",
  demo: "var(--color-series-2)",
  counselling: "var(--color-series-3)",
  admission: "var(--color-series-4)",
  doubt_clearing: "var(--color-series-5)",
  adhoc: "var(--color-series-7)",
};
