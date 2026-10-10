import React from "react";
import { Download, ShieldAlert, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { DeviceAccessControlPanel } from "../access/DeviceAccessControlPanel";
import { SecurityEventsPanel } from "../protection/SecurityEventsPanel";
import { BarList } from "../charts";
import { Card, CardHeader, EmptyState, ErrorState, Page, PageHeader, Skeleton, Tabs } from "../ui";
import { useApi } from "../analytics/analyticsClient";

interface DeviceAnalytics {
  totals: {
    joinAttempts: number;
    blocked: number;
    allowedByApproval: number;
    deviceMismatches: number;
    requests: number;
    pending: number;
    approved: number;
    denied: number;
    medianDecisionSeconds: number | null;
  };
  byDevice: Record<string, { allowed: number; blocked: number; approved: number }>;
  byRoom: Record<string, { blocked: number; requests: number; approved: number; denied: number }>;
  byApprover: Record<string, { approved: number; denied: number }>;
}

type Tab = "rules" | "report" | "security";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Device access: which devices may join classes (rules and requests), what actually happened at
 * the door (the access log), and capture attempts. Every number comes from the access log.
 */
export const DeviceAuditCenter: React.FC = () => {
  const { currentRole } = useClassroom();
  const canSeeSecurity = currentRole === "admin" || currentRole === "auditor";
  const [tab, setTab] = React.useState<Tab>("rules");
  const items = [
    { id: "rules" as const, label: "Rules & requests", icon: SlidersHorizontal },
    { id: "report" as const, label: "Access report", icon: ShieldCheck },
    ...(canSeeSecurity ? [{ id: "security" as const, label: "Capture attempts", icon: ShieldAlert }] : []),
  ];
  return (
    <Page wide>
      <PageHeader title="Device access" description="Decide which devices can join each class, handle requests from learners on other devices, and see what happened at the door." />
      <Tabs label="Device access sections" items={items} value={tab} onChange={setTab} idPrefix="device" />
      <div id="device-panel" role="tabpanel" aria-labelledby={`device-${tab}`}>
        {tab === "rules" && <DeviceAccessControlPanel />}
        {tab === "report" && <AccessReport />}
        {tab === "security" && canSeeSecurity && <SecurityEventsPanel />}
      </div>
    </Page>
  );
};

const AccessReport: React.FC = () => {
  const { data, error, reload } = useApi<DeviceAnalytics>("/api/device-access/analytics");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data)
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  const t = data.totals;
  const tiles = [
    { label: "Join attempts", value: t.joinAttempts, hint: `${t.blocked} blocked at the door` },
    { label: "Allowed after a request", value: t.allowedByApproval, hint: `${t.approved} approved · ${t.denied} denied` },
    { label: "Waiting for a decision", value: t.pending, hint: t.medianDecisionSeconds != null ? `Decisions take ${t.medianDecisionSeconds < 120 ? `${t.medianDecisionSeconds} s` : `${Math.round(t.medianDecisionSeconds / 60)} min`} (median)` : "No decisions yet" },
    { label: "Device didn't match its claim", value: t.deviceMismatches, hint: "Reported type differs from what the server detected" },
  ];
  const devices = Object.entries(data.byDevice).sort((a, b) => b[1].allowed + b[1].blocked + b[1].approved - (a[1].allowed + a[1].blocked + a[1].approved));
  const rooms = Object.entries(data.byRoom).sort((a, b) => b[1].blocked + b[1].requests - (a[1].blocked + a[1].requests)).slice(0, 15);
  const approvers = Object.entries(data.byApprover).sort((a, b) => b[1].approved + b[1].denied - (a[1].approved + a[1].denied));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((x) => (
          <Card key={x.label} className="!p-4">
            <h3 className="text-xs font-semibold text-ink-3">{x.label}</h3>
            <div className="mt-1 text-2xl font-bold text-ink tabular-nums">{x.value.toLocaleString()}</div>
            <div className="text-2xs text-ink-3">{x.hint}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Joins by device"
            description="Share of join attempts that were blocked, per device type."
            actions={
              <a href="/api/device-access/events.csv" download className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg border border-line-strong bg-white/5 hover:bg-white/10 text-xs font-semibold text-ink">
                <Download className="w-3.5 h-3.5" /> Access log CSV
              </a>
            }
          />
          {devices.length ? (
            <BarList
              ariaLabel="Blocked share by device"
              format="pct"
              max={1}
              rows={devices.map(([d, v]) => {
                const n = v.allowed + v.blocked + v.approved;
                return { key: d, label: cap(d), value: n ? v.blocked / n : null, meta: `${n} joins · ${v.blocked} blocked` };
              })}
            />
          ) : (
            <EmptyState compact title="No joins recorded yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Rooms with the most turned-away devices" description="Blocked joins and device requests per room." />
          {rooms.length ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <caption className="sr-only">Blocked joins and requests by room</caption>
                <thead>
                  <tr className="text-left text-2xs uppercase tracking-wide text-ink-3">
                    <th scope="col" className="px-3 py-2 font-semibold">Room</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-right">Blocked</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-right">Requests</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-right">Approved</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-right">Denied</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(([room, v]) => (
                    <tr key={room} className="border-t border-line">
                      <td className="px-3 py-2 font-mono text-xs text-ink-2 max-w-[14rem] truncate">{room}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{v.blocked}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{v.requests}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{v.approved}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink">{v.denied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState compact title="No device was turned away">
              Every join so far came from an allowed device.
            </EmptyState>
          )}
        </Card>
        {approvers.length > 0 && (
          <Card className="xl:col-span-2">
            <CardHeader title="Who decided requests" description="Requests from learners to join on a different device." />
            <BarList
              ariaLabel="Approved share by decision maker"
              format="pct"
              max={1}
              rows={approvers.map(([name, v]) => ({ key: name, label: name, value: v.approved + v.denied ? v.approved / (v.approved + v.denied) : null, meta: `${v.approved} approved · ${v.denied} denied` }))}
            />
          </Card>
        )}
      </div>
    </div>
  );
};
