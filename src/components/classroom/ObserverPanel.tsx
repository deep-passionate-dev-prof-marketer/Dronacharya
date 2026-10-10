import React from "react";
import { BarChart3, ClipboardCheck, Eye, Hand, MessageSquareText, Radio, Video } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { useClassInfo, ClassHeader } from "./ClassHeader";
import { TranscriptFeed } from "./TranscriptFeed";
import { Badge, Button, EmptyState, SegmentedControl } from "../ui";
import { ReviewForm, ReviewValue } from "../analytics/ReviewForm";

const EngagementInsightsPanel = React.lazy(() => import("../engagement/EngagementInsightsPanel").then((m) => ({ default: m.EngagementInsightsPanel })));

type Tab = "live" | "engagement" | "transcript" | "review";
const isQuestion = (t: string) => /\?\s*$/.test(t.trim()) || /^(why|how|what|when|where|who|which|can|could|is|are|does|do|will|should)\b/i.test(t.trim());
const STAFF = new Set(["instructor", "admin", "auditor", "sales_rep", "ta"]);

/**
 * What an auditor sees next to the live class: real numbers so far (who's here, how late it
 * started, questions asked, talk time), live engagement, the transcript, and a review that is saved.
 */
export const ObserverPanel: React.FC = () => {
  const { roomId, roomTitle, participants, waitingList, classStatus, classStartedAt, classRecording, transcriptLines, setActiveView } = useClassroom();
  const info = useClassInfo(roomId) as (ReturnType<typeof useClassInfo> & { studentKeys?: string[]; classSize?: number; cohort?: string | null; kind?: string }) | null;
  const [tab, setTab] = React.useState<Tab>("live");
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const startMs = classStartedAt ? Date.parse(classStartedAt) : null;
  const learners = participants.filter((p) => !STAFF.has(p.role) && !p.waiting);
  const hosts = participants.filter((p) => p.role === "instructor" || p.role === "admin");
  const lateJoiners = startMs ? learners.filter((p) => Date.parse(p.joinedAt) - startMs > 5 * 60_000).length : 0;
  const scheduled = info?.scheduledStart ? Date.parse(info.scheduledStart) : null;
  const delay = startMs && scheduled && Math.abs(startMs - scheduled) <= 120 * 60_000 ? Math.round((startMs - scheduled) / 60_000) : null;
  const sinceStart = startMs ? transcriptLines.filter((l) => Date.parse(l.timestamp) >= startMs) : transcriptLines;
  const hostIds = new Set(hosts.map((h) => h.id));
  const teacherChars = sinceStart.filter((l) => hostIds.has(l.speakerId)).reduce((a, l) => a + l.text.length, 0);
  const allChars = sinceStart.reduce((a, l) => a + l.text.length, 0);
  const questions = sinceStart.filter((l) => !hostIds.has(l.speakerId) && isQuestion(l.text)).length;
  const elapsedMin = startMs ? Math.max(0, Math.round((now - startMs) / 60_000)) : 0;
  const rubric = info?.kind === "counselling" || info?.kind === "admission" ? "counselling_v1" : "teaching_v1";

  const stats: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: "Status",
      value: classStatus === "in_progress" ? `Live · ${elapsedMin} min` : classStatus === "ended" ? "Ended" : "Not started",
      hint: info?.durationMin ? `${info.durationMin} min planned` : undefined,
    },
    {
      label: "Start",
      value: delay == null ? (startMs ? "Unscheduled" : "—") : delay <= 0 ? "On time" : `${delay} min late`,
      hint: scheduled ? `Scheduled ${new Date(scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : undefined,
    },
    {
      label: "Learners here",
      value: String(learners.length),
      hint: [info?.studentKeys?.length ? `${info.studentKeys.length} enrolled` : null, info?.classSize ? `${info.classSize} seats` : null].filter(Boolean).join(" · ") || undefined,
    },
    { label: "Waiting to be admitted", value: String(waitingList.length) },
    { label: "Joined late", value: String(lateJoiners), hint: "More than 5 minutes after the start" },
    { label: "Learner questions", value: String(questions), hint: "From the live transcript" },
    { label: "Teacher talk time", value: allChars ? `${Math.round((teacherChars / allChars) * 100)}%` : "—", hint: "Share of what was said" },
    { label: "Cameras on", value: learners.length ? `${learners.filter((p) => p.videoEnabled).length} of ${learners.length}` : "—" },
    { label: "Hands raised", value: String(learners.filter((p) => p.handRaised).length) },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-sunken border-l border-line min-w-0">
      <div className="px-4 pt-4 pb-3 border-b border-line flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink-3">
              <Eye className="w-3.5 h-3.5" /> Observing
              {classStatus === "in_progress" && (
                <Badge tone="critical" icon={Radio}>
                  Live
                </Badge>
              )}
            </div>
            <div className="mt-1">
              <ClassHeader roomSlug={roomId} fallbackTitle={roomTitle.split("·")[0]} compact />
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={BarChart3}
            onClick={() => {
              const p = new URLSearchParams(window.location.search);
              p.set("f.room", roomId);
              p.set("tab", "sessions");
              window.history.replaceState(window.history.state, "", `${window.location.pathname}?${p.toString()}`);
              setActiveView("analytics");
            }}
          >
            Class history
          </Button>
        </div>
        <SegmentedControl<Tab>
          label="Observer panel"
          value={tab}
          onChange={setTab}
          options={[
            { value: "live", label: "Live" },
            { value: "engagement", label: "Engagement" },
            { value: "transcript", label: "Transcript" },
            { value: "review", label: "Review" },
          ]}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === "live" && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-line bg-surface px-3 py-2.5 min-w-0">
                  <dt className="text-2xs font-semibold text-ink-3">{s.label}</dt>
                  <dd className="mt-0.5 text-lg font-bold text-ink tabular-nums leading-tight">{s.value}</dd>
                  {s.hint && <dd className="text-2xs text-ink-3 truncate">{s.hint}</dd>}
                </div>
              ))}
            </dl>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">In the room</h3>
              {hosts.length + learners.length ? (
                <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                  {[...hosts, ...learners].map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: p.avatarColor || "var(--color-brand-blue)" }} aria-hidden="true">
                        {p.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                      {(p.role === "instructor" || p.role === "admin") && <Badge tone="accent">Host</Badge>}
                      {p.handRaised && <Hand className="w-3.5 h-3.5 text-warning" aria-label="Hand raised" />}
                      <Video className={`w-3.5 h-3.5 ${p.videoEnabled ? "text-ink-2" : "text-ink-3 opacity-40"}`} aria-label={p.videoEnabled ? "Camera on" : "Camera off"} />
                      <span className="text-2xs text-ink-3 tabular-nums w-12 text-right">{new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="Nobody has joined yet" />
              )}
            </section>
            <p className="text-2xs text-ink-3 leading-relaxed">
              Auditors join without camera or microphone and don't appear to learners. These numbers are what's happened so far; the class's full analytics are added a few seconds after it ends.
            </p>
          </div>
        )}
        {tab === "engagement" && (
          <React.Suspense fallback={null}>
            <EngagementInsightsPanel roomSlug={roomId} />
          </React.Suspense>
        )}
        {tab === "transcript" && <TranscriptFeed />}
        {tab === "review" && <LiveReview recordingId={classRecording?.id || null} rubric={rubric} />}
      </div>
    </div>
  );
};

/** The auditor's review of this class session: drafts save as you go; submit when you're ready. */
const LiveReview: React.FC<{ recordingId: string | null; rubric: "teaching_v1" | "counselling_v1" }> = ({ recordingId, rubric }) => {
  const { authenticatedUser } = useClassroom();
  const [initial, setInitial] = React.useState<ReviewValue | null | undefined>(undefined);
  const load = React.useCallback(() => {
    if (!recordingId) return;
    fetch(`/api/reviews?recordingId=${encodeURIComponent(recordingId)}`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((b) => {
        const mine = (b.reviews || []).find((r: any) => r.auditorId === authenticatedUser?.id);
        setInitial(mine ? { rubric: mine.rubric, scores: mine.scores, note: mine.note || "", status: mine.status } : null);
      })
      .catch(() => setInitial(null));
  }, [recordingId, authenticatedUser?.id]);
  React.useEffect(load, [load]);
  if (!recordingId)
    return (
      <EmptyState icon={ClipboardCheck} title="The review opens when the class starts">
        Reviews belong to a class session. You can draft yours while you watch and submit it at the end.
      </EmptyState>
    );
  if (initial === undefined) return null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-3 flex items-center gap-1.5">
        <MessageSquareText className="w-3.5 h-3.5" /> Score each line 1–4. Submitted reviews count toward this class's quality and can't be changed.
      </p>
      <ReviewForm key={recordingId} recordingId={recordingId} rubric={rubric} initial={initial} onSaved={load} compact />
    </div>
  );
};
