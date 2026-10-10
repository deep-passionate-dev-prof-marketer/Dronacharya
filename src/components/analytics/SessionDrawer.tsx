import React from "react";
import { Film } from "lucide-react";
import { fmt } from "../charts/scale";
import { Badge, Button, Drawer, ErrorState, ScoreMeter, Skeleton } from "../ui";
import type { SessionDetail } from "./analyticsClient";
import { shortDate, useApi } from "./analyticsClient";
import { useAnalytics } from "./AnalyticsContext";
import { ReviewForm, RUBRICS } from "./ReviewForm";

const STATUS: Record<string, string> = { present: "On time", late: "Late", left_early: "Left early", absent: "Absent" };

/** One session: its score and why, the facts behind it, who came, and auditor reviews. */
export const SessionDrawer: React.FC<{ recordingId: string | null; onClose: () => void; onOpenRecording: (id: string) => void; viewerId: string }> = ({ recordingId, onClose, onOpenRecording, viewerId }) => {
  const { query, meta } = useAnalytics();
  const { data, error, reload } = useApi<SessionDetail>(recordingId ? `/api/analytics/sessions/${encodeURIComponent(recordingId)}` : null);
  const s = data?.session;
  const f = data?.facts || {};
  const target = meta?.targets.quality ?? 75;
  const mine = data?.reviews.find((r) => r.auditorId === viewerId);
  const others = data?.reviews.filter((r) => r.status === "submitted" && r.auditorId !== viewerId) || [];
  const rubric = s?.profile === "conversation" ? "counselling_v1" : "teaching_v1";
  const kindLabel = (k: string) => meta?.filters.kind?.find((o) => o.value === k)?.label || k;

  const facts: Array<[string, React.ReactNode]> = s
    ? [
        ["Started", shortDate(s.startedAt, query.tz)],
        ["Length", `${fmt(s.durationMin, "min")}${s.scheduledDurationMin ? ` of ${s.scheduledDurationMin} planned` : ""}`],
        ["Start", s.startDelayMin == null ? "Unscheduled" : s.startDelayMin <= 0.5 ? "On time" : `${fmt(s.startDelayMin, "num1")} min late`],
        ["Learners", s.attendanceTracked ? `${s.attended} came${s.plannedSize ? ` · ${s.plannedSize} seats` : ""}${s.enrolled ? ` · ${s.enrolled} enrolled` : ""}` : "Unknown (no join data)"],
        ["Most at once", s.attendanceTracked ? String(s.peakLearners) : "—"],
        ...(s.profile === "conversation" ? ([["Talking time", fmt(s.contactMin, "min")]] as Array<[string, React.ReactNode]>) : []),
        ["Learner questions", String(s.learnerQuestions)],
        ["Polls", String(s.polls)],
        ["Engagement", s.attentionAvg == null ? "Not measured" : `${fmt(s.attentionAvg, "pct")} (${f.engagedLearners} learners agreed)`],
        ["Class notes", f.notesGenerated ? "Generated" : "None"],
        ["Moderation", `${f.mutes || 0} mutes · ${f.removals || 0} removals`],
        ["Capture attempts", String(f.captureAttempts || 0)],
      ]
    : [];

  return (
    <Drawer
      open={Boolean(recordingId)}
      onClose={onClose}
      width="xl"
      title={s ? s.title : "Session"}
      description={
        s && (
          <span className="flex flex-wrap items-center gap-1.5">
            {kindLabel(s.kind)} · {s.teacherName || "Unassigned"}
            {s.cohort && ` · ${s.cohort}`}
            {s.demo && <Badge tone="warning">Demo data</Badge>}
          </span>
        )
      }
      footer={
        s && !s.demo ? (
          <Button size="sm" icon={Film} onClick={() => onOpenRecording(s.recordingId)}>
            Open recording and transcript
          </Button>
        ) : undefined
      }
    >
      {error && <ErrorState message={error} onRetry={reload} />}
      {!data && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {data && !s && <p className="text-sm text-ink-3">{data.aborted ? "This was a false start (under 3 minutes), so it isn't scored." : "No analytics for this session yet."}</p>}
      {s && (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="sd-quality">
            <h3 id="sd-quality" className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
              Quality
            </h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <ScoreMeter score={s.quality} target={target} label="Quality" />
              <span className="text-xs text-ink-3">
                {s.quality == null ? (s.attendanceTracked && s.attended === 0 ? "Nobody came, so it isn't scored." : "Fewer than 3 signals, so it isn't scored.") : `Based on ${s.signals} of 6 signals · ${s.profile === "conversation" ? "counselling" : "teaching"} weights`}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {s.breakdown.map((b) => (
                <li key={b.key} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-xs">
                  <span className="text-ink-2 truncate">
                    {b.label} <span className="text-ink-3">· {b.weight}</span>
                  </span>
                  <span className="relative h-1.5 rounded-full bg-white/[0.06]" aria-hidden="true">
                    {b.value != null && <span className="absolute inset-y-0 left-0 rounded-full bg-series-1" style={{ width: `${Math.round(b.value * 100)}%` }} />}
                  </span>
                  <span className="text-right tabular-nums text-ink">{b.value == null ? <span className="text-ink-3">n/a</span> : Math.round(b.value * 100)}</span>
                </li>
              ))}
            </ul>
            {s.reasons.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-2 list-disc pl-4">
                {s.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="sd-facts">
            <h3 id="sd-facts" className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
              What happened
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-ink text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {data.learners.length > 0 && (
            <section aria-labelledby="sd-learners">
              <h3 id="sd-learners" className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
                Learners ({data.learners.length})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-ink-3 text-left">
                      <th className="px-3 py-2 font-semibold">Learner</th>
                      <th className="px-3 py-2 font-semibold">Joined</th>
                      <th className="px-3 py-2 font-semibold text-right">Minutes</th>
                      <th className="px-3 py-2 font-semibold">Device</th>
                      <th className="px-3 py-2 font-semibold">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.learners.map((l) => (
                      <tr key={l.learnerId} className="border-t border-line">
                        <td className="px-3 py-1.5 text-ink">
                          {l.name || "Learner"}
                          {!l.enrolled && <span className="text-ink-3"> · guest</span>}
                        </td>
                        <td className={`px-3 py-1.5 ${l.status === "absent" ? "text-critical" : l.status === "present" ? "text-ink-2" : "text-warning"}`}>{STATUS[l.status] || l.status}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{l.status === "absent" ? "—" : l.minutesPresent}</td>
                        <td className="px-3 py-1.5 text-ink-2 capitalize">{l.deviceType || "—"}</td>
                        <td className="px-3 py-1.5 text-ink-2">{l.countryName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section aria-labelledby="sd-review">
            <h3 id="sd-review" className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">
              Auditor review · {RUBRICS[rubric].title.toLowerCase()} rubric
            </h3>
            {others.length > 0 && (
              <ul className="mb-3 flex flex-col gap-2">
                {others.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line px-3 py-2 text-xs">
                    <span className="font-semibold text-ink">{r.auditorName || "Auditor"}</span> <span className="text-ink-3">scored {fmt(r.total, "num1")} / 4</span>
                    {r.note && <p className="mt-1 text-ink-2">{r.note}</p>}
                  </li>
                ))}
              </ul>
            )}
            <ReviewForm key={recordingId || ""} recordingId={s.recordingId} rubric={rubric} initial={mine ? { rubric: mine.rubric, scores: mine.scores, note: mine.note || "", status: mine.status } : null} onSaved={() => reload()} />
          </section>
        </div>
      )}
    </Drawer>
  );
};
