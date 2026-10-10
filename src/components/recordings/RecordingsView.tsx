import React, { useEffect, useMemo, useRef, useState } from "react";
import { Film, FileText, Loader2, AlertTriangle, RefreshCw, ArrowLeft, Search } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { describeClass, ClassKind } from "../../services/classLabels";
import { ClassNotesDetail } from "../notebook/ClassNotesPanel";

interface RecordingSummary {
  id: string;
  roomSlug: string;
  mode: "video" | "transcript_only";
  status: "recording" | "processing" | "ready" | "failed";
  error: string | null;
  startedAt: string;
  endedAt: string | null;
  hasVideo: boolean;
  class: { kind: ClassKind; subject: string; topic?: string | null; teacherName?: string | null } | null;
}

interface RecordingDetail {
  recording: RecordingSummary;
  class: RecordingSummary["class"] & { course?: string | null };
  transcript: Array<{ at: string; speakerId: string | null; speakerName: string | null; text: string }>;
  engagement: Array<{ minute: number; attention: number | null; people: number; dominant: string | null }> | null;
  notes: any;
}

const fmtClock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const title = (r: { roomSlug: string; class: RecordingSummary["class"]; startedAt: string }) =>
  r.class ? describeClass({ ...r.class, scheduledStart: r.startedAt } as any).title : r.roomSlug;
const durationMin = (r: RecordingSummary) => (r.endedAt ? Math.max(1, Math.round((new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) / 60000)) : null);

