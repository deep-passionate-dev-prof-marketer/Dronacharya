/**
 * Demo history for class analytics (development only).
 *
 *   npm run demo:analytics               create (or re-create) ~90 days of demo classes
 *   npm run demo:analytics -- --remove   delete every demo row
 *
 * It writes the same raw records a real class leaves behind (class, enrolments, recording,
 * LiveKit join/leave events, engagement samples, transcript lines, polls, device and moderation
 * audit events, auditor reviews), then runs the real facts pipeline over them, so the analytics
 * code under test is the production code.
 *
 * Everything it creates has an id or room starting with "demo-". Demo rows only ever appear in
 * class analytics (with an "Includes demo data" banner and a toggle), never in teachers' class
 * lists, recordings, notes, the parent portal, security logs or device-access views. Demo learner
 * accounts are disabled, so nobody can sign in as them.
 *
 * Refuses to run when NODE_ENV=production or DATABASE_URL points at a remote database, unless
 * --force is given. With the embedded database (PGlite), stop the dev server first: only one
 * process can open it.
 */
import "dotenv/config";
import { like, or, sql } from "drizzle-orm";
import { FACULTY_ROSTER } from "../src/services/matching/facultyRoster";

const args = new Set(process.argv.slice(2));
const REMOVE = args.has("--remove");
const FORCE = args.has("--force");
const DAYS = 90;

// ---------------------------------------------------------------- safety
function remoteDatabase(url: string) {
  try {
    return !["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(new URL(url).hostname);
  } catch {
    return true;
  }
}
async function guard() {
  if (process.env.NODE_ENV === "production" && !FORCE) throw new Error("Refusing to write demo data with NODE_ENV=production (use --force if you really mean it).");
  const url = process.env.DATABASE_URL;
  if (url && remoteDatabase(url) && !FORCE) throw new Error("DATABASE_URL points at a remote database. Demo data is for local development (use --force to override).");
  if (!url) {
    const port = process.env.PORT || "3000";
    const running = await fetch(`http://127.0.0.1:${port}/api/system/health`, { signal: AbortSignal.timeout(800) })
      .then((r) => r.ok)
      .catch(() => false);
    if (running) throw new Error(`The dev server is running on port ${port}. Stop it first: the embedded database can only be opened by one process at a time.`);
  }
}

// ---------------------------------------------------------------- deterministic randomness
let state = 21;
const rnd = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const chance = (p: number) => rnd() < p;
const between = (a: number, b: number) => a + rnd() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const normal = (mu: number, sd: number) => mu + sd * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const poisson = (lambda: number) => {
  let k = 0;
  let p = Math.exp(-lambda);
  let s = p;
  const u = rnd();
  while (u > s && k < 50) {
    k++;
    p *= lambda / k;
    s += p;
  }
  return k;
};
function weighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[items.length - 1][0];
}

// ---------------------------------------------------------------- time zones
function offsetMin(tz: string, at: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(at))
      .map((x) => [x.type, x.value])
  );
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at) / 60000;
}
/** The instant a wall-clock time happens in a timezone. `day` is days since the epoch (UTC calendar). */
function zoned(day: number, hour: number, minute: number, tz: string) {
  const guess = day * 864e5 + (hour * 60 + minute) * 60000;
  let t = guess - offsetMin(tz, guess) * 60000;
  t = guess - offsetMin(tz, t) * 60000;
  return t;
}
const localHour = (at: number, tz: string) => (((at / 60000 + offsetMin(tz, at)) / 60) % 24 + 24) % 24;
const weekday = (day: number) => new Date(day * 864e5).getUTCDay(); // 0 = Sunday

// ---------------------------------------------------------------- people
const TEACHER_TRAITS: Record<string, { skill: number; punctual: number; interaction: number; slipping?: boolean; subjects: string[]; programs: string[] }> = {
  "tch-vance": { skill: 0.9, punctual: 0.94, interaction: 1.25, subjects: ["Physics", "Applied STEM"], programs: ["ic", "ib"] },
  "tch-sharma": { skill: 0.86, punctual: 0.9, interaction: 1.05, subjects: ["Coding", "Robotics", "Computer Science"], programs: ["cd", "rb", "ai"] },
  "tch-iyer": { skill: 0.76, punctual: 0.86, interaction: 0.9, subjects: ["Mathematics", "Data Science"], programs: ["ib", "ac", "ds"] },
  "tch-ray": { skill: 0.78, punctual: 0.85, interaction: 0.85, slipping: true, subjects: ["Robotics", "Coding", "Applied STEM"], programs: ["rb", "cd", "bc"] },
  "tch-dubois": { skill: 0.7, punctual: 0.55, interaction: 0.7, subjects: ["Physics", "Chemistry"], programs: ["bc", "ib"] },
  "tch-schmidt": { skill: 0.82, punctual: 0.92, interaction: 1.0, subjects: ["Higher Mathematics", "Computer Science"], programs: ["ib", "ac"] },
};
const COUNSELLORS: Array<{ id: string; name: string; country: string; tz: string; contact: number; create: boolean }> = [
  { id: "sales-1", name: "Rajesh Khanna", country: "ARE", tz: "Asia/Dubai", contact: 31, create: false },
  { id: "demo-cns-priya", name: "Priya Nair", country: "IND", tz: "Asia/Kolkata", contact: 38, create: true },
  { id: "demo-cns-tom", name: "Tom Fletcher", country: "GBR", tz: "Europe/London", contact: 21, create: true },
];
const AUDITOR = "audit-1";

