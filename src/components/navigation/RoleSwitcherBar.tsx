import React from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { UserRole } from "../../types";

export const RoleSwitcherBar: React.FC = () => {
  const { currentRole, setCurrentRole } = useClassroom();

  const ROLES: Array<{
    id: UserRole;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }> = [
    {
      id: "instructor",
      label: "Teacher Cockpit",
      description: "Pedagogy Command, 1:1-1:24 Sizing & Zero-Toggle Actions",
      icon: GraduationCap,
      accentColor: "border-[#003872] bg-[#003872] text-white",
    },
    {
      id: "student",
      label: "Student Cockpit",
      description: "Learning Stage, Smart Peer Notes & Instant Escalations",
      icon: UserCheck,
      accentColor: "border-indigo-600 bg-indigo-600 text-white",
    },
    {
      id: "auditor",
      label: "Auditor Cockpit",
      description: "Biometric Attention Audit, Audio SNR & Rubric Evaluation",
      icon: ShieldAlert,
      accentColor: "border-purple-600 bg-purple-600 text-white",
    },
    {
      id: "sales_rep",
      label: "Sales Cockpit",
      description: "1:1 Admissions Pitch, CRM Lead Queue & Scholarship Close",
      icon: Zap,
      accentColor: "border-amber-600 bg-amber-600 text-white",
    },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs z-20 shrink-0 font-sans shadow-inner">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-slate-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Role Viewport:</span>
        </span>

        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isSelected =
              currentRole === r.id ||
              (r.id === "instructor" && (currentRole === "instructor" || currentRole === "admin")) ||
              (r.id === "student" && (currentRole === "student" || currentRole === "ta"));

            return (
              <button
                key={r.id}
                onClick={() => setCurrentRole(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? `${r.accentColor} shadow-md`
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title={r.description}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">Adaptive Layout: Active</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="truncate max-w-xs text-slate-300">
          {currentRole === "auditor"
            ? "Compliance, Audio SNR & Facial Gaze Telemetry Enabled"
            : currentRole === "student"
            ? "Student Focus Stage & Peer Note-Taker Ready"
            : "Facilitator Command & Capacity Control Active"}
        </span>
      </div>
    </div>
  );
};
