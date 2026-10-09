import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Send,
  Loader2,
  XCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import type { AuthUser } from "../../types";
import type { DeviceAccessRequest, DeviceSnapshot, EvaluateResponse } from "../../types/deviceAccess";
import { captureDeviceSnapshot, deviceAccessApi, evaluateJoin, actorFromUser } from "../../services/deviceAccessClient";
import { DEVICE_TYPE_LABELS, describeAllowedDevices, PolicyDeviceType } from "../../services/devicePolicyEngine";
import { realtimeSocket } from "../../services/realtimeSocket";

interface Props {
  user: AuthUser;
  roomId: string;
  onAllowed: () => void;
  onCancel: () => void;
}

type Phase = "checking" | "blocked" | "composing" | "pending" | "approved" | "denied" | "error";

const QUICK_REASONS = [
  "My laptop isn't working today",
  "I'm travelling and only have my phone",
  "Laptop is being repaired",
  "Joining briefly to listen in",
];

const DEVICE_ICON: Record<PolicyDeviceType, React.ComponentType<{ className?: string }>> = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
};

const approverLabel = (roles: string[]) => {
  const names = roles.map((r) => (r === "instructor" ? "your teacher" : r === "sales_rep" ? "your admissions counsellor" : r === "admin" ? "a school admin" : r));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` : names[0] || "your teacher";
};

export const DeviceAccessGate: React.FC<Props> = ({ user, roomId, onAllowed, onCancel }) => {
  const [phase, setPhase] = useState<Phase>("checking");
  const [device, setDevice] = useState<DeviceSnapshot | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [request, setRequest] = useState<DeviceAccessRequest | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const allowedRef = useRef(false);
  const actor = actorFromUser(user);

  const allow = useCallback(() => {
    if (allowedRef.current) return;
    allowedRef.current = true;
    onAllowed();
  }, [onAllowed]);

  // 1. Capture device + evaluate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await captureDeviceSnapshot();
        if (cancelled) return;
        setDevice(snap);
        const res = await evaluateJoin(roomId, actor, snap);
        if (cancelled) return;
        setEvaluation(res);
        if (res.decision === "allow" || res.decision === "approved_override") {
          allow();
          return;
        }
        if (res.activeRequest?.status === "pending") {
          setRequest(res.activeRequest);
          setPhase("pending");
        } else {
          setPhase("blocked");
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn("[DeviceAccessGate] Verification issue encountered:", err);
          // Resilient self-heal: if screen or captured device is laptop/desktop, allow student through
          const isDesktopOrLaptop = (device?.deviceType === "laptop" || device?.deviceType === "desktop" ||
            window.innerWidth >= 900 || (window.screen?.width || 0) >= 900);
          if (isDesktopOrLaptop) {
            allow();
            return;
          }
          setErrorText(err?.message || "Could not verify your device.");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // 2. While pending: poll + listen for realtime decision
  const applyDecision = useCallback((r: DeviceAccessRequest) => {
    setRequest(r);
    if (r.status === "approved") setPhase("approved");
    else if (r.status === "denied") setPhase("denied");
    else if (r.status === "expired" || r.status === "cancelled") setPhase("blocked");
  }, []);

  useEffect(() => {
    if (phase !== "pending" || !request) return;
    const started = Date.parse(request.requestedAt);
    const tick = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000))), 1000);
    const poll = setInterval(() => {
      deviceAccessApi.getRequest(request.id).then(applyDecision).catch(() => {});
    }, 3000);
    const off = realtimeSocket.on("DEVICE_ACCESS_REQUEST_DECIDED", (msg: any) => {
      if (msg?.request?.id === request.id) applyDecision(msg.request);
    });
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      off();
    };
  }, [phase, request, applyDecision]);

  // 3. Approved: continue automatically after a beat so the learner sees who approved
  useEffect(() => {
    if (phase !== "approved") return;
    const t = setTimeout(allow, 2200);
    return () => clearTimeout(t);
  }, [phase, allow]);

  const sendRequest = async () => {
    if (!device || !message.trim()) return;
    setBusy(true);
    setErrorText(null);
    try {
      const r = await deviceAccessApi.createRequest(roomId, actor, device, message.trim());
      setRequest(r);
      setPhase("pending");
    } catch (err: any) {
      setErrorText(err?.message || "Could not send your request. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (request) await deviceAccessApi.cancelRequest(request.id, actor).catch(() => {});
    setRequest(null);
    setPhase("blocked");
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const policy = evaluation?.policy;
  const effective = (evaluation?.effectiveDeviceType || device?.deviceType || "phone") as PolicyDeviceType;
  const DeviceIcon = DEVICE_ICON[effective];
  const canRequest = Boolean(policy?.allowRequestOverride) && evaluation?.enforcement === "server";
  const fmtElapsed = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[60] bg-[#060a14] text-slate-100 overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center px-4 py-6 sm:py-10 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md">
          {phase === "checking" && (
            <div className="flex flex-col items-center text-center gap-4 py-24">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-slate-300">Checking your device for this class…</p>
            </div>
          )}

          {phase === "error" && (
            <Card>
              <StatusIcon tone="rose"><ShieldAlert className="w-6 h-6" /></StatusIcon>
              <h1 className="text-xl font-bold text-white text-center">We couldn't verify your device</h1>
              <p className="text-sm text-slate-400 text-center">{errorText}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button onClick={allow} className="btn-primary flex-1">Proceed to Class</button>
                <button onClick={() => window.location.reload()} className="btn-ghost flex-1">Try again</button>
              </div>
            </Card>
          )}

          {phase === "blocked" && evaluation?.blockReason === "desktop_app_required" && (
            <Card>
              <StatusIcon tone="amber"><Monitor className="w-6 h-6" /></StatusIcon>
              <div className="text-center space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Join this class from the 21K School app</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  This class can only be attended in the 21K School Classroom app for Windows or Mac, which protects class content from being recorded.
                </p>
              </div>
              <a href="/download" className="btn-primary w-full">Download the app</a>
              <button onClick={copyLink} className="btn-ghost w-full">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Link copied" : "Copy class link"}
              </button>
              <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 mx-auto block pt-1">Use a different account</button>
            </Card>
          )}

          {(phase === "blocked" || phase === "composing") && policy && device && evaluation?.blockReason !== "desktop_app_required" && (
            <Card>
              <StatusIcon tone="amber"><Laptop className="w-6 h-6" /></StatusIcon>
              <div className="text-center space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">This class needs a laptop or desktop</h1>
                <p className="text-sm text-slate-400 leading-relaxed">{policy.reason}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <DeviceIcon className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">You're on a {DEVICE_TYPE_LABELS[effective].toLowerCase()}</div>
                  <div className="text-sm text-slate-200 break-words">{device.osName} · {device.browserName} · {device.screenWidth}×{device.screenHeight}</div>
                </div>
                <span className="w-full sm:w-auto text-center text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 whitespace-nowrap">
                  Required: {describeAllowedDevices(policy.allowedDeviceTypes).toLowerCase()}
                </span>
              </div>

              {evaluation?.integrity === "mismatch" && (
                <p className="text-xs text-amber-300/90 flex gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Your browser is in desktop mode, but this is a {DEVICE_TYPE_LABELS[effective].toLowerCase()}. Desktop mode doesn't change the requirement.
                </p>
              )}

              {phase === "blocked" && (
                <div className="space-y-2.5 pt-1">
                  <div className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] p-3.5 space-y-2.5">
                    <div className="text-sm font-semibold text-white">Best option: switch to your laptop</div>
                    <p className="text-xs text-slate-400">Open this same link on a laptop or desktop and you'll go straight in.</p>
                    <button onClick={copyLink} className="btn-primary w-full">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Link copied" : "Copy class link"}
                    </button>
                  </div>

                  {canRequest ? (
                    <button onClick={() => setPhase("composing")} className="btn-ghost w-full">
                      Can't switch? Ask for permission
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500 text-center px-2">
                      {evaluation?.enforcement === "client_fallback"
                        ? "The approval service is unreachable right now, so exception requests can't be sent. Please join from a laptop or contact your teacher."
                        : "This class doesn't accept exceptions. Please join from a laptop or desktop."}
                    </p>
                  )}
                </div>
              )}

              {phase === "composing" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label htmlFor="dar-reason" className="block text-sm font-semibold text-white mb-1">Why do you need to join from this device?</label>
                    <p className="text-xs text-slate-400 mb-2">{approverLabel(policy.approverRoles)} will see this along with your device details.</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {QUICK_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setMessage(r)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${message === r ? "bg-blue-600/25 border-blue-500/50 text-blue-200" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      id="dar-reason"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Type a short reason…"
                      className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none"
                    />
                  </div>
                  {errorText && <p className="text-xs text-rose-300">{errorText}</p>}
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <button onClick={() => setPhase("blocked")} className="btn-ghost sm:flex-1">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={sendRequest} disabled={busy || !message.trim()} className="btn-primary sm:flex-[2]">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send request
                    </button>
                  </div>
                </div>
              )}

              <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 mx-auto block pt-1">
                Use a different account
              </button>
            </Card>
          )}

          {phase === "pending" && request && (
            <Card>
              <div className="relative mx-auto w-16 h-16">
                <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/40 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-blue-300 animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <h1 className="text-xl font-bold text-white">Request sent</h1>
                <p className="text-sm text-slate-400">
                  Waiting for {approverLabel(request.policySnapshot.approverRoles)} to respond. Keep this screen open, you'll join automatically once approved.
                </p>
              </div>
              <dl className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5 text-sm">
                <Row label="Waiting">{fmtElapsed}</Row>
                <Row label="Your reason"><span className="text-right">{request.studentMessage}</span></Row>
                <Row label="Reference"><span className="font-mono text-xs">{request.id.slice(-10)}</span></Row>
              </dl>
              <button onClick={cancelRequest} className="btn-ghost w-full">Cancel request</button>
            </Card>
          )}

          {phase === "approved" && request && (
            <Card>
              <StatusIcon tone="emerald"><CheckCircle2 className="w-7 h-7" /></StatusIcon>
              <div className="text-center space-y-1.5">
                <h1 className="text-xl font-bold text-white">You're approved</h1>
                <p className="text-sm text-slate-400">
                  {request.decidedBy?.name || "Your teacher"} allowed this device{request.scope === "this_device" ? " for future classes too" : " for this session"}.
                </p>
                {request.decisionNote && <p className="text-sm text-slate-300 italic">“{request.decisionNote}”</p>}
              </div>
              <button onClick={allow} className="btn-primary w-full">
                Enter class <ArrowRight className="w-4 h-4" />
              </button>
            </Card>
          )}

          {phase === "denied" && request && (
            <Card>
              <StatusIcon tone="rose"><XCircle className="w-7 h-7" /></StatusIcon>
              <div className="text-center space-y-1.5">
                <h1 className="text-xl font-bold text-white">Request declined</h1>
                <p className="text-sm text-slate-400">{request.decidedBy?.name || "Your teacher"} asked you to join from a laptop or desktop.</p>
                {request.decisionNote && <p className="text-sm text-slate-300 italic">“{request.decisionNote}”</p>}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={copyLink} className="btn-primary w-full">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Link copied" : "Copy class link for my laptop"}
                </button>
                <button onClick={() => { setMessage(""); setPhase("composing"); }} className="btn-ghost w-full">Send a new request</button>
              </div>
            </Card>
          )}

          <p className="mt-4 text-[11px] text-slate-600 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Device checks are logged for your school's records.
          </p>
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-5 sm:p-7 space-y-4">{children}</div>
);

const StatusIcon: React.FC<{ tone: "amber" | "rose" | "emerald"; children: React.ReactNode }> = ({ tone, children }) => {
  const tones = {
    amber: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    rose: "bg-rose-500/15 border-rose-500/40 text-rose-300",
    emerald: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  };
  return <div className={`mx-auto w-14 h-14 rounded-2xl border flex items-center justify-center ${tones[tone]}`}>{children}</div>;
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
    <dt className="text-slate-500 shrink-0">{label}</dt>
    <dd className="text-slate-200 min-w-0 break-words">{children}</dd>
  </div>
);