const COUNTRIES: Array<[{ iso3: string; tz: string }, number]> = [
  [{ iso3: "IND", tz: "Asia/Kolkata" }, 34],
  [{ iso3: "ARE", tz: "Asia/Dubai" }, 16],
  [{ iso3: "SGP", tz: "Asia/Singapore" }, 10],
  [{ iso3: "GBR", tz: "Europe/London" }, 10],
  [{ iso3: "USA", tz: "America/New_York" }, 10],
  [{ iso3: "KEN", tz: "Africa/Nairobi" }, 8],
  [{ iso3: "AUS", tz: "Australia/Sydney" }, 6],
  [{ iso3: "SAU", tz: "Asia/Riyadh" }, 6],
];
const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vihaan", "Ishaan", "Saanvi", "Arjun", "Layla", "Omar", "Noor", "Yusuf", "Mariam", "Zayd", "Wei", "Mei", "Jun", "Lin", "Olivia", "Jack", "Amelia", "Harry", "Isla", "Noah", "Emma", "Liam", "Ava", "Mason", "Amani", "Baraka", "Wanjiru", "Kofi", "Chloe", "Lucas", "Sofia", "Hamza", "Fatima", "Ali"];
const LAST = ["Mehta", "Iyer", "Kapoor", "Reddy", "Nair", "Gupta", "Hassan", "Al Farsi", "Rahman", "Tan", "Lim", "Wong", "Smith", "Taylor", "Brown", "Jones", "Clarke", "Johnson", "Miller", "Davis", "Odhiambo", "Mwangi", "Kamau", "Wilson", "Martin", "Haddad", "Qureshi", "Bose", "Joshi", "Shah"];
const DEVICES: Array<[string, number]> = [
  ["laptop", 50],
  ["desktop", 15],
  ["tablet", 20],
  ["mobile", 15],
];

interface Learner {
  id: string;
  name: string;
  iso3: string;
  tz: string;
  grade: number;
  device: string;
  propensity: number;
  focus: number;
  consent: boolean;
}
let learnerSeq = 0;
function makeLearner(grade: number, region?: string[]): Learner {
  let c = weighted(COUNTRIES);
  if (region) for (let i = 0; i < 6 && !region.includes(c.iso3); i++) c = weighted(COUNTRIES);
  const n = ++learnerSeq;
  return {
    id: `demo-stu-${String(n).padStart(3, "0")}`,
    name: `${FIRST[(n * 7) % FIRST.length]} ${LAST[(n * 11) % LAST.length]}`,
    iso3: c.iso3,
    tz: c.tz,
    grade,
    device: weighted(DEVICES),
    propensity: clamp(normal(0.88, 0.08), 0.5, 0.99),
    focus: normal(0, 0.06),
    consent: chance(0.7),
  };
}

// ---------------------------------------------------------------- what gets generated
interface PlannedSession {
  kind: string;
  teacherId: string;
  hostId?: string;
  subject: string;
  course: string | null;
  topic: string;
  program: string | null;
  grade: number | null;
  language: string;
  cohort: string | null;
  plannedSize: number;
  durationMin: number;
  /** Scheduled start (ms); undefined for drop-in rooms */
  at: number;
  learners: Learner[];
  room?: string; // standing (drop-in) room
  noShowBoost?: number;
}

const TOPICS: Record<string, string[]> = {
  Physics: ["Waves and sound", "Newton's laws", "Electric circuits", "Momentum", "Thermal physics", "Light and optics", "Magnetism"],
  "Applied STEM": ["Design thinking", "Bridges and loads", "Renewable energy"],
  Coding: ["Loops and conditions", "Functions", "Lists and dictionaries", "Debugging", "Building a game"],
  Robotics: ["Sensors", "Motors and gears", "Line follower", "Autonomous navigation"],
  "Computer Science": ["Algorithms", "Binary and data", "Networks"],
  Mathematics: ["Quadratics", "Trigonometry", "Calculus: limits", "Probability", "Vectors", "Sequences and series"],
  "Data Science": ["Data cleaning", "Charts that work", "Regression basics"],
  Chemistry: ["Bonding", "Rates of reaction", "Acids and bases"],
  "Higher Mathematics": ["Complex numbers", "Differential equations"],
};
const COURSE: Record<string, string> = {
  Physics: "IGCSE Physics",
  "Applied STEM": "Applied STEM",
  Coding: "Coding Foundations",
  Robotics: "Robotics Explorers",
  "Computer Science": "Computer Science",
  Mathematics: "IB Mathematics AA",
  "Data Science": "Data Science Starter",
  Chemistry: "IGCSE Chemistry",
  "Higher Mathematics": "Further Mathematics",
};

