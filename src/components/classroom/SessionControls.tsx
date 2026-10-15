import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Play, RefreshCw, ShieldOff, X } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";

/**
 * Start / hosted-by / connection pieces of the class screen. The server decides who hosts a class
 * (GET /session → me.isHost), so these never show a Start button that would only fail.
 */

/** "Start class for everyone": only for the class's host; busy while the request runs. */
export const StartClassButton: React.FC<{ variant?: "hero" | "bar" | "compact"; className?: string; onStarted?: () => void }> = ({
  variant = "hero",
  className = "",
  onStarted,
}) => {
  const { classHost, sessionBusy, startClass, classStatus } = useClassroom();
  if (!classHost?.isHost || classStatus === "in_progress") return null;
  const busy = sessionBusy === "start";
  const label = classStatus === "ended" ? "Start a new class" : "Start class for everyone";
  const style =
    variant === "hero"
      ? "w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30"
      : variant === "bar"
      ? "h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-400/40"
      : "h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold";
  return (
    <button
      onClick={async () => {
        if (busy) return;
        if (await startClass()) onStarted?.();
      }}
      disabled={busy}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-wait ${style} ${className}`}
      title={classStatus === "ended" ? "Starts a new class in this room (and a new recording)" : "Starts the class and its recording for everyone"}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
      <span className="whitespace-nowrap">{busy ? "Starting…" : variant === "compact" && classStatus !== "ended" ? "Start class" : label}</span>
    </button>
  );
};

/** For staff who can see the class but don't host it */
export const HostedByNote: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { classHost, classStatus } = useClassroom();
  if (!classHost || classHost.isHost || classStatus === "in_progress") return null;
  const who = classHost.hostName || "the class's teacher";
  return (
    <p className={`text-xs text-slate-300 ${className}`}>
      Hosted by <strong className="text-white">{who}</strong>. {classStatus === "ended" ? "Only they can start a new class here." : "The class opens here when they start it."}
    </p>
  );
};

function useSecondsUntil(at?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [at]);
  return at ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
}

/** Connection and class-server problems, shown on top of the stage (the class keeps running below). */
export const ConnectionBanners: React.FC = () => {
  const { transportState, sessionSyncError, classSessionError, dismissClassSessionError, retryConnection } = useClassroom();
  const retryIn = useSecondsUntil(transportState.error === "connect_failed" ? transportState.retryAt : undefined);
  return (
    <>
      {transportState.error === "connect_failed" ? (
        <div className="pointer-events-auto w-full px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-50 text-xs flex flex-wrap items-center gap-2 shadow-lg" role="alert">
          <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
          <span className="flex-1 min-w-[12rem]">
            <strong className="font-semibold">Couldn't connect to the class video.</strong> {transportState.errorMessage}
            {retryIn > 0 && <span className="text-rose-200/80"> Retrying in {retryIn} s.</span>}
          </span>
          <button onClick={retryConnection} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-semibold">
            <RefreshCw className="w-3.5 h-3.5" /> Try again now
          </button>
        </div>
      ) : (
        transportState.status === "reconnecting" && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100 text-xs font-semibold flex items-center gap-2 shadow-lg" role="status">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Connection unstable, reconnecting… you're still in class
          </div>
        )
      )}
      {sessionSyncError && (
        <div className="pointer-events-auto w-full px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-50 text-xs flex items-center gap-2 shadow-lg" role="status">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="flex-1">{sessionSyncError}</span>
          <button onClick={retryConnection} className="shrink-0 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-semibold">
            Retry
          </button>
        </div>
      )}
      {classSessionError && (
        <div className="pointer-events-auto w-full px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-50 text-xs flex items-center gap-2 shadow-lg" role="alert">
          <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
          <span className="flex-1">{classSessionError}</span>
          <button onClick={dismissClassSessionError} className="shrink-0 p-1 rounded-lg hover:bg-white/15" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};

const ACCESS_ERRORS = ["not_enrolled", "not_in_group", "parent", "signed_out"];

/** The server said this account can't be in this class: say why and what to do, instead of an endless lobby. */
export function useAccessProblem(): { title: string; detail: string; signIn?: boolean } | null {
  const { transportState, classAccessError } = useClassroom();
  const err = transportState.error && ACCESS_ERRORS.includes(transportState.error) ? transportState.error : classAccessError ? "not_enrolled" : null;
  if (!err) return null;
  if (err === "signed_out") return { title: "Please sign in again", detail: transportState.errorMessage || "Your sign-in has expired.", signIn: true };
  if (err === "parent") return { title: "Parents can't join live classes", detail: "Use your child's account to join. You can follow their classes, notes and attendance from the parent portal." };
  if (err === "not_in_group") return { title: "This breakout group isn't yours", detail: transportState.errorMessage || "Wait for your teacher to send you to your group." };
  return {
    title: "You're not on this class's list",
    detail: transportState.errorMessage || classAccessError || "Check the link, or ask your teacher or the school office to add you to this class.",
  };
}

export const AccessProblemCard: React.FC<{ problem: { title: string; detail: string; signIn?: boolean } }> = ({ problem }) => {
  const { logoutUser, retryConnection } = useClassroom();
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
      <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6" role="alert">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <ShieldOff className="w-6 h-6 text-rose-300" />
        </div>
        <h2 className="text-lg font-bold text-white">{problem.title}</h2>
        <p className="text-sm text-slate-400">{problem.detail}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {problem.signIn ? (
            <button onClick={logoutUser} className="btn-primary">
              Sign in
            </button>
          ) : (
            <button onClick={retryConnection} className="btn-primary">
              Check again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Which video path this device is on (media server vs direct), so mismatches are visible */
export const VideoModeBadge: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { transportState } = useClassroom();
  const { mode, status } = transportState;
  if (mode === "none" && status !== "reconnecting" && status !== "connecting") return null;
  const text =
    status === "reconnecting" ? "Reconnecting" : status === "connecting" ? "Connecting" : mode === "sfu" ? "Video service" : mode === "mesh" ? "Direct video" : "Offline";
  const tone = status === "connected" ? "bg-emerald-400" : "bg-amber-400 animate-pulse";
  const title =
    mode === "mesh"
      ? "Direct (peer-to-peer) video: fine for small classes. The school's video service isn't set up on this server."
      : mode === "sfu"
      ? "Connected through the school's video service"
      : "Connecting to the class video";
  return (
    <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold text-slate-200 bg-white/5 px-2 py-1 rounded-lg border border-white/10 whitespace-nowrap ${className}`} title={title}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />
      {text}
    </span>
  );
};