const STATUS: Record<RecordingSummary["status"], { label: string; tone: string }> = {
  recording: { label: "Recording now", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
  processing: { label: "Processing", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  ready: { label: "Ready", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" },
  failed: { label: "Video failed", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
};

const Player: React.FC<{ id: string; onBack: () => void; showEngagement: boolean }> = ({ id, onBack, showEngagement }) => {
  const [data, setData] = useState<RecordingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [filter, setFilter] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const activeLine = useRef<HTMLLIElement>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/recordings/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || "Couldn't load the recording");
        setData(b);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const t0 = data ? new Date(data.recording.startedAt).getTime() : 0;
  const lines = useMemo(
    () => (data?.transcript || []).map((l) => ({ ...l, sec: Math.max(0, (new Date(l.at).getTime() - t0) / 1000) })),
    [data, t0]
  );
  const currentIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].sec <= time) idx = i;
    return idx;
  }, [lines, time]);
  useEffect(() => {
    if (video.current && !video.current.paused) activeLine.current?.scrollIntoView({ block: "nearest" });
  }, [currentIdx]);

  const seek = (sec: number) => {
    if (video.current) {
      video.current.currentTime = sec;
      video.current.play().catch(() => {});
    }
    setTime(sec);
  };

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data)
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading recording…
      </div>
    );

  const rec = data.recording;
  const shown = filter.trim() ? lines.filter((l) => l.text.toLowerCase().includes(filter.trim().toLowerCase())) : lines;
  const maxMinute = Math.max(1, ...(data.engagement || []).map((e) => e.minute + 1), Math.ceil((lines[lines.length - 1]?.sec || 0) / 60));

  return (
    <div className="space-y-4 min-w-0">
      <button onClick={onBack} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> All recordings
      </button>
      <div>
        <h2 className="text-lg font-bold text-white">{title({ ...rec, class: data.class })}</h2>
        <p className="text-xs text-slate-400">
          {new Date(rec.startedAt).toLocaleString()} {durationMin(rec) ? `· ${durationMin(rec)} min` : ""} {data.class?.teacherName ? `· ${data.class.teacherName}` : ""}
        </p>
      </div>

      <div className="grid gap-4 @5xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3 min-w-0">
          {rec.hasVideo ? (
            <video
              ref={video}
              src={`/api/recordings/${encodeURIComponent(rec.id)}/media`}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              onTimeUpdate={(e) => setTime((e.target as HTMLVideoElement).currentTime)}
              className="w-full aspect-video rounded-2xl bg-black"
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300 flex gap-2">
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
              <span>{rec.status === "failed" ? rec.error || "The video recording failed." : rec.status === "processing" ? "The video is still being processed." : "Only the transcript was recorded for this class (video recording wasn't available)."}</span>
            </div>
          )}

          {showEngagement && data.engagement && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Class attention by minute</span>
                <span className="text-2xs text-slate-500">Auditors only · share of time eyes on screen</span>
              </div>
              {data.engagement.length ? (
                <div className="flex items-end gap-px h-16" role="img" aria-label="Attention by minute">
                  {Array.from({ length: maxMinute }, (_, m) => {
                    const e = data.engagement!.find((x) => x.minute === m);
                    const v = e?.attention ?? null;
                    return (
                      <button
                        key={m}
                        onClick={() => seek(m * 60)}
                        title={v === null ? `${m} min · no data` : `${m} min · ${Math.round(v * 100)}% attentive · ${e!.people} people${e!.dominant ? ` · mostly ${e!.dominant}` : ""}`}
                        className="flex-1 min-w-[2px] rounded-t-sm bg-cyan-500/70 hover:bg-cyan-300"
                        style={{ height: v === null ? "2px" : `${Math.max(4, v * 100)}%`, opacity: v === null ? 0.25 : 1 }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No engagement data for this class (no one had analytics consent).</p>
              )}
            </div>
          )}

          {data.notes && (
            <details className="rounded-2xl border border-white/10 bg-slate-900/40 p-4" open={!rec.hasVideo}>
              <summary className="text-sm font-semibold text-white cursor-pointer">Lecture notes</summary>
              <div className="mt-3 @container">
                <ClassNotesDetail
                  entry={{ id: `notes-${rec.id}`, roomSlug: rec.roomSlug, recordingId: rec.id, generator: data.notes.generator, createdAt: data.notes.createdAt, classStartedAt: rec.startedAt, class: data.class as any, notes: data.notes }}
                />
              </div>
            </details>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 flex flex-col min-h-0 max-h-[70vh]">
          <div className="p-3 border-b border-white/10 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search transcript (${lines.length} lines)`} className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder-slate-500" />
          </div>
          {shown.length ? (
            <ul className="overflow-y-auto p-2 space-y-1">
              {shown.map((l, i) => {
                const active = !filter && lines.indexOf(l) === currentIdx;
                return (
                  <li key={i} ref={active ? activeLine : undefined}>
                    <button onClick={() => seek(l.sec)} className={`w-full text-left rounded-lg px-2 py-1.5 text-sm ${active ? "bg-blue-600/25 text-white" : "text-slate-300 hover:bg-white/5"}`}>
                      <span className="text-2xs font-mono text-slate-500 mr-1.5">{fmtClock(l.sec)}</span>
                      {l.speakerName && <span className="text-slate-400">{l.speakerName}: </span>}
                      {l.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-500">{lines.length ? "No lines match." : "No speech was captured in this class."}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Class recordings: auditors and admins see all; teachers and counsellors see their own classes. */
export const RecordingsView: React.FC = () => {
  const { currentRole } = useClassroom();
  const [list, setList] = useState<RecordingSummary[] | null>(null);
  const [egress, setEgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Other pages (e.g. class analytics) can open a recording directly with ?recording=<id>
  const [openId, setOpenIdState] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get("recording");
    } catch {
      return null;
    }
  });
  const setOpenId = (id: string | null) => {
    setOpenIdState(id);
    const p = new URLSearchParams(window.location.search);
    if (p.has("recording")) {
      p.delete("recording");
      const q = p.toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
    }
  };

  const load = () => {
    setError(null);
    fetch("/api/recordings")
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || "Couldn't load recordings");
        setList(b.recordings || []);
        setEgress(Boolean(b.egress));
      })
      .catch((e) => {
        setError(e.message);
        setList([]);
      });
  };
  useEffect(load, []);

  return (
    <div className="@container flex-1 overflow-y-auto bg-canvas">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        {openId ? (
          <Player id={openId} onBack={() => setOpenId(null)} showEngagement={currentRole === "auditor" || currentRole === "admin"} />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-white">Class recordings</h1>
                <p className="text-xs text-slate-400">
                  Every class is recorded automatically. {egress ? "Video and transcript." : "Video recording isn't set up on this server yet, so classes are kept as transcripts."}
                </p>
              </div>
              <button onClick={load} className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            {!list ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : !list.length ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">No recordings yet. They appear here when a class starts.</div>
            ) : (
              <ul className="grid gap-2 @3xl:grid-cols-2 @6xl:grid-cols-3">
                {list.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => setOpenId(r.id)} className="w-full text-left rounded-2xl border border-white/10 bg-slate-900/70 hover:bg-slate-900 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-2xs text-slate-400">
                          {r.hasVideo ? <Film className="w-3.5 h-3.5" /> : r.status === "failed" ? <AlertTriangle className="w-3.5 h-3.5 text-rose-300" /> : <FileText className="w-3.5 h-3.5" />}
                          {r.hasVideo ? "Video + transcript" : "Transcript"}
                        </span>
                        <span className={`text-2xs px-2 py-0.5 rounded-md border ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
                      </div>
                      <div className="text-sm font-semibold text-white truncate">{title(r)}</div>
                      <div className="text-2xs text-slate-400">
                        {new Date(r.startedAt).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {durationMin(r) ? ` · ${durationMin(r)} min` : ""}
                        {r.class?.teacherName ? ` · ${r.class.teacherName}` : ""}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};
