import React, { useState } from "react";
import {
  Video,
  X,
  ShieldCheck,
  Radio,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  Link2,
} from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinMeetingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { joinProductionMeetingUrl, roomId, roomLink } = useClassroom();
  const [roomInput, setRoomInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) {
      setErrorMsg("Please enter a classroom room code or title.");
      return;
    }

    try {
      joinProductionMeetingUrl(roomInput.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to switch classroom.");
    }
  };

  const handleApplyPreset = (code: string) => {
    setRoomInput(code);
    setErrorMsg("");
  };

  const handleCopyCurrentLink = () => {
    const studentUrl = typeof window !== "undefined" ? `${window.location.origin}/?room=${encodeURIComponent(roomId)}&role=student` : roomLink;
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92dvh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Classroom WebRTC Room Switcher</h2>
              <p className="text-xs text-slate-400">
                Active in-house peer mesh · Zero external dependencies
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
          {/* Active Room & Quick Share Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between gap-3">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider">
                Current Active Room
              </span>
              <p className="text-xs font-mono font-semibold text-white truncate">
                {roomId}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCurrentLink}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied!" : "Copy Student Link"}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Enter Room Code to Switch or Join:
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="e.g. physics-honors-10a, chemistry-lab, or custom code"
                value={roomInput}
                onChange={(e) => {
                  setRoomInput(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-cyan-300 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Link2 className="w-4 h-4" />
              </div>
            </div>
            {errorMsg && <p className="text-xs text-rose-400 mt-1 font-medium">{errorMsg}</p>}
          </div>

          {/* Quick Classroom Room Code Presets */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select A Standard 21K Classroom Mesh:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset("gr10-physics-honors")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="font-bold text-cyan-400 group-hover:text-cyan-300">
                  Grade 10 · Physics Lab
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  gr10-physics-honors
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("gr11-ap-compsci")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="font-bold text-blue-400 group-hover:text-blue-300">
                  Grade 11 · AP CompSci
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  gr11-ap-compsci
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("gr9-applied-math")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="font-bold text-amber-400 group-hover:text-amber-300">
                  Grade 9 · Applied Math
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  gr9-applied-math
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset("sales-breakout-101")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group cursor-pointer"
              >
                <div className="font-bold text-purple-400 group-hover:text-purple-300">
                  1:1 Admissions Breakout
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                  sales-breakout-101
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted WebRTC P2P Mesh · Real-time bidirectional video and audio enabled.</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!roomInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-40"
            >
              <span>Connect Room (WebRTC)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
