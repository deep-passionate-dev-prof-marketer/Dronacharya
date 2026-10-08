import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  HelpCircle,
  ShieldAlert,
  X,
  Send,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Clock,
  AlertCircle,
} from "lucide-react";

export const HelpEscalationModals: React.FC = () => {
  const {
    isParentHelpModalOpen,
    setIsParentHelpModalOpen,
    isCxHelpModalOpen,
    setIsCxHelpModalOpen,
    askParentHelp,
    askCxHelp,
    participants,
    currentRole,
    activeEscalationToast,
    dismissEscalationToast,
  } = useClassroom();

  const [selectedStudentId, setSelectedStudentId] = useState(participants[1]?.id || "stu-1");
  const [parentReason, setParentReason] = useState("Assistance requested with lab worksheet and audio device setup.");
  const [cxReason, setCxReason] = useState("Learner experiencing high audio jitter and camera packet degradation.");
  const [cxCategory, setCxCategory] = useState("WebRTC Media Diagnostic");

  const students = participants.filter((p) => p.role === "student");

  const handleDispatchParent = (e: React.FormEvent) => {
    e.preventDefault();
    askParentHelp(selectedStudentId, parentReason);
    setIsParentHelpModalOpen(false);
  };

  const handleDispatchCx = (e: React.FormEvent) => {
    e.preventDefault();
    askCxHelp(`[${cxCategory}] ${cxReason}`);
    setIsCxHelpModalOpen(false);
  };

  return (
    <>
      {/* Floating Active Escalation Toast */}
      {activeEscalationToast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-[#001F40] border border-[#00C2E0] shadow-2xl rounded-2xl p-4 text-white select-none animate-slideIn">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${activeEscalationToast.type === "parent_help" ? "bg-cyan-950 text-cyan-300 border border-cyan-800" : "bg-rose-950 text-rose-300 border border-rose-800"}`}>
                {activeEscalationToast.type === "parent_help" ? <HelpCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {activeEscalationToast.type === "parent_help" ? "Parent Escalation Dispatched" : "21K CX Priority Intervention"}
                </h4>
                <p className="text-[11px] text-slate-300">
                  Status: <span className="text-emerald-400 font-mono font-bold capitalize">{activeEscalationToast.status}</span>
                </p>
              </div>
            </div>

            <button
              onClick={dismissEscalationToast}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-200 mt-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            {activeEscalationToast.reason}
          </p>

          {activeEscalationToast.responseNote && (
            <div className="mt-2 text-[11px] text-cyan-300 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{activeEscalationToast.responseNote}</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Modal: Ask for Parent Help */}
      {isParentHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-[#090e17] rounded-2xl border border-[#003872] shadow-2xl overflow-hidden font-sans text-white">
            <div className="p-4 bg-[#001F40] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#003872] text-[#00C2E0]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ask for Parent Help</h3>
                  <p className="text-xs text-slate-300">
                    Dispatches instant SMS & WhatsApp notification to verified guardian
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsParentHelpModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchParent} className="p-5 space-y-4 text-xs">
              {/* Target Student */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Select Learner Requiring Assistance:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00C2E0]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.parentEmail || "guardian@21k.family"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Context Reason */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Classroom Context & Assistance Reason:
                </label>
                <textarea
                  rows={3}
                  value={parentReason}
                  onChange={(e) => setParentReason(e.target.value)}
                  placeholder="Explain why parent presence or support is requested..."
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2E0]"
                  required
                />
              </div>

              {/* Delivery Channels Badge */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp & SMS Gateway</span>
                </span>
                <span className="font-mono text-emerald-400">Instant Delivery (&lt;3s)</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsParentHelpModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0082FF] hover:bg-[#0070dc] text-white font-bold transition-all shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Parent Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Ask for CX Help */}
      {isCxHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-[#090e17] rounded-2xl border border-rose-900/50 shadow-2xl overflow-hidden font-sans text-white">
            <div className="p-4 bg-gradient-to-r from-rose-950 via-[#001F40] to-[#001F40] border-b border-rose-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-900/60 text-rose-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ask for CX Help</h3>
                  <p className="text-xs text-rose-200">
                    Direct Priority Escalation to 21K Customer Experience / Tech Ops
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCxHelpModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchCx} className="p-5 space-y-4 text-xs">
              {/* Issue Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Issue Category:
                </label>
                <select
                  value={cxCategory}
                  onChange={(e) => setCxCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="WebRTC Media Diagnostic">WebRTC Media & Audio Quality Diagnostic</option>
                  <option value="Student Attendance / Roster Anomaly">Student Attendance / Roster Anomaly</option>
                  <option value="Screen Share & Whiteboard Synchronization">Screen Share & Whiteboard Synchronization</option>
                  <option value="Breakout Room Routing Error">Breakout Room Routing Error</option>
                  <option value="Urgent Classroom Intervention">Urgent Classroom Intervention (Pedagogy/Discipline)</option>
                </select>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Urgent Description:
                </label>
                <textarea
                  rows={3}
                  value={cxReason}
                  onChange={(e) => setCxReason(e.target.value)}
                  placeholder="Detail the technical or operational glitch needing instant intervention..."
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>21K Tech Ops Duty Desk</span>
                </span>
                <span className="font-mono text-cyan-300">SLA: Response in &lt; 30s</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCxHelpModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch CX Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
