import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldQuestion, X, Check, Smartphone, Tablet, Laptop, Monitor, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import type { ApprovalScope, DeviceAccessRequest } from "../../types/deviceAccess";
import { deviceAccessApi, actorFromUser } from "../../services/deviceAccessClient";
import { DEVICE_TYPE_LABELS, PolicyDeviceType, describeAllowedDevices } from "../../services/devicePolicyEngine";
import { realtimeSocket } from "../../services/realtimeSocket";

const STAFF = ["instructor", "admin", "sales_rep", "auditor"];
const ICONS: Record<PolicyDeviceType, React.ComponentType<{ className?: string }>> = { phone: Smartphone, tablet: Tablet, laptop: Laptop, desktop: Monitor };

const timeAgo = (iso: string) => {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/**
 * Bell button + panel listing pending device exception requests, with toast pop-ups for new ones.
 * Rendered in the top bar for staff roles only.
 */
export const DeviceAccessInbox: React.FC = () => {
  const { authenticatedUser, currentRole, roomId } = useClassroom();
  const [requests, setRequests] = useState<DeviceAccessRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [toastIds, setToastIds] = useState<string[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const isStaff = STAFF.includes(currentRole);

  const canDecide = useCallback(
    (r: DeviceAccessRequest) => currentRole === "admin" || (r.policySnapshot.approverRoles as string[]).includes(currentRole),
    [currentRole]
  );

  const ingest = useCallback(
    (list: DeviceAccessRequest[]) => {
      const mine = list.filter((r) => r.status === "pending" && canDecide(r));
      // Requests for the room I'm teaching first
      mine.sort((a, b) => Number(b.roomSlug === roomId) - Number(a.roomSlug === roomId) || Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
      setRequests(mine);
      const fresh = mine.filter((r) => !seen.current.has(r.id));
      fresh.forEach((r) => seen.current.add(r.id));
      if (!firstLoad.current && fresh.length) setToastIds((t) => [...fresh.map((r) => r.id), ...t].slice(0, 3));
      firstLoad.current = false;
    },
    [canDecide, roomId]
  );

  useEffect(() => {
    if (!isStaff) return;
    let alive = true;
    const load = () => deviceAccessApi.listRequests({ status: "pending" }).then((l) => alive && ingest(l)).catch(() => {});
    load();
    const poll = setInterval(load, 6000);
    const offNew = realtimeSocket.on("DEVICE_ACCESS_REQUEST_CREATED", () => load());
    const offDecided = realtimeSocket.on("DEVICE_ACCESS_REQUEST_DECIDED", () => load());
    return () => {
      alive = false;
      clearInterval(poll);
      offNew();
      offDecided();
    };
  }, [isStaff, ingest]);

  const removeLocally = (id: string) => {
    setRequests((r) => r.filter((x) => x.id !== id));
    setToastIds((t) => t.filter((x) => x !== id));
  };

  if (!isStaff) return null;
  const toasts = toastIds.map((id) => requests.find((r) => r.id === id)).filter(Boolean) as DeviceAccessRequest[];

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title="Device access requests"
          aria-label={`Device access requests${requests.length ? `, ${requests.length} pending` : ""}`}
        >
          <ShieldQuestion className="w-4 h-4" />
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-16 sm:top-11 sm:right-0 sm:w-[400px] max-h-[75vh] z-50 flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Device access requests</div>
                  <div className="text-xs text-slate-400">Learners asking to join from a restricted device</div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-2 space-y-2">
                {requests.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">No pending requests</div>
                ) : (
                  requests.map((r) => <RequestCard key={r.id} request={r} isCurrentRoom={r.roomSlug === roomId} onDone={removeLocally} actorUser={authenticatedUser} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toasts for newly-arrived requests */}
      {!open && toasts.length > 0 && (
        <div className="fixed z-[55] top-16 inset-x-2 sm:inset-x-auto sm:right-4 sm:w-[380px] space-y-2 pointer-events-none">
          {toasts.map((r) => (
            <div key={r.id} className="pointer-events-auto rounded-2xl border border-amber-500/30 bg-slate-900/95 backdrop-blur-xl shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between px-3 pt-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">New device request</span>
                <button onClick={() => setToastIds((t) => t.filter((x) => x !== r.id))} className="p-1 rounded-lg hover:bg-white/10 text-slate-400" aria-label="Dismiss">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2 pt-1">
                <RequestCard request={r} isCurrentRoom={r.roomSlug === roomId} onDone={removeLocally} actorUser={authenticatedUser} compact />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const RequestCard: React.FC<{
  request: DeviceAccessRequest;
  isCurrentRoom: boolean;
  onDone: (id: string) => void;
  actorUser: any;
  compact?: boolean;
}> = ({ request: r, isCurrentRoom, onDone, actorUser, compact }) => {
  const [scope, setScope] = useState<ApprovalScope>("this_session");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const d = r.device;
  const type = (d.effectiveDeviceType || d.deviceType) as PolicyDeviceType;
  const Icon = ICONS[type];

  const decide = async (decision: "approve" | "deny") => {
    setBusy(decision);
    setError(null);
    try {
      await deviceAccessApi.decide(r.id, decision, actorFromUser(actorUser), { note: note.trim() || undefined, scope });
      onDone(r.id);
    } catch (err: any) {
      setError(err?.message || "Failed");
      if (err?.status === 409) onDone(r.id);
    } finally {
      setBusy(null);
    }
  };

  const details = useMemo(
    () => [
      ["Device", `${d.deviceModel} (${DEVICE_TYPE_LABELS[type]})`],
      ["System", `${d.osName} · ${d.browserName} ${d.browserVersion}`],
      ["Screen", `${d.screenWidth}×${d.screenHeight} @${d.pixelRatio}x · ${d.aspectRatio} · ${d.orientation}`],
      ["Input", `${d.pointer} pointer · ${d.maxTouchPoints} touch points`],
      ["Network", `${d.ipAddress || "?"} · ${d.timezone}`],
      ["Policy", `${r.policySnapshot.matchedRuleName} · ${describeAllowedDevices(r.policySnapshot.allowedDeviceTypes)}`],
    ],
    [d, r.policySnapshot, type]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white leading-snug">
            <span className="font-semibold">{r.student.name}</span> wants to join from a {DEVICE_TYPE_LABELS[type].toLowerCase()}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {isCurrentRoom ? "Your room" : r.roomSlug} · {timeAgo(r.requestedAt)}
          </div>
        </div>
      </div>

      {r.studentMessage && <p className="text-sm text-slate-300 bg-white/[0.04] rounded-lg px-3 py-2">“{r.studentMessage}”</p>}

      {d.integrity === "mismatch" && (
        <p className="text-xs text-amber-300 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Browser claimed {d.deviceType}; server detected {d.serverClassifiedType}.
        </p>
      )}

      {compact && (
        <button onClick={() => setExpanded((e) => !e)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} /> {expanded ? "Hide" : "Show"} device details
        </button>
      )}

      {expanded && (
        <>
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
            {details.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-slate-300 min-w-0 break-words">{v}</dd>
              </React.Fragment>
            ))}
          </dl>
          <div className="flex rounded-lg bg-slate-950 border border-white/10 p-0.5 text-xs">
            {(["this_session", "this_device"] as ApprovalScope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-1 py-1.5 rounded-md transition-colors ${scope === s ? "bg-white/10 text-white font-semibold" : "text-slate-400"}`}
              >
                {s === "this_session" ? "This session (12h)" : "This device (180 days)"}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note to the learner"
            className="w-full rounded-lg bg-slate-950 border border-white/10 focus:border-blue-500 outline-none px-3 py-2 text-sm text-white placeholder-slate-500"
          />
        </>
      )}

      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => decide("deny")} disabled={!!busy} className="flex-1 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-rose-500/15 hover:border-rose-500/40 text-sm text-slate-200 inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
          {busy === "deny" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Deny
        </button>
        <button onClick={() => decide("approve")} disabled={!!busy} className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
          {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
        </button>
      </div>
    </div>
  );
};
