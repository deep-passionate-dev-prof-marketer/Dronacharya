import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

interface SecurityEvent {
  id: string;
  at: string;
  type: string;
  roomSlug?: string;
  user: { id: string; name: string; role: string; studentCode?: string };
  session: string;
  client: string;
  view?: string;
  detail?: string;
}

const LABEL: Record<string, { text: string; tone: string }> = {
  printscreen_key: { text: "Screenshot key", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
  snip_shortcut: { text: "Snip / screenshot shortcut", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
  screen_capture_api: { text: "Screen capture", tone: "bg-rose-500/15 text-rose-200 border-rose-500/30" },
  desktop_capture_blocked: { text: "Recording blocked (app)", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" },
  print_attempt: { text: "Print attempt", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  save_attempt: { text: "Save attempt", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  devtools_shortcut: { text: "Developer tools shortcut", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" },
  devtools_open: { text: "Developer tools open (heuristic)", tone: "bg-white/5 text-slate-300 border-white/10" },
  tab_hidden: { text: "Switched away", tone: "bg-white/5 text-slate-300 border-white/10" },
  window_blur: { text: "Window lost focus", tone: "bg-white/5 text-slate-300 border-white/10" },
  context_menu: { text: "Right-click", tone: "bg-white/5 text-slate-300 border-white/10" },
};

/** Auditor view of content-protection events (capture attempts, print, devtools, tab switches). */
export const SecurityEventsPanel: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hideMinor, setHideMinor] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/security/events?days=7")
      .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(b))))
      .then((b) => {
        setEvents(b.events || []);
        setError(null);
      })
      .catch((e) => setError(e?.error || "Couldn't load security events"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const minor = new Set(["tab_hidden", "window_blur", "context_menu", "devtools_open"]);
  const shown = useMemo(() => (hideMinor ? events.filter((e) => !minor.has(e.type)) : events), [events, hideMinor]);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-300" />
          <div>
            <h2 className="text-sm font-bold text-white">Content protection events</h2>
            <p className="text-xs text-slate-400">Last 7 days · each row carries the watermark id shown on that person's screen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <input type="checkbox" checked={hideMinor} onChange={(e) => setHideMinor(e.target.checked)} className="accent-blue-500" /> Capture attempts only
          </label>
          <button onClick={load} className="icon-btn" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {error && <p className="p-4 text-sm text-rose-300">{error}</p>}
      {!error && shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No events</p>}
      <ul className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
        {shown.map((e) => {
          const meta = LABEL[e.type] || { text: e.type, tone: "bg-white/5 text-slate-300 border-white/10" };
          return (
            <li key={e.id} className="px-3 sm:px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
              <span className="text-slate-500 tabular-nums sm:w-36 shrink-0">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className={`self-start sm:self-auto shrink-0 px-2 py-0.5 rounded-md border font-semibold ${meta.tone}`}>{meta.text}</span>
              <span className="min-w-0 flex-1 text-slate-300">
                <span className="text-white font-medium">{e.user.name}</span> <span className="text-slate-500">({e.user.role})</span>
                <span className="font-mono text-slate-400"> · {e.user.studentCode || e.user.id} · {e.session}</span>
                {e.roomSlug && <span className="text-slate-500"> · {e.roomSlug}</span>}
                {e.detail && <span className="text-slate-500"> · {e.detail}</span>}
              </span>
              <span className="text-slate-500 shrink-0">{e.client}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