const COHORTS = [
  { name: "G10 IGCSE Physics · Batch A · 2026", teacher: "tch-vance", subject: "Physics", course: "IGCSE Physics", program: "ic", grade: 10, tz: "Asia/Kolkata", days: [1, 3], hour: 16, minute: 0, duration: 60, size: 12, members: 11, region: ["IND", "ARE", "SGP"] },
  { name: "G10 IGCSE Physics · Batch B · 2026", teacher: "tch-dubois", subject: "Physics", course: "IGCSE Physics", program: "ic", grade: 10, tz: "Europe/London", days: [2, 4], hour: 17, minute: 30, duration: 60, size: 16, members: 14, region: ["GBR", "USA", "KEN"] },
  { name: "G8 Coding · Evening · 2026", teacher: "tch-sharma", subject: "Coding", course: "Coding Foundations", program: "cd", grade: 8, tz: "Asia/Dubai", days: [1, 4], hour: 18, minute: 0, duration: 45, size: 8, members: 8, region: ["ARE", "SAU", "IND"] },
  { name: "G12 IB Maths AA HL · 2026", teacher: "tch-iyer", subject: "Mathematics", course: "IB Mathematics AA HL", program: "ib", grade: 12, tz: "Asia/Dubai", days: [0, 3], hour: 15, minute: 0, duration: 75, size: 20, members: 18, region: undefined },
  { name: "G7 Robotics · Weekend · 2026", teacher: "tch-ray", subject: "Robotics", course: "Robotics Explorers", program: "rb", grade: 7, tz: "Asia/Singapore", days: [6, 3], hour: 10, minute: 0, duration: 60, size: 24, members: 22, region: undefined },
];

