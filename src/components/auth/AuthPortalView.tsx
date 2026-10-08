import React, { useState, useEffect } from "react";
import { SchoolLogo } from "../brand/SchoolLogo";
import { TeacherLoginScreen } from "./TeacherLoginScreen";
import { StudentLoginScreen } from "./StudentLoginScreen";
import { AuditorLoginScreen } from "./AuditorLoginScreen";
import { AdminLoginScreen } from "./AdminLoginScreen";
import { SalesLoginScreen } from "./SalesLoginScreen";
import { UserRole, AuthUser } from "../../types";
import { GraduationCap, Users, Eye, Flame, Shield, ArrowLeft, BookOpen, Zap } from "lucide-react";

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
  initialRole?: UserRole;
  onOpenDocs?: () => void;
  canDismiss?: boolean;
  onDismiss?: () => void;
}

export const AuthPortalView: React.FC<Props> = ({
  onLoginSuccess,
  initialRole = "instructor",
  onOpenDocs,
  canDismiss = false,
  onDismiss,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    // Check URL parameters for direct deep linking e.g. ?portal=teacher or ?portal=student
    const params = new URLSearchParams(window.location.search);
    const portalParam = params.get("portal")?.toLowerCase();
    if (portalParam === "teacher" || portalParam === "instructor") setSelectedRole("instructor");
    if (portalParam === "student") setSelectedRole("student");
    if (portalParam === "auditor") setSelectedRole("auditor");
    if (portalParam === "sales" || portalParam === "sales_rep") setSelectedRole("sales_rep");
    if (portalParam === "admin") setSelectedRole("admin");
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    // Update query params quietly without reloading
    const url = new URL(window.location.href);
    url.searchParams.set("portal", role === "instructor" ? "teacher" : role);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md overflow-y-auto">
      {/* Top Bar inside Auth Portal */}
      <header className="h-16 px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <SchoolLogo size="md" showTagline={false} systemName="Dronacharya" theme="dark" />
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FFBB00] text-[#001F40]">
            Enterprise Portal
          </span>
        </div>

        {/* Role Tab Switcher in Header */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => handleRoleChange("instructor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "instructor"
                ? "bg-[#003872] text-white shadow-xs border border-blue-400/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#FFBB00]" />
            <span className="hidden md:inline">Teacher / Facilitator</span>
            <span className="md:hidden">Teacher</span>
          </button>

          <button
            onClick={() => handleRoleChange("student")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "student"
                ? "bg-[#0082FF] text-white shadow-xs border border-blue-300/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden md:inline">Student & Parent</span>
            <span className="md:hidden">Student</span>
          </button>

          <button
            onClick={() => handleRoleChange("auditor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "auditor"
                ? "bg-purple-700 text-white shadow-xs border border-purple-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-purple-200" />
            <span className="hidden md:inline">Compliance Auditor</span>
            <span className="md:hidden">Auditor</span>
          </button>

          <button
            onClick={() => handleRoleChange("sales_rep")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "sales_rep"
                ? "bg-amber-600 text-white shadow-xs border border-amber-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Sales & CRM</span>
            <span className="md:hidden">Sales</span>
          </button>

          <button
            onClick={() => handleRoleChange("admin")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "admin"
                ? "bg-rose-600 text-white shadow-xs border border-rose-400/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Admin & Room Bomber</span>
            <span className="md:hidden">Admin</span>
          </button>
        </div>

        {/* Right Action: Open Architecture Docs & Dismiss */}
        <div className="flex items-center gap-2">
          {onOpenDocs && (
            <button
              onClick={onOpenDocs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
              title="Read PRD, BRD, LMD, MMD, HMD and Architecture Specs"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#FFBB00]" />
              <span className="hidden sm:inline">System Specs & PRD</span>
            </button>
          )}

          {canDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Return to Active Session"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        {selectedRole === "instructor" && (
          <TeacherLoginScreen
            onLoginSuccess={onLoginSuccess}
            onSwitchPortal={(r) => handleRoleChange(r as UserRole)}
          />
        )}
        {selectedRole === "student" && (
          <StudentLoginScreen
            onLoginSuccess={onLoginSuccess}
            onSwitchPortal={(r) => handleRoleChange(r as UserRole)}
          />
        )}
        {selectedRole === "auditor" && (
          <AuditorLoginScreen
            onLoginSuccess={onLoginSuccess}
            onSwitchPortal={(r) => handleRoleChange(r as UserRole)}
          />
        )}
        {selectedRole === "sales_rep" && (
          <SalesLoginScreen
            onLoginSuccess={onLoginSuccess}
            onOpenDocs={onOpenDocs}
          />
        )}
        {selectedRole === "admin" && (
          <AdminLoginScreen
            onLoginSuccess={onLoginSuccess}
            onSwitchPortal={(r) => handleRoleChange(r as UserRole)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="h-10 px-6 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between shrink-0 font-sans">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Real Full-Stack Server & WebSocket Infrastructure Active</span>
        </div>
        <div>
          <span>21K School Dronacharya · Zero Mock Simulation Mode</span>
        </div>
      </footer>
    </div>
  );
};
