import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Smartphone, Tablet, Laptop, Monitor, ShieldAlert, Search, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { deviceAccessApi, actorFromUser, DeviceAccessAnalytics } from "../../services/deviceAccessClient";
import { ALL_DEVICE_TYPES, DEVICE_TYPE_LABELS, DevicePolicyRule, PolicyDeviceType, describeAllowedDevices } from "../../services/devicePolicyEngine";
import type { DeviceAccessEvent, DeviceAccessEventType, DeviceAccessRequest } from "../../types/deviceAccess";
import { realtimeSocket } from "../../services/realtimeSocket";

const EVENT_LABELS: Record<DeviceAccessEventType, { label: string; tone: string }> = {
  policy_set: { label: "Policy set", tone: "text-slate-300 bg-white/5 border-white/10" },
  link_generated: { label: "Link generated", tone: "text-blue-200 bg-blue-500/10 border-blue-500/30" },
  join_evaluated: { label: "Evaluated", tone: "text-slate-300 bg-white/5 border-white/10" },
  join_allowed: { label: "Joined", tone: "text-emerald-200 bg-emerald-500/10 border-emerald-500/30" },
  join_blocked: { label: "Blocked", tone: "text-rose-200 bg-rose-500/10 border-rose-500/30" },
  join_allowed_by_approval: { label: "Joined (approved)", tone: "text-emerald-200 bg-emerald-500/10 border-emerald-500/30" },
  request_created: { label: "Requested", tone: "text-amber-200 bg-amber-500/10 border-amber-500/30" },
  request_approved: { label: "Approved", tone: "text-emerald-200 bg-emerald-500/10 border-emerald-500/30" },
  request_denied: { label: "Denied", tone: "text-rose-200 bg-rose-500/10 border-rose-500/30" },
  request_cancelled: { label: "Cancelled", tone: "text-slate-300 bg-white/5 border-white/10" },
  request_expired: { label: "Expired", tone: "text-slate-300 bg-white/5 border-white/10" },
  rule_updated: { label: "Rule changed", tone: "text-violet-200 bg-violet-500/10 border-violet-500/30" },
};

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = { phone: Smartphone, tablet: Tablet, laptop: Laptop, desktop: Monitor };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const DeviceAccessControlPanel: React.FC = () => {
  const { authenticatedUser, currentRole } = useClassroom();
  const [analytics, setAnalytics] = useState<DeviceAccessAnalytics | null>(null);
  const [events, setEvents] = useState<DeviceAccessEvent[]>([]);
  const [requests, setRequests] = useState<DeviceAccessRequest[]>([]);
  const [rules, setRules] = useState<DevicePolicyRule[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"log" | "requests" | "rules">("log");
  const isAdmin = currentRole === "admin";

  const filters = useMemo(() => {
    const f: Record<string, string> = { limit: "500" };
    if (typeFilter) f.type = typeFilter;
    if (roomFilter.trim()) f.roomSlug = roomFilter.trim();
    if (studentFilter.trim()) f.student = studentFilter.trim();
    return f;
  }, [typeFilter, roomFilter, studentFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, e, r, ru] = await Promise.all([
        deviceAccessApi.analytics(),
        deviceAccessApi.events(filters),
        deviceAccessApi.listRequests(),
        deviceAccessApi.rules(),
      ]);
      setAnalytics(a);
      setEvents(e.events);
      setRequests(r);
      setRules(ru);
    } catch (err: any) {
      setError(err?.message?.includes("HTTP 404") ? "The device-access service isn't running on this deployment (it needs the Node server)." : err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    const offA = realtimeSocket.on("DEVICE_ACCESS_REQUEST_CREATED", load);
    const offB = realtimeSocket.on("DEVICE_ACCESS_REQUEST_DECIDED", load);
    const poll = setInterval(load, 15000);
    return () => {
      offA();
      offB();
      clearInterval(poll);
    };
  }, [load]);

  const toggleRule = async (rule: DevicePolicyRule, patch: Partial<DevicePolicyRule>) => {
    try {
      const updated = await deviceAccessApi.updateRule(rule.id, patch, actorFromUser(authenticatedUser));
      setRules((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err?.message || "Could not update rule");
    }
  };

  const t = analytics?.totals;
  const approvalRate = t && t.approved + t.denied > 0 ? Math.round((t.approved / (t.approved + t.denied)) * 100) : null;
  const kpis = [
    { label: "Join attempts", value: t?.joinAttempts ?? "–" },
    { label: "Blocked", value: t?.blocked ?? "–", tone: "text-rose-300" },
    { label: "Pending requests", value: t?.pending ?? "–", tone: "text-amber-300" },
    { label: "Approval rate", value: approvalRate == null ? "–" : `${approvalRate}%` },
    { label: "Median response", value: t?.medianDecisionSeconds == null ? "–" : `${t.medianDecisionSeconds}s` },
    { label: "Device mismatches", value: t?.deviceMismatches ?? "–", tone: t?.deviceMismatches ? "text-amber-300" : undefined },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-100 text-sm px-4 py-3 flex gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {analytics && !analytics.persisted && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm px-4 py-3">
          Audit log persistence is unavailable on this server: events are kept in memory only.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-white/10 bg-slate-900/80 p-3 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">{k.label}</div>
            <div className={`mt-1 text-2xl font-black tabular-nums ${k.tone || "text-white"}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Breakdown by device */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
            <div className="text-sm font-semibold text-white mb-3">Join outcomes by device</div>
            <div className="space-y-2.5">
              {ALL_DEVICE_TYPES.map((d) => {
                const row = analytics.byDevice[d] || { allowed: 0, blocked: 0, approved: 0 };
                const total = row.allowed + row.blocked + row.approved || 1;
                const Icon = DEVICE_ICONS[d];
                return (
                  <div key={d} className="flex items-center gap-3 text-xs">
                    <span className="w-20 flex items-center gap-1.5 text-slate-300 shrink-0">
                      <Icon className="w-3.5 h-3.5" /> {DEVICE_TYPE_LABELS[d]}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden flex">
                      <span className="bg-emerald-500" style={{ width: `${(row.allowed / total) * 100}%` }} />
                      <span className="bg-sky-400" style={{ width: `${(row.approved / total) * 100}%` }} />
                      <span className="bg-rose-500" style={{ width: `${(row.blocked / total) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right tabular-nums text-slate-400 shrink-0">
                      {row.allowed}/{row.approved}/{row.blocked}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Allowed</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" /> Allowed by approval</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Blocked</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 min-w-0">
            <div className="text-sm font-semibold text-white mb-3">Rooms with the most blocks</div>
            {Object.keys(analytics.byRoom).length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">No blocked joins yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-400">
                    <tr className="text-left">
                      <th className="font-medium py-1.5 pr-3">Room</th>
                      <th className="font-medium py-1.5 px-2 text-right">Blocked</th>
                      <th className="font-medium py-1.5 px-2 text-right">Requests</th>
                      <th className="font-medium py-1.5 pl-2 text-right">Approved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(analytics.byRoom)
                      .sort((a, b) => b[1].blocked - a[1].blocked)
                      .slice(0, 6)
                      .map(([room, v]) => (
                        <tr key={room}>
                          <td className="py-1.5 pr-3 font-mono text-slate-200 truncate max-w-[180px]">{room}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-rose-300">{v.blocked}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-amber-200">{v.requests}</td>
                          <td className="py-1.5 pl-2 text-right tabular-nums text-emerald-300">{v.approved}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-sm" role="tablist">
          {([
            ["log", "Audit log"],
            ["requests", `Requests (${requests.length})`],
            ["rules", "Rules"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={section === k}
              onClick={() => setSection(k)}
              className={`px-3 h-9 rounded-lg font-medium transition-colors ${section === k ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost min-h-9 h-9 px-3" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <a href={deviceAccessApi.eventsCsvUrl(filters)} className="btn-primary min-h-9 h-9 px-3" download>
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
          </a>
        </div>
      </div>

      {section === "log" && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden">
          <div className="p-3 border-b border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-lg bg-slate-950 border border-white/10 px-3 text-sm text-slate-200">
              <option value="">All events</option>
              <option value="join_blocked">Blocked joins</option>
              <option value="join_allowed,join_allowed_by_approval">Successful joins</option>
              <option value="request_created,request_approved,request_denied,request_cancelled,request_expired">Requests & decisions</option>
              <option value="link_generated,policy_set,rule_updated">Policy & link changes</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} placeholder="Student code / email" className="w-full h-10 rounded-lg bg-slate-950 border border-white/10 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500" />
            </div>
            <input value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} placeholder="Exact room slug" className="h-10 rounded-lg bg-slate-950 border border-white/10 px-3 text-sm text-slate-200 placeholder-slate-500" />
          </div>
          {events.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No events match these filters</div>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[560px] overflow-y-auto">
              {events.map((e) => {
                const meta = EVENT_LABELS[e.type] || { label: e.type, tone: "text-slate-300 bg-white/5 border-white/10" };
                const dev = e.device;
                const DevIcon = dev ? DEVICE_ICONS[(dev.effectiveDeviceType || dev.deviceType) as string] || Monitor : null;
                return (
                  <li key={e.id} className="px-3 sm:px-4 py-3 flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 text-xs">
                    <span className="text-slate-500 tabular-nums md:w-36 shrink-0">{fmtTime(e.at)}</span>
                    <span className={`self-start md:self-auto shrink-0 px-2 py-0.5 rounded-md border font-semibold ${meta.tone}`}>{meta.label}</span>
                    <div className="min-w-0 flex-1 text-slate-300">
                      <span className="text-white font-medium">{e.actor?.name || "System"}</span>
                      {e.actor?.role && <span className="text-slate-500"> ({e.actor.role})</span>}
                      {e.subject && <span> → {e.subject.name}</span>}
                      {e.roomSlug && <span className="text-slate-500"> · <span className="font-mono">{e.roomSlug}</span></span>}
                      {e.details && <div className="text-slate-400 mt-0.5 break-words">{e.details}</div>}
                    </div>
                    {dev && DevIcon && (
                      <span className="flex items-center gap-1.5 text-slate-400 md:w-64 md:justify-end min-w-0">
                        <DevIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{dev.osName} · {dev.browserName} · {dev.screenWidth}×{dev.screenHeight}</span>
                        {dev.integrity === "mismatch" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {section === "requests" && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden">
          {requests.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No device requests yet</div>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[560px] overflow-y-auto">
              {requests.map((r) => {
                const StatusIcon = r.status === "approved" ? CheckCircle2 : r.status === "denied" ? XCircle : Clock;
                const tone = r.status === "approved" ? "text-emerald-300" : r.status === "denied" ? "text-rose-300" : r.status === "pending" ? "text-amber-300" : "text-slate-400";
                const waited = r.decidedAt ? Math.round((Date.parse(r.decidedAt) - Date.parse(r.requestedAt)) / 1000) : null;
                return (
                  <li key={r.id} className="px-3 sm:px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className={`flex items-center gap-1.5 font-semibold capitalize sm:w-24 shrink-0 ${tone}`}>
                      <StatusIcon className="w-4 h-4" /> {r.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white">
                        {r.student.name} <span className="text-slate-500">· {r.student.studentCode || r.student.email}</span>
                      </div>
                      <div className="text-slate-400 break-words">“{r.studentMessage}” · <span className="font-mono">{r.roomSlug}</span></div>
                    </div>
                    <div className="text-slate-400 sm:text-right sm:w-56 shrink-0">
                      <div>{DEVICE_TYPE_LABELS[(r.device.effectiveDeviceType || r.device.deviceType) as PolicyDeviceType]} · {r.device.osName}</div>
                      <div>
                        {r.decidedBy ? `${r.decidedBy.name}${waited != null ? ` · ${waited}s` : ""}` : fmtTime(r.requestedAt)}
                        {r.scope && ` · ${r.scope === "this_device" ? "device" : "session"}`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {section === "rules" && (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-400">
            Rules run top to bottom; the first match decides which devices may join. Links set to "Auto" follow these rules. Unregistered rooms are treated as paid classes.
            {!isAdmin && " Only admins can change rules."}
          </p>
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{rule.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">#{rule.priority}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">{describeAllowedDevices(rule.allowedDeviceTypes)}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                    Approvers: {rule.approverRoles.join(", ")}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                    {rule.allowRequestOverride ? "Requests allowed" : "No exceptions"}
                  </span>
                  {rule.requireDesktopApp && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">Desktop app only</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <label className={`flex items-center gap-2 text-xs ${isAdmin ? "cursor-pointer" : "opacity-60"}`} title="Only the 21K School desktop app (blocks screen recording) may join">
                  <input type="checkbox" disabled={!isAdmin} checked={Boolean(rule.requireDesktopApp)} onChange={(e) => toggleRule(rule, { requireDesktopApp: e.target.checked })} className="accent-blue-500" />
                  Desktop app only
                </label>
                <label className={`flex items-center gap-2 text-xs ${isAdmin ? "cursor-pointer" : "opacity-60"}`}>
                  <input type="checkbox" disabled={!isAdmin} checked={rule.allowRequestOverride} onChange={(e) => toggleRule(rule, { allowRequestOverride: e.target.checked })} className="accent-blue-500" />
                  Allow requests
                </label>
                <button
                  disabled={!isAdmin}
                  onClick={() => toggleRule(rule, { enabled: !rule.enabled })}
                  role="switch"
                  aria-checked={rule.enabled}
                  aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors disabled:opacity-60 ${rule.enabled ? "bg-emerald-500" : "bg-white/15"}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
