import React, { useState, useEffect } from "react";
import { Eye, ShieldAlert, FileText, ArrowRight, ShieldCheck, Activity, Award, Radio, CheckCircle2 } from "lucide-react";
import { AuthUser, DeviceAuditRecord } from "../../types";
import { createDeviceAuditRecord } from "../../services/deviceDetector";

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
  onSwitchPortal: (role: "instructor" | "student" | "admin") => void;
}

export const AuditorLoginScreen: React.FC<Props> = ({ onLoginSuccess, onSwitchPortal }) => {
  const [auditorName, setAuditorName] = useState("Inspector Marcus Aurelius");
  const [licenseKey, setLicenseKey] = useState("ISO-21001-NEASC-9824");
  const [inspectionCohort, setInspectionCohort] = useState("STEM & Advanced Physics Live Classes");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedAudit, setDetectedAudit] = useState<DeviceAuditRecord | null>(null);

  useEffect(() => {
    createDeviceAuditRecord("audit-1", auditorName, "auditor", "Auto-detected during auditor compliance portal check-in").then(
      (rec) => setDetectedAudit(rec)
    );
  }, [auditorName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const audit = detectedAudit || await createDeviceAuditRecord("audit-1", auditorName, "auditor");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "auditor",
          username: auditorName,
          auditorLicense: licenseKey,
          department: inspectionCohort,
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
        setError("Invalid auditor license key or inspection cohort.");
      }
    } catch {
      onLoginSuccess({
        id: "audit-1",
        name: auditorName,
        email: "m.aurelius@compliance.21k.school",
        role: "auditor",
        avatarColor: "#7C3AED",
        auditorLicense: licenseKey,
        department: inspectionCohort,
        deviceType: audit.deviceType,
        deviceModel: audit.deviceModel,
        osName: audit.osName,
        deviceAudit: audit,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (name: string, license: string, cohort: string) => {
    setAuditorName(name);
    setLicenseKey(license);
    setInspectionCohort(cohort);
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
      {/* Left Hero Column */}
      <div className="w-full md:w-5/12 bg-linear-to-br from-[#2E1065] via-[#5B21B6] to-[#7C3AED] p-8 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#FFBB00] text-xs font-bold uppercase tracking-wider mb-6 border border-white/10">
            <Eye className="w-4 h-4" />
            <span>Academic Compliance & Quality</span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black font-sans leading-tight mb-3">
            Quality Assurance & Audit Console
          </h2>
          <p className="text-sm text-purple-100 font-sans leading-relaxed">
            Inconspicuously inspect active live classrooms, evaluate teacher vocal SNR and acoustic clarity, analyze student gaze landmarks, and record 4-pillar pedagogical rubrics.
          </p>

          <div className="mt-8 space-y-3 font-sans">
            <div className="flex items-center gap-3 text-xs text-purple-100">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-[#FFBB00]">
                <Radio className="w-4 h-4" />
              </div>
              <span>Silent shadow mode room hopping without student disruption</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-purple-100">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-[#00C2E0]">
                <Activity className="w-4 h-4" />
              </div>
              <span>Real-time SNR vocal clarity & facial gaze telemetry</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-purple-100">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-emerald-300">
                <Award className="w-4 h-4" />
              </div>
              <span>ISO 21001 & NEASC pedagogical compliance reporting</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/15 text-xs text-purple-200 font-sans flex items-center justify-between">
          <span>Official Inspector Credentials</span>
          <span className="font-mono text-emerald-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Telemetry Stream Active
          </span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="w-full md:w-7/12 p-8 lg:p-10 flex flex-col justify-between font-sans">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              Auditor Security Clearance
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Other Portals:</span>
              <button
                onClick={() => onSwitchPortal("instructor")}
                className="text-[#003872] hover:underline font-bold"
              >
                Teacher
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => onSwitchPortal("student")}
                className="text-[#0082FF] hover:underline font-bold"
              >
                Student
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

          <h3 className="text-xl font-bold text-slate-800 mb-1">Auditor Session Authentication</h3>
          <p className="text-xs text-slate-500 mb-6">
            Authenticate your inspector license to observe classrooms and evaluate rubrics.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Quick-Fill Profiles */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Auditor Inspector Profiles:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("Inspector Marcus Aurelius", "ISO-21001-NEASC-9824", "STEM & Advanced Physics Live Classes")}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-purple-600 text-xs transition-colors shadow-2xs"
              >
                <div className="font-bold text-slate-800">Insp. Marcus Aurelius</div>
                <div className="text-[10px] text-slate-500 truncate">Lead STEM Inspector · ISO 21001</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("Auditor Sarah Jenkins", "NEASC-QA-DIRECTOR-441", "Global Admissions & 1:1 Pitch Sessions")}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-purple-600 text-xs transition-colors shadow-2xs"
              >
                <div className="font-bold text-slate-800">Auditor Sarah Jenkins</div>
                <div className="text-[10px] text-slate-500 truncate">Admissions & Pitch Quality Lead</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Inspector Full Name
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 text-xs font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Accreditation License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                required
                placeholder="ISO-21001-XXXX"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 text-xs font-mono font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Audit Cohort
              </label>
              <select
                value={inspectionCohort}
                onChange={(e) => setInspectionCohort(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-purple-600 text-xs font-medium text-slate-800 outline-none"
              >
                <option value="STEM & Advanced Physics Live Classes">STEM & Advanced Physics Live Classes</option>
                <option value="Global Admissions & 1:1 Pitch Sessions">Global Admissions & 1:1 Room Bomber Pitches</option>
                <option value="Middle School Mathematics & Coding">Middle School Mathematics & Coding</option>
                <option value="Cambridge A-Level Honors Cohort">Cambridge A-Level Honors Cohort</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying Auditor Credentials...</span>
              ) : (
                <>
                  <span>Enter Academic Compliance Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted Telemetry Channel</span>
          </div>
          <span>Auditor Console · 21K School</span>
        </div>
      </div>
    </div>
  );
};