function plan(today: number) {
  const first = today - DAYS;
  const sessions: PlannedSession[] = [];
  const learners: Learner[] = [];
  const cohortMembers: Learner[] = [];

  // 1. Cohorts: recurring group classes
  for (const c of COHORTS) {
    const members = Array.from({ length: c.members }, () => makeLearner(c.grade, c.region));
    learners.push(...members);
    cohortMembers.push(...members);
    for (let day = first; day < today; day++) {
      if (!c.days.includes(weekday(day))) continue;
      // Weekend robotics on Wednesdays starts later
      const hour = c.teacher === "tch-ray" && weekday(day) === 3 ? 16 : c.hour;
      const minute = c.teacher === "tch-ray" && weekday(day) === 3 ? 30 : c.minute;
      sessions.push({
        kind: "enrolled",
        teacherId: c.teacher,
        subject: c.subject,
        course: c.course,
        topic: pick(TOPICS[c.subject]),
        program: c.program,
        grade: c.grade,
        language: "en",
        cohort: c.name,
        plannedSize: c.size,
        durationMin: c.duration,
        at: zoned(day, hour, minute, c.tz),
        learners: members,
      });
    }
  }

  // 2. One-to-one and small-group learners with a weekly slot
  const weekly = (ls: Learner[], teacherId: string, subject: string, startDay: number, size: number) => {
    const tz = ls[0].tz;
    const slotDay = int(0, 6);
    const hour = pick([15, 16, 17, 18, 19]);
    const minute = pick([0, 30]);
    const t = TEACHER_TRAITS[teacherId];
    const program = pick(t.programs);
    const language = teacherId === "tch-sharma" && ls[0].iso3 === "IND" && chance(0.4) ? "hi" : teacherId === "tch-iyer" && ["ARE", "SAU"].includes(ls[0].iso3) && chance(0.35) ? "ar" : "en";
    for (let day = startDay; day < today; day++) {
      if (weekday(day) !== slotDay) continue;
      sessions.push({
        kind: "enrolled",
        teacherId,
        subject,
        course: COURSE[subject] || subject,
        topic: pick(TOPICS[subject]),
        program,
        grade: ls[0].grade,
        language,
        cohort: null,
        plannedSize: size,
        durationMin: pick([45, 60, 60]),
        at: zoned(day, hour, minute, tz),
        learners: ls,
      });
    }
  };
  const teacherFor = (subject?: string) => {
    const options = Object.entries(TEACHER_TRAITS).filter(([id, t]) => id !== "tch-schmidt" && (!subject || t.subjects.includes(subject)));
    const [id, t] = pick(options);
    return { id, subject: subject || pick(t.subjects) };
  };
  for (let i = 0; i < 8; i++) {
    const l = makeLearner(int(6, 12));
    learners.push(l);
    const { id, subject } = teacherFor();
    weekly([l], id, subject, first, 1);
  }
  for (let g = 0; g < 3; g++) {
    const grade = int(6, 11);
    const group = Array.from({ length: int(3, 6) }, () => makeLearner(grade));
    learners.push(...group);
    const { id, subject } = teacherFor();
    weekly(group, id, subject, first, group.length);
  }
  // A new teacher with only a couple of classes so far ("not enough classes to rank")
  const late = makeLearner(12, ["GBR"]);
  learners.push(late);
  weekly([late], "tch-schmidt", "Higher Mathematics", today - 15, 1);

  // 3. Prospects: counselling → demo class → admission → (some) enrolled classes
  const counsellor = () => pick(COUNSELLORS);
  for (let i = 0; i < 60; i++) {
    const p = makeLearner(int(5, 11));
    learners.push(p);
    let day = first + int(0, DAYS - 6);
    const cns = counsellor();
    const counselling = (d: number, kind: string, minutes: number) =>
      sessions.push({
        kind,
        teacherId: cns.id,
        subject: "Admissions",
        course: null,
        topic: kind === "admission" ? "Admission interview" : "Programme guidance",
        program: null,
        grade: p.grade,
        language: "en",
        cohort: null,
        plannedSize: 1,
        durationMin: minutes,
        at: zoned(d, pick([11, 14, 16, 17, 18, 19]), pick([0, 30]), p.tz),
        learners: [p],
        noShowBoost: 0.12,
      });
    counselling(day, "counselling", 45);
    if (chance(0.2)) counselling((day += 2), "counselling", 45); // rescheduled after a no-show
    const demoDay = day + int(2, 6);
    if (demoDay >= today) continue;
    const { id, subject } = teacherFor();
    sessions.push({
      kind: "demo",
      teacherId: id,
      subject,
      course: COURSE[subject] || subject,
      topic: pick(TOPICS[subject]),
      program: pick(TEACHER_TRAITS[id].programs),
      grade: p.grade,
      language: "en",
      cohort: null,
      plannedSize: 1,
      durationMin: 45,
      at: zoned(demoDay, pick([16, 17, 18]), pick([0, 30]), p.tz),
      learners: [p],
      noShowBoost: 0.08,
    });
    if (!chance(0.6)) continue;
    const admitDay = demoDay + int(3, 8);
    if (admitDay >= today) continue;
    counselling(admitDay, "admission", 30);
    if (chance(0.72)) weekly([p], id, subject, admitDay + int(2, 10), 1);
  }

  // 4. Drop-in rooms: doubt clearing desks (unscheduled, so no punctuality)
  for (const desk of [
    { room: "demo-doubt-desk-maths", teacher: "tch-iyer", subject: "Mathematics", tz: "Asia/Dubai" },
    { room: "demo-doubt-desk-physics", teacher: "tch-vance", subject: "Physics", tz: "Asia/Kolkata" },
  ]) {
    for (let day = first; day < today; day++) {
      if (weekday(day) === 0 || !chance(0.45)) continue;
      const n = chance(0.25) ? 2 : 1;
      sessions.push({
        kind: "doubt_clearing",
        teacherId: desk.teacher,
        subject: desk.subject,
        course: COURSE[desk.subject],
        topic: "Drop-in help",
        program: null,
        grade: null,
        language: "en",
        cohort: null,
        plannedSize: 1,
        durationMin: 30,
        at: zoned(day, pick([12, 13, 17]), pick([0, 15, 30]), desk.tz),
        learners: [...new Set(Array.from({ length: n }, () => pick(cohortMembers)))],
        room: desk.room,
      });
    }
  }

  // 5. Ad-hoc sessions (a room with no scheduled class)
  for (let i = 0; i < 12; i++) {
    const tId = pick(Object.keys(TEACHER_TRAITS));
    const day = first + int(1, DAYS - 1);
    sessions.push({
      kind: "adhoc",
      teacherId: tId,
      subject: "",
      course: null,
      topic: "",
      program: null,
      grade: null,
      language: "en",
      cohort: null,
      plannedSize: 0,
      durationMin: int(20, 50),
      at: zoned(day, pick([13, 15, 17]), 0, "UTC"),
      learners: [...new Set(Array.from({ length: int(1, 4) }, () => pick(learners)))],
      room: `demo-staffroom-${tId.replace("tch-", "")}-${i}`,
    });
  }
  return { sessions: sessions.sort((a, b) => a.at - b.at), learners };
}

