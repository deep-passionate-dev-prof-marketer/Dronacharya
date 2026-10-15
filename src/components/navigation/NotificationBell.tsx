import React from "react";
import { Bell, CheckCheck, HelpCircle, LifeBuoy, MessageSquare } from "lucide-react";
import { Popover } from "../ui";
import { api } from "../../services/apiClient";
import { useClassroom } from "../../context/ClassroomContext";

interface Note {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
}

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  ask_parent: HelpCircle,
  ticket_new: LifeBuoy,
  ticket_reply: MessageSquare,
};

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** The bell: messages for this person (help requests, replies, …). Checks every minute and on focus. */
export const NotificationBell: React.FC = () => {
  const { authenticatedUser, setActiveView } = useClassroom();
  const [data, setData] = React.useState<{ unread: number; notifications: Note[] } | null>(null);
  const load = React.useCallback(async () => {
    const r = await api<{ unread: number; notifications: Note[] }>("GET", "/api/notifications");
    if (r.ok) setData(r.data);
  }, []);
  React.useEffect(() => {
    if (!authenticatedUser) return;
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [authenticatedUser?.id, load]);
  if (!authenticatedUser) return null;

  const unread = data?.unread || 0;
  const markAll = async () => {
    await api("POST", "/api/notifications/read", {});
    load();
  };
  const open = async (n: Note, close: () => void) => {
    if (!n.read) await api("POST", "/api/notifications/read", { ids: [n.id] });
    load();
    const view = n.link ? new URLSearchParams(n.link.split("?")[1] || "").get("view") : null;
    if (view) {
      setActiveView(view as any);
      close();
    }
  };

  return (
    <Popover
      align="end"
      className="w-[min(22rem,calc(100vw-1rem))]"
      trigger={({ open: isOpen, toggle, ref, id }) => (
        <button
          ref={ref}
          onClick={() => {
            toggle();
            if (!isOpen) load();
          }}
          className="icon-btn relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          aria-expanded={isOpen}
          aria-controls={id}
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-2xs leading-4 font-bold text-center" aria-hidden="true">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col max-h-[70dvh]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto p-1.5">
            {!data ? (
              <p className="p-4 text-sm text-ink-3">Loading…</p>
            ) : data.notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-3">You're all caught up.</p>
            ) : (
              data.notifications.map((n) => {
                const Icon = ICON[n.kind] || Bell;
                return (
                  <button key={n.id} onClick={() => open(n, close)} className={`w-full text-left flex gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/5 ${n.read ? "" : "bg-accent/5"}`}>
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${n.read ? "text-ink-3" : "text-accent"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.read ? "text-ink-2" : "text-ink font-semibold"}`}>{n.title}</span>
                      <span className="block text-xs text-ink-3 whitespace-pre-line line-clamp-3">{n.body}</span>
                      <span className="block text-2xs text-ink-3 mt-0.5">{ago(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" aria-label="Unread" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </Popover>
  );
};
