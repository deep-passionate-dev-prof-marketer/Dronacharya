import React from "react";
import { CalendarCheck, Download, Mail, Radio, Users } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Page, PageHeader, SegmentedControl, Skeleton } from "../ui";
import type { Tone } from "../ui";
import { useApi } from "../analytics/analyticsClient";

interface SessionRow {
  recordingId: string;
  roomSlug: string;
  title: string;
  kind: string;
  cohort: string | null;
  teacherName: string | null;
  startedAt: string;
  durationMin: number;
  attendanceTracked: boolean;
  enrolled: number;
  attended: number;
  present: number;
  late: number;
  leftEarly: number;
  absent: number;
}
interface Detail {
  session: { recordingId: string; title: string; startedAt: string; durationMin: number; teacherName: string | null; attendanceTracked: boolean };
  learners: Array<{ learnerId: string; name: string; enrolled: boolean; status: string; minutesPresent: number; deviceType: string | null; guardians: Array<{ name: string; email: string }> }>;
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  present: { label: "On time", tone: "good" },
  late: { label: "Late", tone: "warning" },
  left_early: { label: "Left early", tone: "serious" },
  absent: { label: "Absent", tone: "critical" },
};
const when = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Attendance: the class happening now (live roster) and every recent class session with who came
 * on time, who was late, who left early and who missed it. From the class's join and leave records.
 */
