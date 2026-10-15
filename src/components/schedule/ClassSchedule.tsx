import React from "react";
import { CalendarDays, CalendarPlus, Copy, Film, Link2, Users, Video } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Page, PageHeader, SegmentedControl, Select, Skeleton } from "../ui";
import type { Tone } from "../ui";
import { api, useResource } from "../../services/apiClient";
import { copyText, toast } from "../ui/Feedback";
import { useClassroom } from "../../context/ClassroomContext";
import { buildMeetingUrl } from "../../services/domainService";

interface ClassRow {
  id: string;
  roomSlug: string;
  kind: "enrolled" | "demo" | "admission" | "counselling" | "doubt_clearing" | string;
  subject: string;
  topic: string | null;
  course: string | null;
  gradeLevel: number | null;
  teacherId: string | null;
  teacherName: string | null;
  scheduledStart: string;
  durationMin: number;
  classSize: number;
  cohort: string | null;
  learners?: Array<{ id: string; name: string }>;
}

const KIND: Record<string, { label: string; tone: Tone }> = {
  enrolled: { label: "Class", tone: "accent" },
  doubt_clearing: { label: "Doubt clearing", tone: "neutral" },
  demo: { label: "Demo", tone: "good" },
  admission: { label: "Admission", tone: "warning" },
  counselling: { label: "Counselling", tone: "serious" },
};
const ADMISSIONS_KINDS = ["demo", "admission", "counselling"];

const dayKey = (d: Date) => d.toLocaleDateString("en-CA");
function dayLabel(d: Date) {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 864e5);
  const yesterday = new Date(Date.now() - 864e5);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(tomorrow)) return "Tomorrow";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
}
const time = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Real classes from the school's timetable. "teaching": a teacher's own classes (admins and
 * counsellors see all). "admissions": demo, admission and counselling sessions for the admissions team.
 */
