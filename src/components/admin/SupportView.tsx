import React from "react";
import { CheckCircle2, LifeBuoy, Send } from "lucide-react";
import { Badge, Button, Card, DataTable, Drawer, EmptyState, ErrorState, Page, PageHeader, SegmentedControl, Skeleton } from "../ui";
import type { Column, Tone } from "../ui";
import { api, useResource } from "../../services/apiClient";
import { toast } from "../ui/Feedback";

type Status = "open" | "answered" | "closed";
interface Ticket {
  id: string;
  category: string;
  message: string;
  status: Status;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  roomSlug: string | null;
  classTitle: string | null;
  device: Record<string, string | undefined> | null;
  from: { id: string; name: string; role: string; email?: string };
}

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  answered: { label: "Answered", tone: "accent" },
  closed: { label: "Closed", tone: "neutral" },
};
const CATEGORY: Record<string, string> = { audio: "Audio", video: "Camera / screen", connection: "Connection", access: "Access", other: "Other" };
const ROLE: Record<string, string> = { student: "Learner", instructor: "Teacher", sales_rep: "Counsellor", admin: "Admin", auditor: "Auditor", parent: "Parent" };
const when = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Help requests (admins): tech-help requests from classes; answer them and the person is told (bell and email). */
export const SupportView: React.FC = () => {
  const [status, setStatus] = React.useState<"" | Status>("open");
  const list = useResource<{ tickets: Ticket[] }>(`/api/help/tickets${status ? `?status=${status}` : ""}`);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const current = list.data?.tickets.find((t) => t.id === openId) || null;

  const columns: Column<Ticket>[] = [
    {
      key: "from",
      header: "From",
      sticky: true,
      sortValue: (t) => t.from.name,
      render: (t) => (
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate">{t.from.name}</div>
          <div className="text-2xs text-ink-3">{ROLE[t.from.role] || t.from.role}</div>
        </div>
      ),
    },
    { key: "category", header: "Problem", sortValue: (t) => t.category, render: (t) => <span className="text-sm text-ink-2 whitespace-nowrap">{CATEGORY[t.category] || t.category}</span> },
    { key: "message", header: "Message", render: (t) => <span className="text-sm text-ink-2 line-clamp-2 max-w-md">{t.message}</span> },
    { key: "class", header: "Class", render: (t) => <span className="text-xs text-ink-3">{t.classTitle || "—"}</span> },
    { key: "when", header: "Sent", sortValue: (t) => t.createdAt, render: (t) => <span className="text-xs text-ink-3 whitespace-nowrap">{when(t.createdAt)}</span> },
    { key: "status", header: "Status", sortValue: (t) => t.status, render: (t) => <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge> },
  ];

  return (
    <Page wide>
      <PageHeader
        title="Help requests"
        description="Tech help sent from classes. Your answer reaches the person in their notifications and by email."
        actions={
          <SegmentedControl
            label="Show"
            value={status}
            onChange={setStatus}
            options={[
              { value: "open", label: "Open" },
              { value: "answered", label: "Answered" },
              { value: "closed", label: "Closed" },
              { value: "", label: "All" },
            ]}
          />
        }
      />
      <Card padded>
        {list.error && !list.data ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            rows={list.data.tickets}
            columns={columns}
            rowKey={(t) => t.id}
            onRowClick={(t) => setOpenId(t.id)}
            rowLabel={(t) => `Open request from ${t.from.name}`}
            initialSort={{ key: "when", dir: "desc" }}
            caption="Help requests"
            empty={
              <EmptyState icon={LifeBuoy} title={status === "open" ? "No open requests" : "Nothing here"}>
                {status === "open" ? "When someone asks for tech help in class, it appears here." : "Try another filter."}
              </EmptyState>
            }
          />
        )}
      </Card>
      {current && <TicketDrawer ticket={current} onClose={() => setOpenId(null)} onChanged={list.reload} />}
    </Page>
  );
};

const TicketDrawer: React.FC<{ ticket: Ticket; onClose: () => void; onChanged: () => void }> = ({ ticket, onClose, onChanged }) => {
  const [answer, setAnswer] = React.useState(ticket.answer || "");
  const [busy, setBusy] = React.useState<null | "send" | "close" | "reopen">(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setAnswer(ticket.answer || "");
    setError(null);
  }, [ticket.id]);
  const send = async (close: boolean) => {
    setBusy(close ? "close" : "send");
    setError(null);
    const r = await api("POST", `/api/help/tickets/${ticket.id}/answer`, { answer, close });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    toast(close ? "Answered and closed" : "Answer sent");
    onChanged();
    onClose();
  };
  const setStatus = async (status: Status) => {
    setBusy(status === "closed" ? "close" : "reopen");
    const r = await api("POST", `/api/help/tickets/${ticket.id}/status`, { status });
    setBusy(null);
    if (!r.ok) return toast(r.error, "critical");
    onChanged();
    onClose();
  };
  const device = ticket.device ? Object.entries(ticket.device).filter(([, v]) => v) : [];
  return (
    <Drawer
      open
      onClose={onClose}
      title={`${CATEGORY[ticket.category] || ticket.category} · ${ticket.from.name}`}
      description={`${ROLE[ticket.from.role] || ticket.from.role}${ticket.from.email ? ` · ${ticket.from.email}` : ""} · ${when(ticket.createdAt)}`}
      footer={
        <div className="flex flex-wrap justify-between gap-2 w-full">
          {ticket.status === "closed" ? (
            <Button variant="ghost" loading={busy === "reopen"} onClick={() => setStatus("open")}>
              Reopen
            </Button>
          ) : (
            <Button variant="ghost" icon={CheckCircle2} loading={busy === "close" && !answer} onClick={() => setStatus("closed")}>
              Close without answering
            </Button>
          )}
          <div className="flex gap-2">
            <Button loading={busy === "send"} disabled={!answer.trim()} onClick={() => send(false)} icon={Send}>
              Send answer
            </Button>
            <Button variant="primary" loading={busy === "close" && Boolean(answer)} disabled={!answer.trim()} onClick={() => send(true)}>
              Send and close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1.5">Their message</h3>
          <p className="text-sm text-ink whitespace-pre-wrap break-words rounded-xl border border-line bg-white/[0.03] p-3">{ticket.message}</p>
          {ticket.classTitle && <p className="text-xs text-ink-3 mt-1.5">In class: {ticket.classTitle}</p>}
        </section>
        {device.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-1.5">Device</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {device.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-ink-3">{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</dt>
                  <dd className="text-ink-2 break-words">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )}
        <section>
          <label htmlFor="ticket-answer" className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
            {ticket.answer ? "Your answer (edit to send again)" : "Answer"}
          </label>
          <textarea
            id="ticket-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="e.g. Please refresh the page and allow the microphone when your browser asks."
            className="mt-1.5 w-full rounded-xl bg-surface-sunken border border-line-strong focus:border-accent outline-none px-3 py-2.5 text-sm text-ink placeholder:text-ink-3"
          />
          {error && (
            <p className="text-sm text-critical mt-1" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </Drawer>
  );
};