// ---------------------------------------------------------------- simulation of one held class
const TEACHER_LINES = [
  "Let's pick up where we left off last time.",
  "Here's the key idea for today.",
  "Watch what happens when we change this value.",
  "Try the next one on your own for a minute.",
  "Good, that's exactly right.",
  "Let me show you a common mistake.",
  "Write this down, it'll come up again.",
  "We'll check your answers together now.",
  "For homework, finish the practice set.",
  "Any thoughts before we move on?",
];
const QUESTIONS = ["Why does it change direction there?", "How do we know which formula to use?", "Can you go over that step again?", "What happens if the value is negative?", "Is this going to be in the test?", "Could we do one more example?", "Does the order matter here?", "Which unit should the answer be in?"];
const REMARKS = ["I got the same answer.", "That makes sense now.", "I'm not sure about the last part.", "Done!", "I think it's the second one."];

interface Rows {
  users: any[];
  classes: any[];
  enrollments: any[];
  recordings: any[];
  attendance: any[];
  samples: any[];
  transcript: any[];
  polls: any[];
  votes: any[];
  audit: any[];
  notes: any[];
  reviews: any[];
}

function simulate(s: PlannedSession, idx: number, rows: Rows, nowMs: number, classIdForRoom: Map<string, string>) {
  const t = TEACHER_TRAITS[s.teacherId];
  const cns = COUNSELLORS.find((c) => c.id === s.teacherId);
  const counselling = s.kind === "counselling" || s.kind === "admission";
  const daysAgo = (nowMs - s.at) / 864e5;
  // tch-ray's classes got worse over the last month
  const skill = t ? (t.slipping && daysAgo < 30 ? t.skill - 0.28 : t.skill) : 0.8;
  const punctual = t ? (t.slipping && daysAgo < 30 ? 0.5 : t.punctual) : 0.8;
  const host = s.kind === "enrolled" && chance(0.03) ? pick(Object.keys(TEACHER_TRAITS).filter((x) => x !== s.teacherId)) : s.teacherId;

  // Room and class row
  let room = s.room;
  let classId = room ? classIdForRoom.get(room) : undefined;
  if (!room) {
    const teacher = FACULTY_ROSTER.find((f) => f.id === s.teacherId);
    const slug = (s.subject || "session").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10);
    room = `demo-${(teacher?.countryIso2 || "in").toLowerCase()}-${s.kind === "enrolled" ? "class" : s.kind}-gr${s.grade ?? 0}-${slug}-${s.teacherId.replace(/^(tch|demo-cns)-/, "").replace(/[^a-z0-9]/g, "")}-${String(idx).padStart(4, "0")}`;
  }
  if (!classId && s.kind !== "adhoc") {
    classId = `demo-cls-${String(idx).padStart(4, "0")}`;
    rows.classes.push({
      id: classId,
      roomSlug: room,
      kind: s.kind,
      subject: s.subject,
      course: s.course,
      topic: s.room ? null : s.topic,
      gradeLevel: s.grade,
      program: s.program,
      language: s.language,
      teacherId: s.teacherId,
      // Drop-in rooms have no slot
      scheduledStart: new Date(s.room ? Date.UTC(2025, 0, 1) : s.at),
      durationMin: s.durationMin,
      classSize: s.plannedSize,
      cohort: s.cohort,
      createdBy: "admin-1",
    });
    if (s.room) classIdForRoom.set(room, classId);
    else for (const l of s.learners) rows.enrollments.push({ classId, studentKey: l.id });
  }

  // A few scheduled classes never happen (delivery rate)
  if (!s.room && s.kind !== "adhoc" && chance(0.03)) return;

  // When it really started and how long it ran
  const delay = s.room || s.kind === "adhoc" ? 0 : chance(punctual) ? clamp(normal(1, 1.6), -3, 5) : between(6, 26);
  const start = s.at + delay * 60000;
  const learnersComing: Array<{ l: Learner; join: number; leave: number; drop?: [number, number] }> = [];
  const noShow = s.noShowBoost || 0;
  for (const l of s.learners) {
    const lh = localHour(s.at, l.tz);
    const awkwardHour = lh >= 21.5 || lh < 7 ? 0.62 : 1;
    const p = l.propensity * (0.82 + 0.2 * skill) * awkwardHour - noShow;
    if (!chance(p)) continue;
    learnersComing.push({ l, join: s.at + (chance(0.12) ? between(5, 16) : normal(0.5, 1.5)) * 60000, leave: 0 });
  }
  let duration: number;
  if (counselling) {
    duration = learnersComing.length ? clamp(normal(cns?.contact || 30, 7), 8, s.durationMin * 1.4) + between(1, 4) : between(9, 14);
  } else if (s.room) {
    duration = learnersComing.length ? clamp(normal(22, 7), 8, 45) : between(5, 10);
  } else {
    duration = s.durationMin * clamp(normal(0.7 + 0.32 * skill, 0.08), 0.55, 1.2) - (delay > 0 ? delay * 0.5 : 0);
  }
  // Host dropped and restarted (a short aborted session first)
  if (chance(0.015)) {
    const abortedId = `demo-rec-${String(idx).padStart(4, "0")}a`;
    rows.recordings.push({ id: abortedId, roomSlug: room, mode: "transcript_only", status: "ready", startedBy: host, excluded: [], startedAt: new Date(start - 4 * 60000), endedAt: new Date(start - 2.5 * 60000) });
  }
  const end = start + duration * 60000;
  if (end > nowMs - 10 * 60000) return;
  const recId = `demo-rec-${String(idx).padStart(4, "0")}`;
  rows.recordings.push({ id: recId, roomSlug: room, mode: "transcript_only", status: "ready", startedBy: host, excluded: [], startedAt: new Date(start), endedAt: new Date(end) });

  // Join / leave (2% of classes lost their webhooks: attendance unknown)
  const tracked = !chance(0.02);
  const ev = (userId: string, name: string, role: string, event: string, at: number) =>
    tracked && rows.attendance.push({ roomSlug: room, userId, name, role, event, at: new Date(at), eventId: `demo-ev-${rows.attendance.length}` });
  const hostName = FACULTY_ROSTER.find((f) => f.id === host)?.name || cns?.name || host;
  ev(host, hostName, counselling ? "sales_rep" : "instructor", "join", start - between(0.5, 4) * 60000);
  ev(host, hostName, counselling ? "sales_rep" : "instructor", "leave", end + between(0, 1) * 60000);
  for (const c of learnersComing) {
    c.join = Math.min(c.join, end - 2 * 60000);
    c.leave = chance(0.08) ? c.join + (end - c.join) * between(0.5, 0.9) : end + between(0, 60000);
    ev(c.l.id, c.l.name, "student", "join", c.join);
    if (c.l.device === "mobile" && chance(0.2)) {
      const drop = c.join + (c.leave - c.join) * between(0.2, 0.7);
      c.drop = [drop, drop + between(1, 3) * 60000];
      ev(c.l.id, c.l.name, "student", "leave", c.drop[0]);
      ev(c.l.id, c.l.name, "student", "join", c.drop[1]);
    }
    ev(c.l.id, c.l.name, "student", "leave", c.leave);

    // Device check on join (rarely blocked first, then joins from a laptop)
    let device = c.l.device;
    if (device === "mobile" && chance(0.08)) {
      rows.audit.push(deviceEvent(room, c.l, "mobile", "join_blocked", c.join - 90_000));
      device = "laptop";
    }
    rows.audit.push(deviceEvent(room, c.l, device, "join_allowed", c.join - 10_000));

    // Engagement samples (consenting learners), one every 4 minutes
    if (c.l.consent) {
      const lh = localHour(start, c.l.tz);
      const base = clamp(
        0.3 + 0.55 * skill + c.l.focus - (device === "mobile" ? 0.08 : device === "tablet" ? 0.03 : 0) - (lh >= 21.5 || lh < 7 ? 0.08 : 0) - (s.learners.length > 16 ? 0.04 : 0),
        0.15,
        0.95
      );
      for (let at = Math.max(c.join, start) + 60000; at < Math.min(c.leave, end); at += 4 * 60000) {
        if (c.drop && at >= c.drop[0] && at <= c.drop[1]) continue;
        const cameraOff = chance(0.06);
        const eye = clamp(normal(base, 0.12), 0, 1);
        const dominant = cameraOff ? "away" : eye > 0.75 ? weighted([["focused", 5], ["interested", 3], ["happy", 1]]) : eye > 0.5 ? weighted([["listening", 4], ["calm", 3], ["confused", 1]]) : weighted([["distracted", 3], ["bored", 2], ["tired", 2]]);
        rows.samples.push({
          roomSlug: room,
          participantId: c.l.id,
          at: new Date(at),
          data: {
            roomSlug: room,
            participant: { id: c.l.id, name: c.l.name, role: "student" },
            at: new Date(at).toISOString(),
            summary: { presence: cameraOff ? 0.2 : 1, eyeContact: eye, perclos: clamp(normal(0.08, 0.04), 0, 0.4), blinkPerMin: 15, yawns: 0, talkRatio: 0.05, expressivity: 0.3, states: [{ label: dominant, score: 0.7 }], dominant },
          },
        });
      }
    }
  }

  // Transcript: the teacher talks, learners ask questions
  const minutes = (end - start) / 60000;
  const teacherLines = Math.round(minutes / (counselling ? 1.2 : 1.6));
  for (let i = 0; i < teacherLines; i++) {
    rows.transcript.push({ roomSlug: room, at: new Date(start + (i + 0.5) * (minutes / teacherLines) * 60000), speakerId: host, speakerName: hostName, text: pick(TEACHER_LINES), lang: "en" });
  }
  const interaction = t?.interaction ?? 1.1;
  const present = learnersComing.length;
  const questions = poisson(counselling ? 2.5 * Math.min(1, present) : interaction * Math.max(0, present) * (minutes / 60) * 0.22);
  for (let i = 0; i < questions + poisson(present * 0.6); i++) {
    if (!present) break;
    const who = pick(learnersComing).l;
    rows.transcript.push({ roomSlug: room, at: new Date(start + between(0.1, 0.95) * minutes * 60000), speakerId: who.id, speakerName: who.name, text: i < questions ? pick(QUESTIONS) : pick(REMARKS), lang: "en" });
  }

  // Polls
  if (!counselling && present >= 2 && chance(interaction >= 1 ? 0.6 : 0.25)) {
    for (let k = 0; k < (chance(0.25) ? 2 : 1); k++) {
      const pollId = `demo-poll-${idx}-${k}`;
      rows.polls.push({ id: pollId, roomSlug: room, question: "Which answer is right?", options: ["A", "B", "C", "D"], createdBy: host, createdAt: new Date(start + minutes * between(0.3, 0.8) * 60000), closedAt: new Date(start + minutes * 0.85 * 60000) });
      for (const c of learnersComing) if (chance(0.85)) rows.votes.push({ pollId, userId: c.l.id, optionIndex: int(0, 3), at: new Date(start + minutes * 0.82 * 60000) });
    }
  }

  // Moderation and capture attempts
  if (present >= 4) {
    for (let k = 0; k < poisson(0.25); k++) rows.audit.push(auditRow("room_control", "mute", room, host, start + between(0.1, 0.9) * minutes * 60000, { target: pick(learnersComing).l.id }));
    if (chance(0.01)) rows.audit.push(auditRow("room_control", "remove", room, host, start + between(0.2, 0.9) * minutes * 60000, { target: pick(learnersComing).l.id }));
  }
  if (present && chance(0.02)) {
    const who = pick(learnersComing).l;
    rows.audit.push(auditRow("security", "printscreen_key", room, who.id, start + between(0.1, 0.9) * minutes * 60000, { userId: who.id, roomSlug: room }));
  }

  // Notes for most classes; an auditor review for about one in ten
  if (present && chance(0.88)) rows.notes.push({ id: `demo-notes-${idx}`, roomSlug: room, recordingId: recId, generator: "demo", data: { demo: true, summary: "Demo history: no real notes." }, createdAt: new Date(end + 60000) });
  if (present && chance(0.1)) {
    const criteria = counselling ? ["rapport", "needs", "clarity", "accuracy", "nextSteps"] : ["clarity", "pacing", "interaction", "accuracy", "management"];
    const scores = Object.fromEntries(criteria.map((k) => [k, Math.round(clamp(normal(1 + 3 * (counselling ? 0.75 : skill), 0.55), 1, 4))]));
    const vals = Object.values(scores) as number[];
    rows.reviews.push({
      id: `demo-rv-${idx}`,
      recordingId: recId,
      roomSlug: room,
      teacherId: s.teacherId,
      auditorId: AUDITOR,
      rubric: counselling ? "counselling_v1" : "teaching_v1",
      scores,
      total: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      note: null,
      status: "submitted",
      createdAt: new Date(Math.min(end + 86_400_000, nowMs - 60_000)),
      submittedAt: new Date(Math.min(end + 86_400_000, nowMs - 60_000)),
    });
  }
}

