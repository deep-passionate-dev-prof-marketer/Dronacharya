/**
 * How a class is described on screen. Pure, so it's shared by server, client and tests.
 * Admissions/sales conversations are presented as "Academic counselling"; the word "sales" never
 * appears on learner- or parent-facing screens.
 */
export type ClassKind = "admission" | "demo" | "counselling" | "doubt_clearing" | "enrolled";

export interface ClassInfo {
  kind: ClassKind;
  subject: string;
  course?: string | null;
  topic?: string | null;
  gradeLevel?: number | null;
  scheduledStart: string; // ISO
  durationMin?: number;
  teacherName?: string | null;
}

export const KIND_LABEL: Record<ClassKind, string> = {
  admission: "Admission session",
  demo: "Demo class",
  counselling: "Academic counselling",
  doubt_clearing: "Doubt-clearing session",
  enrolled: "Class",
};

export const KIND_TONE: Record<ClassKind, string> = {
  admission: "bg-violet-500/15 text-violet-200 border-violet-500/40",
  demo: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  counselling: "bg-sky-500/15 text-sky-200 border-sky-500/40",
  doubt_clearing: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  enrolled: "bg-blue-500/15 text-blue-200 border-blue-500/40",
};

/** "Monday · 14 Oct" in the viewer's own timezone (enrolled classes show the day). */
export function classDayLabel(iso: string, locale?: string, timeZone?: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(locale, { weekday: "long", timeZone });
  const date = d.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone });
  return `${weekday} · ${date}`;
}

export interface ClassHeading {
  badge: string;
  title: string;
  /** Second line: course, grade, and (for enrolled classes) day and time */
  detail: string;
}

export function describeClass(c: ClassInfo, locale?: string, timeZone?: string): ClassHeading {
  const badge = KIND_LABEL[c.kind] || "Class";
  const title = c.topic ? `${c.subject}: ${c.topic}` : c.subject;
  const parts: string[] = [];
  if (c.course && c.course !== c.subject) parts.push(c.course);
  else if (c.gradeLevel) parts.push(`Grade ${c.gradeLevel}`);
  if (c.kind === "enrolled") {
    const time = new Date(c.scheduledStart).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone });
    parts.push(`${classDayLabel(c.scheduledStart, locale, timeZone)}, ${time}`);
  }
  if (c.teacherName) parts.push(c.teacherName);
  return { badge, title, detail: parts.join(" · ") };
}
