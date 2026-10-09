/**
 * Test data for development (the "dummy" accounts used with the dev sign-in).
 * Runs only when the users table is empty.
 */
import { count } from "drizzle-orm";
import type { Db } from "./index";
import { users, guardians, classes, classEnrollments } from "./schema";
import { FACULTY_ROSTER } from "../../services/matching/facultyRoster";

const STAFF = [
  { id: "admin-1", email: "v.malhotra@21k.school", name: "Director Vikram Malhotra", role: "admin", avatarColor: "#DC2626", country: "IND", languageTag: "en-IN" },
  { id: "sales-1", email: "r.khanna@21k.school", name: "Rajesh Khanna", role: "sales_rep", avatarColor: "#059669", country: "ARE", languageTag: "en-AE" },
  { id: "audit-1", email: "m.aurelius@21k.school", name: "Inspector Marcus Aurelius", role: "auditor", avatarColor: "#7C3AED", country: "GBR", languageTag: "en-GB" },
];

const STUDENTS = [
  { id: "stu-10SOPHIACH", email: "sophia.chen@student.21k.school", name: "Sophia Chen", studentCode: "10SOPHIACH", gradeLevel: 10, country: "SGP", languageTag: "en-SG" },
  { id: "stu-10AARAVMEH", email: "aarav.mehta@student.21k.school", name: "Aarav Mehta", studentCode: "10AARAVMEH", gradeLevel: 10, country: "IND", languageTag: "hi-IN" },
  { id: "stu-08LAYLAHAS", email: "layla.hassan@student.21k.school", name: "Layla Hassan", studentCode: "08LAYLAHAS", gradeLevel: 8, country: "ARE", languageTag: "ar-AE" },
];

const PARENTS = [
  { id: "par-lchen", email: "linda.chen@family.example", name: "Linda Chen", children: ["stu-10SOPHIACH"] },
  { id: "par-rmehta", email: "ritu.mehta@family.example", name: "Ritu Mehta", children: ["stu-10AARAVMEH"] },
];

/** Next weekday occurrence at hh:mm UTC, so sample classes always look current. */
function upcoming(hoursFromNow: number) {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export async function seedIfEmpty(db: Db) {
  const [{ n }] = await (db as any).select({ n: count() }).from(users);
  if (Number(n) > 0) return false;

  await (db as any).insert(users).values([
    ...STAFF,
    ...FACULTY_ROSTER.map((f) => ({
      id: f.id,
      email: f.email,
      name: f.name,
      role: "instructor",
      avatarColor: f.avatarColor,
      country: f.countryIso3,
      languageTag: f.languageTag,
    })),
    ...STUDENTS.map((s) => ({ ...s, role: "student", avatarColor: "#0082FF" })),
    ...PARENTS.map(({ children, ...p }) => ({ ...p, role: "parent", avatarColor: "#F59E0B", country: "IND", languageTag: "en-IN" })),
  ]);
  await (db as any).insert(guardians).values(PARENTS.flatMap((p) => p.children.map((studentId) => ({ parentId: p.id, studentId, relation: "parent" }))));

  const sample = [
    { id: "cls-enrolled-phy", roomSlug: "dronacharya-gr10-phy", kind: "enrolled", subject: "Physics", course: "Grade 10 Physics (Cambridge IGCSE)", topic: "Wave optics & interference", gradeLevel: 10, program: "bc", teacherId: "tch-vance", scheduledStart: upcoming(-0.5), classSize: 24, students: ["stu-10SOPHIACH", "stu-10AARAVMEH"] },
    { id: "cls-demo-robotics", roomSlug: "in-21klf-gr8-rb-demo-sharma", kind: "demo", subject: "Robotics", course: "Learning Floww Robotics", topic: "Build your first line-following robot", gradeLevel: 8, program: "rb", teacherId: "tch-sharma", scheduledStart: upcoming(2), classSize: 4, students: ["stu-08LAYLAHAS"] },
    { id: "cls-admission", roomSlug: "ae-21kos-admission-hassan", kind: "admission", subject: "Admissions", course: "Grade 8 admission interview", topic: "Placement conversation", gradeLevel: 8, program: "ib", teacherId: "tch-iyer", scheduledStart: upcoming(4), classSize: 1, students: ["stu-08LAYLAHAS"] },
    { id: "cls-counselling", roomSlug: "in-21kos-counselling-mehta", kind: "counselling", subject: "Academic guidance", course: "Grade 10 pathway planning", topic: "Choosing IGCSE subjects", gradeLevel: 10, program: "bc", teacherId: "tch-vance", scheduledStart: upcoming(6), classSize: 1, students: ["stu-10AARAVMEH"] },
    { id: "cls-doubts-math", roomSlug: "ae-21kos-gr10-doubts-iyer", kind: "doubt_clearing", subject: "Mathematics", course: "Grade 10 Mathematics", topic: "Quadratic equations: your questions", gradeLevel: 10, program: "ib", teacherId: "tch-iyer", scheduledStart: upcoming(24), classSize: 12, students: ["stu-10SOPHIACH"] },
  ];
  await (db as any).insert(classes).values(sample.map(({ students, ...c }) => ({ ...c, language: "en", durationMin: 60, createdBy: "seed" })));
  await (db as any).insert(classEnrollments).values(sample.flatMap((c) => c.students.map((studentKey) => ({ classId: c.id, studentKey }))));
  console.log("[db] seeded test accounts and sample classes");
  return true;
}