let auditSeq = 0;
function auditRow(stream: string, type: string, roomSlug: string, userId: string, at: number, data: object) {
  return { id: `demo-au-${++auditSeq}`, stream, at: new Date(at), roomSlug, userId, type, data: { ...data, demo: true } };
}
function deviceEvent(roomSlug: string, l: Learner, device: string, type: string, at: number) {
  const id = `demo-au-${++auditSeq}`;
  return {
    id,
    stream: "device_access",
    at: new Date(at),
    roomSlug,
    userId: l.id,
    type,
    data: { id, at: new Date(at).toISOString(), type, roomSlug, actor: { id: l.id, name: l.name, role: "student" }, device: { effectiveDeviceType: device, timezone: l.tz }, demo: true },
  };
}

// ---------------------------------------------------------------- database
async function removeDemo(db: any, schema: any) {
  const demo = "demo-%";
  await db.delete(schema.sessionLearners).where(like(schema.sessionLearners.recordingId, demo));
  await db.delete(schema.sessionFacts).where(like(schema.sessionFacts.recordingId, demo));
  await db.delete(schema.classReviews).where(like(schema.classReviews.recordingId, demo));
  await db.delete(schema.pollVotes).where(like(schema.pollVotes.pollId, demo));
  await db.delete(schema.polls).where(like(schema.polls.roomSlug, demo));
  await db.delete(schema.lectureNotes).where(like(schema.lectureNotes.roomSlug, demo));
  await db.delete(schema.transcriptLines).where(like(schema.transcriptLines.roomSlug, demo));
  await db.delete(schema.engagementSamples).where(like(schema.engagementSamples.roomSlug, demo));
  await db.delete(schema.attendanceEvents).where(like(schema.attendanceEvents.roomSlug, demo));
  await db.delete(schema.auditEvents).where(or(like(schema.auditEvents.id, demo), like(schema.auditEvents.roomSlug, demo)));
  await db.delete(schema.recordings).where(like(schema.recordings.roomSlug, demo));
  await db.delete(schema.classEnrollments).where(like(schema.classEnrollments.classId, demo));
  await db.delete(schema.classes).where(like(schema.classes.roomSlug, demo));
  await db.delete(schema.consents).where(like(schema.consents.userId, demo));
  await db.delete(schema.users).where(like(schema.users.id, demo));
}

