import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { DeviceType, RemoteAccessLevel } from "../../types";
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Shield,
  Eye,
  PenTool,
  Terminal,
  X,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { DEVICE_METADATA_MAP } from "../../services/remoteAccessService";

interface RemoteAccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudentId?: string;
}

export const RemoteAccessRequestModal: React.FC<RemoteAccessRequestModalProps> = ({
  isOpen,
  onClose,
  targetStudentId,
}) => {
  const { participants, currentUser, requestRemoteAccess } = useClassroom();

  const students = participants.filter((p) => p.role === "student");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    targetStudentId || students[0]?.id || ""
  );
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>("laptop");
  const [selectedLevel, setSelectedLevel] = useState<RemoteAccessLevel>("full_control");

  // Keep selected student synced when targetStudentId changes
  React.useEffect(() => {
    if (targetStudentId) {
      setSelectedStudentId(targetStudentId);
    } else if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [targetStudentId, students]);

  // Auto-detect target student's device from live telemetry
  React.useEffect(() => {
    const student = participants.find((p) => p.id === selectedStudentId);
    if (student) {
      const dev: DeviceType = (student as any).deviceType || (student.name.includes("Sophia") ? "tablet" : "laptop");
      setSelectedDevice(dev);
    }
  }, [selectedStudentId, participants]);

  if (!isOpen) return null;

  const targetStudent = participants.find((p) => p.id === selectedStudentId);

  const handleSendRequest = () => {
    if (!selectedStudentId) return;
    requestRemoteAccess(selectedStudentId, selectedDevice, selectedLevel);
    onClose();
  };

  const DEVICES: Array<{ type: DeviceType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
    { type: "laptop", label: "Laptop", icon: Laptop, desc: "MacBook, ThinkPad, Chromebook (16:10)" },
    { type: "tablet", label: "Tablet", icon: Tablet, desc: "iPad Pro, Surface Pro with Stylus (4:3)" },
    { type: "desktop", label: "Desktop PC", icon: Monitor, desc: "Workstation, Dual-Monitor Windows/Linux (16:9)" },
    { type: "phone", label: "Smartphone", icon: Smartphone, desc: "iOS/Android Mobile device (9:16)" },
  ];

  const TIERS: Array<{ level: RemoteAccessLevel; label: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string }> = [
    {
      level: "view_only",
      label: "View Only",
      icon: Eye,
      color: "border-emerald-500/50 bg-emerald-950/20 text-emerald-300",
      desc: "Live 60fps screen observation with telemetry & zero input interference",
    },
    {
      level: "annotate",
      label: "Annotate",
      icon: PenTool,
      color: "border-amber-500/50 bg-amber-950/20 text-amber-300",
      desc: "Real-time laser pointer, ink pen, and highlighter synchronized over student canvas",
    },
    {
      level: "full_control",
      label: "Full Remote Control",
      icon: Terminal,
      color: "border-cyan-500/50 bg-cyan-950/20 text-cyan-300",
      desc: "Direct virtual mouse clicks, keyboard input, terminal execution & worksheet editing",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl rounded-2xl bg-[#080d1a] border border-[#003872] shadow-2xl overflow-hidden flex flex-col font-sans text-white animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#001F40] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#003872] text-[#00C2E0]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Request Remote System Access
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00C2E0]/20 text-[#00C2E0] border border-[#00C2E0]/30">
                  AES-256 Mesh
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Grant hardware-level pedagogical intervention across any learner device
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 1. Target Student Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              1. Select Target Learner
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {students.map((stu) => {
                const isSelected = selectedStudentId === stu.id;
                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => setSelectedStudentId(stu.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#0082FF] bg-[#003872]/50 text-white shadow-md shadow-[#0082FF]/20"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                      style={{ backgroundColor: stu.avatarColor }}
                    >
                      {stu.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{stu.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Grade {stu.gradeLevel || 10}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Device Form Factor */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              2. Target Device Form Factor
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEVICES.map((d) => {
                const Icon = d.icon;
                const isSelected = selectedDevice === d.type;
                return (
                  <button
                    key={d.type}
                    type="button"
                    onClick={() => setSelectedDevice(d.type)}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#00C2E0] bg-[#00C2E0]/15 text-[#00C2E0] shadow-md shadow-[#00C2E0]/10"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-1.5" />
                    <span className="text-xs font-bold text-white">{d.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                      {DEVICE_METADATA_MAP[d.type].aspectRatio}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Access Control Tier */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              3. Requested Permission Level
            </label>
            <div className="space-y-2">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedLevel === tier.level;
                return (
                  <div
                    key={tier.level}
                    onClick={() => setSelectedLevel(tier.level)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? `${tier.color} ring-1 ring-white/20 shadow-md`
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-black/40 mt-0.5 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{tier.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{tier.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Guardrail Notice */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-[#FFBB00] shrink-0" />
            <span>
              The student will receive an encrypted authorization prompt. Student can downgrade or revoke access at any time via the floating kill switch.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Target: <span className="text-white font-bold">{targetStudent?.name || "Student"}</span> · {selectedDevice.toUpperCase()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSendRequest}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#0082FF] to-[#00C2E0] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-[#0082FF]/30 transition-all cursor-pointer"
            >
              <span>Send Remote Request</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
