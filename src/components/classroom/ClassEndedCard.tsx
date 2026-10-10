import React from "react";
import { CheckCircle2, FileText, Film, AlertTriangle, BookOpen, LogOut, Play } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";

/** Shown to everyone once the host ends the class: what was recorded and where the notes go. */
export const ClassEndedCard: React.FC<{ isHost: boolean }> = ({ isHost }) => {
  const { classRecording, classDurationSeconds, recordingExcludedMe, setActiveView, leaveClass, currentRole, startClass, classSessionError } = useClassroom();
  const minutes = Math.max(1, Math.round(classDurationSeconds / 60));
  const canOpenNotebook = currentRole !== "auditor";

  let recordingLine: { icon: React.ReactNode; text: string; tone: string } | null = null;
  if (classRecording) {
    if (classRecording.status === "failed") {
      recordingLine = { icon: <AlertTriangle className="w-4 h-4" />, text: classRecording.error || "The video recording failed. The transcript was kept.", tone: "text-amber-200" };
    } else if (classRecording.mode === "video") {
      recordingLine = {
        icon: <Film className="w-4 h-4" />,
        text: classRecording.status === "ready" ? "Video recording saved." : "Video recording is being saved…",
        tone: "text-emerald-200",
      };
    } else {
      recordingLine = { icon: <FileText className="w-4 h-4" />, text: "Transcript saved. Video recording isn't set up on this server yet.", tone: "text-slate-200" };
    }
  }

  return (
    <div className="p-4 mb-3 rounded-2xl bg-slate-900/95 border border-emerald-500/30 flex flex-col @md:flex-row @md:items-center justify-between gap-3 shadow-xl shrink-0">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm font-bold text-white">Class ended · {minutes} min</h4>
          {recordingLine && (
            <p className={`text-xs flex items-center gap-1.5 ${recordingLine.tone}`}>
              {recordingLine.icon}
              <span>{recordingLine.text}</span>
            </p>
          )}
          {recordingExcludedMe && <p className="text-xs text-slate-400">You weren't included in the recording.</p>}
          <p className="text-xs text-slate-400">Lecture notes from this class will appear in the Notebook in a minute or two.</p>
          {classSessionError && <p className="text-xs text-rose-300">{classSessionError}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {isHost && (
          <button onClick={startClass} className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5" title="Starts a new class in this room (and a new recording)">
            <Play className="w-4 h-4" /> Start a new class
          </button>
        )}
        {canOpenNotebook && (
          <button onClick={() => setActiveView("notebook")} className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Open notebook
          </button>
        )}
        <button onClick={() => leaveClass()} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5">
          <LogOut className="w-4 h-4" /> {isHost ? "Close room" : "Leave"}
        </button>
      </div>
    </div>
  );
};
