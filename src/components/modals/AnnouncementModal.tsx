import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { X, Megaphone, Bell, Send, AlertCircle, Info, CheckCircle2 } from "lucide-react";

export const AnnouncementModal: React.FC = () => {
  const {
    isAnnouncementModalOpen,
    setIsAnnouncementModalOpen,
    sendAnnouncement,
    announcements,
  } = useClassroom();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"urgent" | "info" | "normal">("info");
  const [toastSent, setToastSent] = useState(false);

  if (!isAnnouncementModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    sendAnnouncement(title, message, priority);
    setTitle("");
    setMessage("");
    setToastSent(true);
    setTimeout(() => {
      setToastSent(false);
      setIsAnnouncementModalOpen(false);
    }, 1200);
  };

  const handleQuickPreset = (presetTitle: string, presetMsg: string, p: "urgent" | "info" | "normal") => {
    setTitle(presetTitle);
    setMessage(presetMsg);
    setPriority(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="animate-sheetUp sm:animate-fadeIn max-h-[94dvh] overflow-y-auto w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Broadcast Real-Time Classroom Announcement</h2>
          </div>
          <button
            onClick={() => setIsAnnouncementModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {toastSent ? (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Announcement pushed to all participants & breakout rooms!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
            {/* Quick Presets */}
            <div>
              <span className="text-2xs text-slate-400 block mb-1">Quick Presets</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPreset("Breakout Session Wrap-Up", "All breakout rooms will auto-close in 3 minutes. Return to main stage.", "urgent")
                  }
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-2xs text-slate-300 hover:text-white"
                >
                  Wrap-Up in 3m
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPreset("3D STEM Lab Synchronized", "Please open the 3D AR Lab tab to view the electron probability density lobes.", "info")
                  }
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-2xs text-slate-300 hover:text-white"
                >
                  Open 3D Lab
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPreset("Live Poll Challenge Activated", "A new quiz on quantum logic gates is now active in your workspace.", "normal")
                  }
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-2xs text-slate-300 hover:text-white"
                >
                  Poll Active
                </button>
              </div>
            </div>

            <div>
              <label className="text-2xs text-slate-400 block mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Lab Exercise Commencing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-2xs text-slate-400 block mb-1">Message</label>
              <textarea
                rows={3}
                placeholder="Type real-time announcement to broadcast to all students..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                required
              />
            </div>

            <div>
              <label className="text-2xs text-slate-400 block mb-1">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "urgent", label: "Urgent Flash", color: "text-rose-400" },
                  { id: "info", label: "Informational", color: "text-indigo-400" },
                  { id: "normal", label: "Standard", color: "text-slate-300" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as any)}
                    className={`py-1.5 rounded border text-xs font-medium transition-colors ${
                      priority === p.id
                        ? "bg-slate-800 border-indigo-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className={p.color}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast Flash Update</span>
              </button>
            </div>
          </form>
        )}

        {/* Recent Announcements Feed */}
        <div className="border-t border-slate-800 pt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
          <span className="text-2xs font-semibold text-slate-400">Past Broadcast History</span>
          {announcements.map((a) => (
            <div
              key={a.id}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between text-2xs">
                <span className="font-semibold text-white">{a.title}</span>
                <span className="font-mono text-slate-400">{a.timestamp}</span>
              </div>
              <p className="text-slate-300 text-2xs">{a.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
