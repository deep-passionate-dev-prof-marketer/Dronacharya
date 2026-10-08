/**
 * Teacher ↔ student matching. Pure functions, shared by the server (authoritative booking) and the
 * browser (previews, "why not" explanations).
 *
 * 1. Hard filters: a teacher who fails any of these is never offered (each failure is explained).
 * 2. Scoring of the remaining teachers, with a deterministic tie-break.
 * 3. Cohort fill: before opening a new section, put the student into an open seat of a matching one.
 */
import type { FacultyProfile } from "./facultyRoster";

export interface MatchRequest {
  subject: string;
  gradeLevel: number;
  /** Curriculum (ic/bc/ac/ib) or Learning Floww course (cd/rb/ai/ds/dm) */
  program?: string;
  /** ISO 639-1 language the student wants to be taught in */
  language: string;
  /** If the teacher doesn't speak the language, the live interpreter may cover it */
  allowInterpreter?: boolean;
  /** ISO timestamp (UTC) of the class start */
  startUtc: string;
  durationMin: number;
  /** Seats in the class: 1 for 1:1, up to 24 */
  classSize: number;
  studentCountryIso2?: string;
  studentTimezone?: string;
  previousTeacherId?: string;
}

export interface Booking {
  id: string;
  teacherId: string;
  startUtc: string;
  endUtc: string;
  roomSlug: string;
  subject: string;
  gradeLevel: number;
  program?: string;
  language: string;
  classSize: number;
  studentKeys: string[];
  sessionType?: string;
  createdAt: string;
}

export interface MatchCandidate {
  teacherId: string;
  teacherName: string;
  eligible: boolean;
  score: number;
  breakdown: { subject: number; language: number; timezone: number; quality: number; continuity: number; load: number };
  reasons: string[];
  blockers: string[];
}

const STOPWORDS = new Set(["and", "the", "of", "for", "to", "in", "a", "an", "advanced", "intro", "introduction", "basic", "basics", "&", "grade", "class"]);

const SYNONYMS: Record<string, string> = {
  math: "mathematics",
  maths: "mathematics",
  cs: "computing",
  programming: "coding",
  ml: "artificial",
  ai: "artificial",
  bio: "biology",
  biosciences: "biology",
  chem: "chemistry",
  phy: "physics",
};

/** Subjects that are close enough for a qualified teacher to cover (weaker than a direct match). */
const FAMILIES: string[][] = [
  ["physics", "quantum", "mechanics", "stem", "sciences", "science"],
  ["mathematics", "algebra", "calculus", "linear", "statistics", "datascience"],
  ["coding", "computing", "robotics", "artificial", "software", "datascience"],
  ["biology", "sciences", "science", "environmental"],
  ["chemistry", "sciences", "science"],
];

/** Compound subject names that must not be split ("Computer Science" is not a "science" subject). */
const COMPOUNDS: Array<[RegExp, string]> = [
  [/computer\s+science/g, "computing"],
  [/data\s+science/g, "datascience"],
  [/bio[\s-]?sciences?/g, "biology"],
  [/artificial\s+intelligence/g, "artificial"],
  [/machine\s+learning/g, "artificial"],
];

export function subjectTokens(text: string): string[] {
  let t = (text || "").toLowerCase();
  for (const [re, rep] of COMPOUNDS) t = t.replace(re, rep);
  return t
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((t) => SYNONYMS[t] || t)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** 30 = direct match, 22 = strong overlap, 12 = same subject family, 0 = not qualified. */
export function subjectScore(requested: string, teacherSubjects: string[]): { score: number; via?: string } {
  const want = subjectTokens(requested);
  if (!want.length) return { score: 0 };
  let best = { score: 0, via: undefined as string | undefined };
  for (const subject of teacherSubjects) {
    const have = subjectTokens(subject);
    if (!have.length) continue;
    const overlap = have.filter((t) => want.includes(t)).length;
    let score = 0;
    if (have.join(" ") === want.join(" ")) score = 30;
    else if (overlap === have.length || overlap === want.length) score = 30; // one contains the other
    else if (overlap > 0) score = 22;
    else if (FAMILIES.some((f) => want.some((t) => f.includes(t)) && have.some((t) => f.includes(t)))) score = 12;
    if (score > best.score) best = { score, via: subject };
  }
  return best;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Weekday and minutes-since-midnight of an instant in a given IANA timezone. */
export function localTime(iso: string, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "0";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10) };
}