export const AttendanceView: React.FC = () => {
  const { participants, waitingList, classStatus, classStartedAt, roomTitle, currentRole } = useClassroom();
  const [days, setDays] = React.useState<"7" | "14" | "30">("14");
  const list = useApi<{ sessions: SessionRow[] }>(`/api/attendance/sessions?days=${days}`);
  const [openId, setOpenId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!openId && list.data?.sessions[0]) setOpenId(list.data.sessions[0].recordingId);
  }, [list.data, openId]);
  const detail = useApi<Detail>(openId ? `/api/attendance/sessions/${encodeURIComponent(openId)}` : null);

  const startMs = classStartedAt ? Date.parse(classStartedAt) : null;
  const liveLearners = participants.filter((p) => p.role === "student" && !p.waiting);

  const exportCsv = () => {
    if (!detail.data) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Learner", "Status", "Minutes in class", "Device", "Enrolled"], ...detail.data.learners.map((l) => [l.name, STATUS[l.status]?.label || l.status, l.status === "absent" ? "" : l.minutesPresent, l.deviceType || "", l.enrolled ? "yes" : "guest"])];
    const blob = new Blob([lines.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${detail.data.session.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${detail.data.session.startedAt.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Page wide>
      <PageHeader
        title="Attendance"
        description={
          currentRole === "instructor"
            ? "Who came to your classes, who was late, who left early and who missed them. From each class's join and leave records."
            : "Who came to each class, who was late, who left early and who missed it. From each class's join and leave records."
        }
      />

      {classStatus === "in_progress" && (
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Badge tone="critical" icon={Radio}>
                  Live
                </Badge>
                {roomTitle.split("·")[0]}
              </span>
            }
            description={`${liveLearners.length} learners in class${waitingList.length ? ` · ${waitingList.length} waiting to be admitted` : ""}. Final attendance appears below a few seconds after the class ends.`}
          />
          {liveLearners.length ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {liveLearners.map((p) => {
                const late = startMs ? Date.parse(p.joinedAt) - startMs > 5 * 60_000 : false;
                return (
                  <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: p.avatarColor || "var(--color-brand-blue)" }} aria-hidden="true">
                      {p.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                    <Badge tone={late ? "warning" : "good"}>{late ? "Late" : "On time"}</Badge>
                    <span className="text-2xs text-ink-3 tabular-nums">{new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon={Users} title="No learners in class yet" />
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <Card className="lg:col-span-5" padded={false}>
          <div className="p-4 pb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Recent classes</h2>
            <SegmentedControl
              label="Period"
              value={days}
              onChange={(d) => {
                setDays(d);
                setOpenId(null);
              }}
              options={[
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
              ]}
            />
          </div>
          {list.error ? (
            <div className="p-4">
              <ErrorState message={list.error} onRetry={list.reload} />
            </div>
          ) : !list.data ? (
            <div className="p-4 flex flex-col gap-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : list.data.sessions.length ? (
            <ul className="max-h-[70dvh] overflow-y-auto px-2 pb-2" aria-label="Recent classes">
              {list.data.sessions.map((s) => {
                const active = s.recordingId === openId;
                return (
                  <li key={s.recordingId}>
                    <button
                      onClick={() => setOpenId(s.recordingId)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 ${active ? "bg-accent/12 ring-1 ring-accent/40" : "hover:bg-white/[0.03]"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{s.title}</span>
                        <span className="block truncate text-2xs text-ink-3">
                          {when(s.startedAt)}
                          {currentRole !== "instructor" && s.teacherName ? ` · ${s.teacherName}` : ""}
                          {s.cohort ? ` · ${s.cohort}` : ""}
                        </span>
                      </span>
                      {s.attendanceTracked ? (
                        <span className="text-right shrink-0">
                          <span className="block text-sm font-bold text-ink tabular-nums">
                            {s.attended}
                            {s.enrolled ? <span className="text-ink-3 font-normal"> / {s.enrolled}</span> : null}
                          </span>
                          <span className="block text-2xs text-ink-3">{s.absent ? `${s.absent} absent` : s.late ? `${s.late} late` : "all on time"}</span>
                        </span>
                      ) : (
                        <span className="text-2xs text-ink-3 shrink-0">No join data</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarCheck} title="No finished classes in this period">
              Attendance appears here a few seconds after a class ends.
            </EmptyState>
          )}
        </Card>

        <Card className="lg:col-span-7">
          {!openId ? (
            <EmptyState icon={CalendarCheck} title="Pick a class to see who came" />
          ) : detail.error ? (
            <ErrorState message={detail.error} onRetry={detail.reload} />
          ) : !detail.data ? (
            <Skeleton className="h-64" />
          ) : (
            <>
              <CardHeader
                title={detail.data.session.title}
                description={`${when(detail.data.session.startedAt)} · ${Math.round(detail.data.session.durationMin)} min${detail.data.session.teacherName ? ` · ${detail.data.session.teacherName}` : ""}`}
                actions={
                  <button onClick={exportCsv} className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg border border-line-strong bg-white/5 hover:bg-white/10 text-xs font-semibold text-ink">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                }
              />
              {!detail.data.session.attendanceTracked ? (
                <p className="text-sm text-ink-3">No join or leave records arrived for this class, so attendance is unknown (not zero).</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {(["present", "late", "left_early", "absent"] as const).map((k) => (
                      <div key={k} className="rounded-xl border border-line px-3 py-2">
                        <div className="text-2xs font-semibold text-ink-3">{STATUS[k].label}</div>
                        <div className="text-xl font-bold text-ink tabular-nums">{detail.data!.learners.filter((l) => l.status === k).length}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Learners in this class</caption>
                      <thead>
                        <tr className="text-left text-2xs uppercase tracking-wide text-ink-3">
                          <th scope="col" className="px-3 py-2 font-semibold">Learner</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Minutes</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Guardian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.data.learners.map((l) => (
                          <tr key={l.learnerId} className="border-t border-line">
                            <td className="px-3 py-2 text-ink">
                              {l.name}
                              {!l.enrolled && <span className="text-2xs text-ink-3"> · guest</span>}
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={STATUS[l.status]?.tone || "neutral"}>{STATUS[l.status]?.label || l.status}</Badge>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-ink-2">{l.status === "absent" ? "—" : l.minutesPresent}</td>
                            <td className="px-3 py-2">
                              {l.guardians.length && l.status !== "present" ? (
                                <a
                                  href={`mailto:${encodeURIComponent(l.guardians[0].email)}?subject=${encodeURIComponent(`${detail.data!.session.title} on ${new Date(detail.data!.session.startedAt).toLocaleDateString()}`)}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                                  title={`Email ${l.guardians[0].name} (${l.guardians[0].email})`}
                                >
                                  <Mail className="w-3.5 h-3.5" /> {l.guardians[0].name}
                                </a>
                              ) : (
                                <span className="text-2xs text-ink-3">{l.guardians.length ? "" : "None on file"}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </Page>
  );
};
