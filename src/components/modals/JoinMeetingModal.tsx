import React, { useState } from "react";
import {
  Video,
  X,
  ExternalLink,
  ShieldCheck,
  Globe,
  Radio,
  Sparkles,
  Check,
  Laptop,
  ArrowRight,
  Link2,
} from "lucide-react";
import { parseProductionMeetingLink, getAppOrigin } from "../../services/domainService";
import { useClassroom } from "../../context/ClassroomContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinMeetingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { joinProductionMeetingUrl } = useClassroom();
  const [meetingInput, setMeetingInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const currentOrigin = getAppOrigin();
  const parsedPreview = meetingInput.trim() ? parseProductionMeetingLink(meetingInput) : null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingInput.trim()) {
      setErrorMsg("Please enter or paste a valid production meeting link or room code.");
      return;
    }

    try {
      joinProductionMeetingUrl(meetingInput.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to parse meeting link.");
    }
  };

  const handleApplyPreset = (presetUrl: string) => {
    setMeetingInput(presetUrl);
    setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92dvh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Join Production Meeting</h2>
              <p className="text-xs text-slate-400">
                Auto-resolves dynamically · Zero fixed domains
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleJoin} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Paste Real Production Meeting Link or Room Code:
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="e.g. meet.google.com/abc-defg-hij, Zoom, Jitsi, or room slug"
                value={meetingInput}
                onChange={(e) => {
                  setMeetingInput(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-all"
              />
            </div>
            {errorMsg && <p className="text-xs text-rose-400 mt-1 font-medium">{errorMsg}</p>}
          </div>

          {/* Real-time Dynamic Link Inspection Card */}
          {parsedPreview && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-blue-500/30 space-y-2 animate-fadeIn text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Detected Meeting Provider</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  {parsedPreview.provider}
                </span>
              </div>

              <div className="text-slate-200 font-medium">
                <span className="text-slate-400">Display Title: </span>
                <span className="text-white font-semibold">{parsedPreview.displayTitle}</span>
              </div>

              <div className="text-[11px] font-mono text-cyan-300 truncate">
                <span className="text-slate-400 font-sans">Resolved Target: </span>
                {parsedPreview.normalizedUrl}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[11px] text-slate-400">
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Real-time Speech AI Active
                </span>
                <span>•</span>
                <span className="text-slate-300">
                  {parsedPreview.canEmbed ? "Direct In-App Stream" : "Companion Sync Mode"}
                </span>
              </div>
            </div>
          )}

          {/* Quick Real Production Link Presets for Testing */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Or Try A Real Link Format Preset:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset("https://meet.jit.si/21k-quantum-lab-physics")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-sky-400 group-hover:text-sky-300">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Jitsi WebRTC Mesh</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  meet.jit.si/21k-quantum-lab-physics
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("https://meet.google.com/dronacharya-live-gr10")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 group-hover:text-emerald-300">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Google Meet</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  meet.google.com/dronacharya-live-gr10
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("https://zoom.us/j/9820123456")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-blue-400 group-hover:text-blue-300">
                  <Video className="w-3.5 h-3.5" />
                  <span>Zoom Meeting</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  zoom.us/j/9820123456
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("in-21kos-gr10-bc-phy-vance")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-400 group-hover:text-amber-300">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Classroom Slug</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  in-21kos-gr10-bc-phy-vance
                </div>
              </button>
            </div>
          </div>

          {/* Active Runtime Domain Notice */}
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Dynamic App Domain:</span>
            <span className="font-mono text-slate-200 font-bold">{currentOrigin}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <span>Connect & Launch Call</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