async function insertAll(db: any, table: any, rows: any[], label: string) {
  for (let i = 0; i < rows.length; i += 400) await db.insert(table).values(rows.slice(i, i + 400));
  console.log(`  ${label.padEnd(22)} ${rows.length}`);
}

async function main() {
  await guard();
  const { getDb, schema, closeDb } = await import("../src/server/db");
  const { seedIfEmpty } = await import("../src/server/db/seed");
  const db: any = await getDb();
  await seedIfEmpty(db);
  console.log("Removing previous demo history…");
  await removeDemo(db, schema);
  if (REMOVE) {
    console.log("Done: demo history removed.");
    await closeDb();
    return;
  }

  const nowMs = Date.now();
  const today = Math.floor(nowMs / 864e5);
  const { sessions, learners } = plan(today);
  const rows: Rows = { users: [], classes: [], enrollments: [], recordings: [], attendance: [], samples: [], transcript: [], polls: [], votes: [], audit: [], notes: [], reviews: [] };
  for (const c of COUNSELLORS.filter((x) => x.create)) {
    rows.users.push({ id: c.id, email: `${c.id}@demo.invalid`, name: c.name, role: "sales_rep", avatarColor: "#059669", country: c.country, timezone: c.tz, disabled: true });
  }
  for (const l of learners) {
    rows.users.push({ id: l.id, email: `${l.id}@demo.invalid`, name: l.name, role: "student", avatarColor: "#0082FF", studentCode: l.id.toUpperCase(), gradeLevel: l.grade, country: l.iso3, timezone: l.tz, disabled: true });
  }
  const classIdForRoom = new Map<string, string>();
  sessions.forEach((s, i) => simulate(s, i + 1, rows, nowMs, classIdForRoom));

  console.log("Writing demo history:");
  await insertAll(db, schema.users, rows.users, "users");
  await insertAll(db, schema.classes, rows.classes, "classes");
  await insertAll(db, schema.classEnrollments, rows.enrollments, "enrolments");
  await insertAll(db, schema.recordings, rows.recordings, "held sessions");
  await insertAll(db, schema.attendanceEvents, rows.attendance, "join/leave events");
  await insertAll(db, schema.engagementSamples, rows.samples, "engagement samples");
  await insertAll(db, schema.transcriptLines, rows.transcript, "transcript lines");
  await insertAll(db, schema.polls, rows.polls, "polls");
  await insertAll(db, schema.pollVotes, rows.votes, "poll votes");
  await insertAll(db, schema.auditEvents, rows.audit, "audit events");
  await insertAll(db, schema.lectureNotes, rows.notes, "notes");
  await insertAll(db, schema.classReviews, rows.reviews, "auditor reviews");

  // The real pipeline turns the raw records into analytics facts
  const { computeSessionFacts } = await import("../src/server/analytics/facts");
  console.log(`Computing facts for ${rows.recordings.length} sessions…`);
  const t0 = Date.now();
  let done = 0;
  for (const r of rows.recordings) {
    await computeSessionFacts(r.id);
    if (++done % 100 === 0) console.log(`  ${done}/${rows.recordings.length}`);
  }
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from session_facts where demo`)).rows;
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)} s: ${n} demo sessions ready in Class analytics.`);
  await closeDb();
}

main().catch(async (err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
  try {
    const { closeDb } = await import("../src/server/db");
    await closeDb();
  } catch {}
});