function utcOffsetMinutes(iso: string, timeZone: string): number {
  const d = new Date(iso);
  const local = new Date(d.toLocaleString("en-US", { timeZone }));
  const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function weekBounds(iso: string): [number, number] {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return [start, start + 7 * 24 * 3600 * 1000];
}

export function evaluateTeacher(t: FacultyProfile, req: MatchRequest, bookings: Booking[]): MatchCandidate {
  const blockers: string[] = [];
  const reasons: string[] = [];
  const start = Date.parse(req.startUtc);
  const end = start + req.durationMin * 60000;

  // ---- hard filters
  if (t.status === "offline" || t.status === "on_leave") blockers.push(`Teacher is ${t.status.replace("_", " ")}`);

  const local = localTime(req.startUtc, t.timezone);
  const localEnd = local.minutes + req.durationMin;
  const inSlot = t.weeklySlots.some((s) => s.day === local.day && toMinutes(s.start) <= local.minutes && localEnd <= toMinutes(s.end));
  if (!inSlot) {
    const hh = String(Math.floor(local.minutes / 60)).padStart(2, "0");
    const mm = String(local.minutes % 60).padStart(2, "0");
    blockers.push(`Not available at ${hh}:${mm} ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][local.day]} (${t.timezone})`);
  }

  const mine = bookings.filter((b) => b.teacherId === t.id);
  const clash = mine.find((b) => overlaps(start, end, Date.parse(b.startUtc), Date.parse(b.endUtc)));
  if (clash) blockers.push(`Already teaching ${clash.subject} at that time`);

  const [wkStart, wkEnd] = weekBounds(req.startUtc);
  const bookedMin = mine
    .filter((b) => Date.parse(b.startUtc) >= wkStart && Date.parse(b.startUtc) < wkEnd)
    .reduce((sum, b) => sum + (Date.parse(b.endUtc) - Date.parse(b.startUtc)) / 60000, 0);
  if (bookedMin + req.durationMin > t.maxWeeklyHours * 60) blockers.push(`Weekly limit reached (${Math.round(bookedMin / 60)}/${t.maxWeeklyHours} h)`);

  if (req.classSize > t.maxClassSize) blockers.push(`Runs classes up to 1:${t.maxClassSize}, this needs 1:${req.classSize}`);
  if (req.gradeLevel < t.grades[0] || req.gradeLevel > t.grades[1]) blockers.push(`Teaches grades ${t.grades[0]}–${t.grades[1]}`);
  if (req.program && !t.programs.includes(req.program.toLowerCase())) blockers.push(`Not certified for ${req.program.toUpperCase()}`);

  const lang = req.language.toLowerCase();
  const primary = t.languageTag.split("-")[0].toLowerCase();
  const speaks = t.languages.includes(lang);
  if (!speaks && !req.allowInterpreter) blockers.push(`Doesn't teach in ${lang.toUpperCase()}`);

  const subj = subjectScore(req.subject, t.subjects);
  if (subj.score === 0) blockers.push(`Not qualified for "${req.subject}"`);

  // ---- scoring (max 100)
  const subject = subj.score;
  if (subj.score >= 22) reasons.push(`Teaches ${subj.via}`);
  else if (subj.score > 0) reasons.push(`Related subject: ${subj.via}`);

  const language = primary === lang ? 20 : speaks ? 15 : req.allowInterpreter ? 5 : 0;
  if (primary === lang) reasons.push(`Native/primary ${lang.toUpperCase()}`);
  else if (speaks) reasons.push(`Fluent in ${lang.toUpperCase()}`);
  else if (req.allowInterpreter) reasons.push("Live interpreter covers language");

  let timezone = 0;
  if (req.studentCountryIso2 && req.studentCountryIso2.toUpperCase() === t.countryIso2) {
    timezone += 6;
    reasons.push(`Same country (${t.country})`);
  }
  if (req.studentTimezone) {
    const diff = Math.abs(utcOffsetMinutes(req.startUtc, t.timezone) - utcOffsetMinutes(req.startUtc, req.studentTimezone));
    timezone += diff <= 120 ? 4 : diff <= 300 ? 2 : 0;
  }

  const quality = Math.round((t.qualityScore / 100) * 20);
  const continuity = req.previousTeacherId && req.previousTeacherId === t.id ? 10 : 0;
  if (continuity) reasons.push("Student's previous teacher");
  const load = Math.round(10 * (1 - Math.min(1, bookedMin / (t.maxWeeklyHours * 60))));

  const eligible = blockers.length === 0;
  return {
    teacherId: t.id,
    teacherName: t.name,
    eligible,
    score: eligible ? subject + language + timezone + quality + continuity + load : 0,
    breakdown: { subject, language, timezone, quality, continuity, load },
    reasons,
    blockers,
  };
}

export function matchTeachers(req: MatchRequest, roster: FacultyProfile[], bookings: Booking[]): { ranked: MatchCandidate[]; excluded: MatchCandidate[] } {
  const all = roster.map((t) => evaluateTeacher(t, req, bookings));
  const recentLoad = (id: string) => bookings.filter((b) => b.teacherId === id && Date.parse(b.createdAt) > Date.now() - 7 * 864e5).length;
  const ranked = all
    .filter((c) => c.eligible)
    // Higher score first; on a tie, spread work to whoever was assigned less recently; then stable by id
    .sort((a, b) => b.score - a.score || recentLoad(a.teacherId) - recentLoad(b.teacherId) || a.teacherId.localeCompare(b.teacherId));
  return { ranked, excluded: all.filter((c) => !c.eligible) };
}

/** An existing section the student can join instead of opening a new class (same slot, same cohort, seats left). */
export function findOpenSection(req: MatchRequest, bookings: Booking[]): Booking | undefined {
  if (req.classSize <= 1) return undefined;
  return bookings.find(
    (b) =>
      b.startUtc === new Date(req.startUtc).toISOString() &&
      b.classSize === req.classSize &&
      b.studentKeys.length < b.classSize &&
      b.gradeLevel === req.gradeLevel &&
      (b.program || "") === (req.program || "") &&
      b.language === req.language.toLowerCase() &&
      subjectScore(req.subject, [b.subject]).score >= 22
  );
}
