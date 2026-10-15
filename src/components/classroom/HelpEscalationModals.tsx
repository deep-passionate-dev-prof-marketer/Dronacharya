import React, { useEffect, useState } from "react";
import { HelpCircle, LifeBuoy, Loader2, Send, X } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { api } from "../../services/apiClient";
import { captureDeviceSnapshot } from "../../services/deviceAccessClient";
import { toast } from "../ui/Feedback";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "audio", label: "I can't hear, or nobody hears me" },
  { value: "video", label: "Camera or screen problem" },
  { value: "connection", label: "Keeps freezing or disconnecting" },
  { value: "access", label: "Can't get into the class or a page" },
  { value: "other", label: "Something else" },
];

const Sheet: React.FC<{ title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({ title, icon, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 animate-fadeIn" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheetUp sm:animate-fadeIn space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            {icon} {title}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/**
 * Help from class: learners can ask their parent (a notification and email to every linked parent),
 * and anyone can ask the school for tech help (a support request admins answer).
 */
export const HelpEscalationModals: React.FC = () => {
  const { isParentHelpModalOpen, setIsParentHelpModalOpen, isCxHelpModalOpen, setIsCxHelpModalOpen, roomId, transportState } = useClassroom();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("audio");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessage("");
    setError(null);
  }, [isParentHelpModalOpen, isCxHelpModalOpen]);

  const askParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await api<{ sentTo: string[]; message?: string }>("POST", "/api/help/ask-parent", { roomSlug: roomId, message });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (!r.data.sentTo.length) return setError(r.data.message || "There's no parent linked to your account yet.");
    toast(`Sent to ${r.data.sentTo.join(" and ")}`);
    setIsParentHelpModalOpen(false);
  };

  const askTech = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const device = await captureDeviceSnapshot().catch(() => null);
    const r = await api("POST", "/api/help/tickets", {
      roomSlug: roomId,
      category,
      message: message.trim() || CATEGORIES.find((c) => c.value === category)?.label,
      device: device ? { ...device, videoMode: transportState.mode, connection: transportState.status } : undefined,
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast("Sent. The school's support team will reply here and by email.");
    setIsCxHelpModalOpen(false);
  };

  return (
    <>
      {isParentHelpModalOpen && (
        <Sheet title="Ask my parent for help" icon={<HelpCircle className="w-4 h-4 text-blue-300" />} onClose={() => setIsParentHelpModalOpen(false)}>
          <form onSubmit={askParent} className="space-y-3">
            <p className="text-sm text-slate-300">Your parent gets a message saying you'd like help with this class (and an email, if the school has their address).</p>
            <label htmlFor="ask-parent-msg" className="block text-xs font-semibold text-slate-300">
              Message (optional)
            </label>
            <textarea
              id="ask-parent-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. I can't log into the worksheet"
              className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2 text-sm text-white placeholder-slate-500"
            />
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to my parent
            </button>
          </form>
        </Sheet>
      )}

      {isCxHelpModalOpen && (
        <Sheet title="Tech help" icon={<LifeBuoy className="w-4 h-4 text-rose-300" />} onClose={() => setIsCxHelpModalOpen(false)}>
          <form onSubmit={askTech} className="space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold text-slate-300 mb-1">What's wrong?</legend>
              {CATEGORIES.map((c) => (
                <label key={c.value} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${category === c.value ? "border-blue-500/60 bg-blue-500/10 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
                  <input type="radio" name="tech-category" value={c.value} checked={category === c.value} onChange={() => setCategory(c.value)} className="accent-blue-500" />
                  {c.label}
                </label>
              ))}
            </fieldset>
            <label htmlFor="tech-msg" className="block text-xs font-semibold text-slate-300">
              Details (optional)
            </label>
            <textarea
              id="tech-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="What happened, and what you tried"
              className="w-full rounded-xl bg-slate-950 border border-white/15 focus:border-blue-500 outline-none px-3 py-2 text-sm text-white placeholder-slate-500"
            />
            <p className="text-2xs text-slate-400">We include your device type, browser and connection state so support can help faster.</p>
            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to support
            </button>
          </form>
        </Sheet>
      )}
    </>
  );
};
