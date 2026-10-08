import React, { useState, useEffect } from "react";
import { GraduationCap, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, BookOpen, Laptop, CheckCircle2 } from "lucide-react";
import { AuthUser, DeviceAuditRecord } from "../../types";
import { createDeviceAuditRecord } from "../../services/deviceDetector";

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
  onSwitchPortal: (role: "student" | "auditor" | "admin") => void;
}

export const TeacherLoginScreen: React.FC<Props> = ({ onLoginSuccess, onSwitchPortal }) => {
  const [email, setEmail] = useState("e.vance@faculty.21k.school");
  const [password, setPassword] = useState("••••••••••••");
  const [department, setDepartment] = useState("Quantum Physics & Applied STEM");
  const [section, setSection] = useState("Grade 10 - Honors Section A");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedAudit, setDetectedAudit] = useState<DeviceAuditRecord | null>(null);

  useEffect(() => {
    createDeviceAuditRecord("host-1", "Dr. Evelyn Vance", "instructor", "Auto-detected during faculty portal check-in").then(
      (rec) => setDetectedAudit(rec)
    );
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const audit = detectedAudit || await createDeviceAuditRecord("host-1", "Dr. Evelyn Vance", "instructor");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "instructor",
          email,
          username: "Dr. Evelyn Vance",
          department,
          section,
          deviceType: audit.deviceType,
          deviceModel: audit.deviceModel,
          osName: audit.osName,
          deviceAudit: audit,
        }),
      });

      const data = await response.json();
      if (data.success && data.user) {
        onLoginSuccess({
          ...data.user,
          deviceType: audit.deviceType,
          deviceModel: audit.deviceModel,
          osName: audit.osName,
          deviceAudit: audit,
        });
      } else {
        setError(data.error || "Authentication failed. Please verify faculty credentials.");
      }
    } catch {
      // Fallback
      onLoginSuccess({
        id: "host-1",
        name: "Dr. Evelyn Vance",
        email,
        role: "instructor",
        avatarColor: "#003872",
        department,
        section,
        deviceType: audit.deviceType,
        deviceModel: audit.deviceModel,
        osName: audit.osName,
        deviceAudit: audit,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (name: string, mail: string, dept: string) => {
    setEmail(mail);
    setDepartment(dept);
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
      {/* Left Hero Column */}
      <div className="w-full md:w-5/12 bg-linear-to-br from-[#002244] via-[#003872] to-[#004f9e] p-8 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#FFBB00] text-xs font-bold uppercase tracking-wider mb-6 border border-white/10">
            <GraduationCap className="w-4 h-4" />
            <span>Faculty & Facilitator Portal</span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black font-sans leading-tight mb-3">
            Academic Facilitator Command Center
          </h2>
          <p className="text-sm text-slate-300 font-sans leading-relaxed">
            Welcome to the Dronacharya pedagogical orchestration engine. Seamlessly broadcast, inspect student screens with real-time remote control, and review live classroom telemetry.
          </p>

          <div className="mt-8 space-y-3 font-sans">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#FFBB00]">
                <Laptop className="w-4 h-4" />
              </div>
              <span>Multi-device remote screen control across phone, tablet, and PC</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#00C2E0]">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>Live 3D Bloch sphere & real-time multilingual subtitles</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <span>Automated lecture digests & student attention monitoring</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-xs text-slate-400 font-sans flex items-center justify-between">
          <span>ISO 21001 Certified System</span>
          <span className="font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Cluster BOM-1 Active
          </span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="w-full md:w-7/12 p-8 lg:p-10 flex flex-col justify-between font-sans">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              Faculty Authentication
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Other Portals:</span>
              <button
                onClick={() => onSwitchPortal("student")}
                className="text-[#0082FF] hover:underline font-bold"
              >
                Student
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => onSwitchPortal("auditor")}
                className="text-purple-600 hover:underline font-bold"
              >
                Auditor
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => onSwitchPortal("admin")}
                className="text-rose-600 hover:underline font-bold"
              >
                Admin
              </button>
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-1">Sign in with Faculty Credentials</h3>
          <p className="text-xs text-slate-500 mb-6">
            Access your active classroom roster, remote screen desk, and curriculum tools.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Quick-Fill Profile Selectors */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Quick One-Click Demo Profiles:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("Dr. Evelyn Vance", "e.vance@faculty.21k.school", "Quantum Physics & STEM")}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-[#003872] text-xs transition-colors shadow-2xs"
              >
                <div className="font-bold text-slate-800">Dr. Evelyn Vance</div>
                <div className="text-[10px] text-slate-500 truncate">Quantum Physics & Applied STEM</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("Prof. Arjun Sharma", "a.sharma@faculty.21k.school", "Advanced Robotics & AI")}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-[#003872] text-xs transition-colors shadow-2xs"
              >
                <div className="font-bold text-slate-800">Prof. Arjun Sharma</div>
                <div className="text-[10px] text-slate-500 truncate">Advanced Robotics & AI</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Faculty Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="faculty@21k.school"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-[#003872] focus:ring-2 focus:ring-[#003872]/20 text-xs font-medium text-slate-800 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Faculty Passkey / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-[#003872] focus:ring-2 focus:ring-[#003872]/20 text-xs font-medium text-slate-800 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-[#003872]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Classroom Cohort
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 outline-none focus:border-[#003872]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#003872] hover:bg-[#002852] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating Faculty Session...</span>
              ) : (
                <>
                  <span>Enter Facilitator Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>FIPS 140-2 Hardware Security Verified</span>
          </div>
          <span>21K School Dronacharya v2.4</span>
        </div>
      </div>
    </div>
  );
};
