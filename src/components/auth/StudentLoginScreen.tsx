import React, { useState, useEffect } from "react";
import { Users, User, Smartphone, Tablet, Laptop, Monitor, ArrowRight, ShieldCheck, Sparkles, BookOpen, HeartHandshake, CheckCircle2 } from "lucide-react";
import { AuthUser, DeviceType, DeviceAuditRecord } from "../../types";
import { detectClientDeviceEnvironment, createDeviceAuditRecord } from "../../services/deviceDetector";

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
  onSwitchPortal: (role: "instructor" | "auditor" | "admin") => void;
}

export const StudentLoginScreen: React.FC<Props> = ({ onLoginSuccess, onSwitchPortal }) => {
  const [studentName, setStudentName] = useState("Sophia Chen");
  const [parentName, setParentName] = useState("Mrs. Linda Chen");
  const [parentPhone, setParentPhone] = useState("+1 (555) 234-8901");
  const [parentEmail, setParentEmail] = useState("linda.chen@family.org");
  const [gradeLevel, setGradeLevel] = useState<number>(10);
  const [academicGoals, setAcademicGoals] = useState("Quantum Computing & AP Physics Preparation");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detected device & telemetry audit state (no manual questionnaire)
  const [detectedAudit, setDetectedAudit] = useState<DeviceAuditRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    createDeviceAuditRecord("stu-1", studentName, "student", "Auto-detected during student portal initialization").then((rec) => {
      if (isMounted) setDetectedAudit(rec);
    });
    return () => {
      isMounted = false;
    };
  }, [studentName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const auditRecord = detectedAudit || await createDeviceAuditRecord("stu-1", studentName, "student");
    const deviceType: DeviceType = auditRecord.deviceType;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          username: studentName,
          parentName,
          parentPhone,
          parentEmail,
          gradeLevel,
          deviceType,
          deviceModel: auditRecord.deviceModel,
          osName: auditRecord.osName,
          deviceAudit: auditRecord,
          academicGoals,
        }),
      });

      const data = await response.json();
      if (data.success && data.user) {
        onLoginSuccess({
          ...data.user,
          deviceType,
          deviceModel: auditRecord.deviceModel,
          osName: auditRecord.osName,
          deviceAudit: auditRecord,
          parentName,
          parentPhone,
          parentEmail,
          gradeLevel,
          academicGoals,
        });
      } else {
        setError("Failed to register session.");
      }
    } catch {
      onLoginSuccess({
        id: "stu-1",
        name: studentName,
        email: `${studentName.toLowerCase().replace(/\s+/g, ".")}@student.21k.school`,
        role: "student",
        avatarColor: "#0082FF",
        gradeLevel,
        parentName,
        parentPhone,
        parentEmail,
        deviceType,
        deviceModel: auditRecord.deviceModel,
        osName: auditRecord.osName,
        deviceAudit: auditRecord,
        academicGoals,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (sName: string, pName: string, pPhone: string, grade: number, goals: string) => {
    setStudentName(sName);
    setParentName(pName);
    setParentPhone(pPhone);
    setGradeLevel(grade);
    setAcademicGoals(goals);
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
      {/* Left Hero Column */}
      <div className="w-full md:w-5/12 bg-linear-to-br from-brand-navy via-brand-blue-strong to-brand-blue p-8 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-brand-yellow text-xs font-bold uppercase tracking-wider mb-6 border border-white/10">
            <Users className="w-4 h-4" />
            <span>Student & Parent Flightdeck</span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black font-sans leading-tight mb-3">
            Welcome to 21K School Global Flightdeck
          </h2>
          <p className="text-sm text-blue-100 font-sans leading-relaxed">
            Experience next-generation collaborative learning. Access live 3D STEM experiments, auto-captioned multilingual lectures, and real-time remote assistance.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-blue-50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-brand-cyan" />
              </div>
              <span>Cambridge IGCSE & IB Diploma Accredited Curriculum</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
              </div>
              <span>AI-Powered Live Transcripts & Dual Multilingual Subtitles</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span>Zero-Setup Automatic Device Detection & Compliance Audit</span>
            </div>
          </div>
        </div>

        {/* Portal Switcher */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="text-xs text-blue-200 mb-2">Switch Portal Role:</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSwitchPortal("instructor")}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Faculty Login
            </button>
            <button
              type="button"
              onClick={() => onSwitchPortal("auditor")}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Academic Auditor
            </button>
            <button
              type="button"
              onClick={() => onSwitchPortal("admin")}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Admissions / Admin
            </button>
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-between bg-slate-50">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">Learner & Family Sign-In</h3>
              <p className="text-xs text-slate-500 mt-0.5">Instant one-click access with zero device questions</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Session Active
            </span>
          </div>

          {/* Preset Profiles */}
          <div className="mb-5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Pre-Fill Sample Learner:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickFill(
                    "Sophia Chen",
                    "Mrs. Linda Chen",
                    "+1 (555) 234-8901",
                    10,
                    "Quantum Computing & AP Physics Track"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-blue text-xs font-semibold transition-colors cursor-pointer"
              >
                Sophia Chen (Gr 10)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFill(
                    "Marcus Vance",
                    "Dr. Robert Vance",
                    "+1 (555) 902-1134",
                    10,
                    "Robotics & Mathematical Olympiad"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Marcus Vance (Gr 10)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFill(
                    "Aria Thorne",
                    "Mr. David Thorne",
                    "+1 (555) 778-2299",
                    9,
                    "Bio-Molecular Nanotech"
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Aria Thorne (Gr 9)
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}

            {/* Learner Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-brand-blue text-xs font-medium text-slate-800 outline-none"
                    placeholder="e.g. Sophia Chen"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Parent / Guardian Name
                </label>
                <div className="relative">
                  <HeartHandshake className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-brand-blue text-xs font-medium text-slate-800 outline-none"
                    placeholder="e.g. Mrs. Linda Chen"
                  />
                </div>
              </div>
            </div>

            {/* Parent Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Parent Emergency Phone
                </label>
                <input
                  type="text"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-brand-blue text-xs font-medium text-slate-800 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enrolled Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-brand-blue text-xs font-medium text-slate-800 outline-none cursor-pointer"
                >
                  <option value={6}>Grade 6 (Middle School)</option>
                  <option value={7}>Grade 7 (Middle School)</option>
                  <option value={8}>Grade 8 (Pre-IGCSE)</option>
                  <option value={9}>Grade 9 (Cambridge IGCSE)</option>
                  <option value={10}>Grade 10 (Cambridge IGCSE / Honors)</option>
                  <option value={11}>Grade 11 (IB Diploma / Cambridge A-Level)</option>
                  <option value={12}>Grade 12 (IB Diploma / Cambridge A-Level)</option>
                </select>
              </div>
            </div>

            {/* Academic Track */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Academic Track & Goals
              </label>
              <input
                type="text"
                value={academicGoals}
                onChange={(e) => setAcademicGoals(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-brand-blue text-xs font-medium text-slate-800 outline-none"
                placeholder="e.g. Cambridge IGCSE Physics & Robotics"
              />
            </div>

            {/* AUTO-DETECTED DEVICE & ENVIRONMENT AUDIT CARD (NO QUESTIONS ASKED) */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white flex flex-col gap-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-brand-blue/20 text-brand-cyan">
                    {detectedAudit?.deviceType === "phone" ? (
                      <Smartphone className="w-5 h-5 text-amber-400" />
                    ) : detectedAudit?.deviceType === "tablet" ? (
                      <Tablet className="w-5 h-5 text-cyan-400" />
                    ) : detectedAudit?.deviceType === "desktop" ? (
                      <Monitor className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Laptop className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>{detectedAudit?.deviceModel || "Educational Workstation"}</span>
                      <span className="px-1.5 py-0.5 rounded text-2xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Auto-Detected</span>
                      </span>
                    </div>
                    <div className="text-2xs text-slate-400 font-mono mt-0.5">
                      {detectedAudit?.osName || "Operating System"} · {detectedAudit?.screenResolution || "Screen Verified"} · {detectedAudit?.browserName}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-2xs font-mono text-cyan-300 font-semibold uppercase tracking-wider">
                    {detectedAudit?.deviceType || "Laptop"}
                  </span>
                  <span className="text-2xs text-emerald-400 font-medium">Logged for Audit</span>
                </div>
              </div>

              <div className="text-2xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                <span>Hardware environment automatically verified for 1:1 screen assistance & compliance audit</span>
                <span className="font-mono text-slate-300">{detectedAudit?.networkType || "Broadband Low-Latency"}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-blue hover:bg-brand-blue-strong text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <span>Entering Learning Flightdeck...</span>
              ) : (
                <>
                  <span>Join Classroom & 1:1 Counseling Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>End-to-End Encrypted Session</span>
          </div>
          <span>Student Portal · 21K School</span>
        </div>
      </div>
    </div>
  );
};