export const ClassSchedule: React.FC<{ mode: "teaching" | "admissions" }> = ({ mode }) => {
  const { joinProductionMeetingUrl, setIsScheduleModalOpen, authenticatedUser, setActiveView } = useClassroom();
  const mine = useResource<{ classes: ClassRow[] }>("/api/classes/mine");
  const [when, setWhen] = React.useState<"upcoming" | "past">("upcoming");
  const [teacher, setTeacher] = React.useState("");
  const [kind, setKind] = React.useState("");
  const canSchedule = ["instructor", "admin", "sales_rep"].includes(authenticatedUser?.role || "");

  const now = Date.now();
  const all = (mine.data?.classes || []).filter((c) => (mode === "admissions" ? ADMISSIONS_KINDS.includes(c.kind) : true));
  const teachers = [...new Map(all.filter((c) => c.teacherId).map((c) => [c.teacherId!, c.teacherName || c.teacherId!])).entries()];
  const shown = all
    .filter((c) => {
      const end = new Date(c.scheduledStart).getTime() + (c.durationMin || 60) * 60_000;
      return when === "upcoming" ? end >= now : end < now;
    })
    .filter((c) => (!teacher || c.teacherId === teacher) && (!kind || c.kind === kind))
    .sort((a, b) => (when === "upcoming" ? 1 : -1) * (new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()));
  const groups = shown.reduce<Array<{ day: string; label: string; rows: ClassRow[] }>>((acc, c) => {
    const d = new Date(c.scheduledStart);
    const key = dayKey(d);
    const g = acc.find((x) => x.day === key);
    if (g) g.rows.push(c);
    else acc.push({ day: key, label: dayLabel(d), rows: [c] });
    return acc;
  }, []);

  const signInLink = async (c: ClassRow, learner: { id: string; name: string }) => {
    const r = await api<{ url: string }>("POST", "/api/auth/invite", { userId: learner.id, roomSlug: c.roomSlug });
    if (!r.ok) return toast(r.error, "critical");
    copyText(r.data.url, `Sign-in link for ${learner.name} copied (valid 7 days)`);
  };

  const title = mode === "admissions" ? "Admissions hub" : "Teaching schedule";
  const description =
    mode === "admissions"
      ? "Demo lessons, admission interviews and counselling sessions. Join, share sign-in links, or book a new one."
      : authenticatedUser?.role === "instructor"
      ? "Your classes. Join from here, or share the class link."
      : "Every class in the timetable.";

  return (
    <Page wide>
      <PageHeader
        title={title}
        description={description}
        actions={
          canSchedule && (
            <Button variant="primary" icon={CalendarPlus} onClick={() => setIsScheduleModalOpen(true)}>
              {mode === "admissions" ? "Book a session" : "Schedule a class"}
            </Button>
          )
        }
      />
      <Card padded>
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-4">
          <SegmentedControl
            label="Which classes"
            value={when}
            onChange={setWhen}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past two weeks" },
            ]}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            {teachers.length > 1 && (
              <Select value={teacher} onChange={(e) => setTeacher(e.target.value)} aria-label="Teacher" className="sm:w-56">
                <option value="">All teachers</option>
                {teachers.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            )}
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind" className="sm:w-44">
              <option value="">All kinds</option>
              {Object.entries(KIND)
                .filter(([k]) => (mode === "admissions" ? ADMISSIONS_KINDS.includes(k) : true))
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
            </Select>
          </div>
        </div>

        {mine.error && !mine.data ? (
          <ErrorState message={mine.error} onRetry={mine.reload} />
        ) : !mine.data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState icon={CalendarDays} title={when === "upcoming" ? "Nothing coming up" : "Nothing in the last two weeks"}>
            {canSchedule && when === "upcoming" ? (mode === "admissions" ? "Book a demo, admission or counselling session." : "Schedule a class to see it here.") : "Classes appear here once they're scheduled."}
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <section key={g.day} aria-label={g.label}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">{g.label}</h2>
                <ul className="flex flex-col gap-2">
                  {g.rows.map((c) => {
                    const start = new Date(c.scheduledStart);
                    const end = new Date(start.getTime() + (c.durationMin || 60) * 60_000);
                    const live = start.getTime() - 10 * 60_000 <= now && now <= end.getTime();
                    const k = KIND[c.kind] || { label: c.kind, tone: "neutral" as Tone };
                    return (
                      <li key={c.id} className={`rounded-2xl border p-3.5 flex flex-col lg:flex-row lg:items-center gap-3 ${live ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-line bg-white/[0.02]"}`}>
                        <div className="lg:w-28 shrink-0">
                          <div className="text-sm font-semibold text-ink tabular-nums">{time(start)}</div>
                          <div className="text-2xs text-ink-3 tabular-nums">to {time(end)}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink truncate">{c.topic ? `${c.subject}: ${c.topic}` : c.subject}</span>
                            <Badge tone={k.tone}>{k.label}</Badge>
                            {live && <Badge tone="good">Now</Badge>}
                          </div>
                          <div className="text-xs text-ink-3 mt-0.5 truncate">
                            {[c.teacherName, c.course, c.gradeLevel ? `Grade ${c.gradeLevel}` : null, c.cohort].filter(Boolean).join(" · ")}
                          </div>
                          {c.learners && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-2xs text-ink-3 inline-flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {c.learners.length ? `${c.learners.length} learner${c.learners.length === 1 ? "" : "s"}:` : "No learners booked yet"}
                              </span>
                              {c.learners.slice(0, 8).map((l) => (
                                <button
                                  key={l.id}
                                  onClick={() => signInLink(c, l)}
                                  className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-line text-xs text-ink-2 inline-flex items-center gap-1"
                                  title={`Copy a sign-in link for ${l.name} (valid 7 days)`}
                                >
                                  <Link2 className="w-3 h-3" /> {l.name}
                                </button>
                              ))}
                              {c.learners.length > 8 && <span className="text-2xs text-ink-3">+{c.learners.length - 8} more</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {when === "upcoming" ? (
                            <>
                              <Button size="sm" variant={live ? "primary" : "secondary"} icon={Video} onClick={() => joinProductionMeetingUrl(c.roomSlug)}>
                                Join
                              </Button>
                              <Button size="sm" variant="ghost" icon={Copy} onClick={() => copyText(buildMeetingUrl(c.roomSlug), "Class link copied")}>
                                Class link
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" icon={Film} onClick={() => setActiveView("recordings")}>
                              Recordings
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
};
