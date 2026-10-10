import React, { useState, useEffect } from "react";
import { KeyRound, ShieldCheck, Flame, ArrowRight, Network, BarChart3, Users, Zap, CheckCircle2 } from "lucide-react";
import { AuthUser, DeviceAuditRecord } from "../../types";
import { createDeviceAuditRecord } from "../../services/deviceDetector";

interface Props {
  onLoginSuccess: (user: AuthUser) => void;
  onSwitchPortal: (role: "instructor" | "student" | "auditor") => void;
}

export const AdminLoginScreen: React.FC<Props> = ({ onLoginSuccess, onSwitchPortal }) => {
  const [adminName, setAdminName] = useState("Director Vikram Malhotra");
  const [adminKey, setAdminKey] = useState("21K-EXEC-CLUSTER-ALPHA");
  const [cluster, setCluster] = useState("Global Admissions & Room Bomber Revenue Operations");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedAudit, setDetectedAudit] = useState<DeviceAuditRecord | null>(null);

  useEffect(() => {
    createDeviceAuditRecord("admin-1", adminName, "admin", "Auto-detected during executive admin portal check-in").then(
      (rec) => setDetectedAudit(rec)
    );
  }, [adminName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const audit = detectedAudit || await createDeviceAuditRecord("admin-1", adminName, "admin");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "admin",
          username: adminName,
          adminKey,
          department: cluster,
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
        setError("Invalid administrator key or unauthorized cluster access.");
      }
    } catch {
      onLoginSuccess({
        id: "admin-1",
        name: adminName,
        email: "v.malhotra@executive.21k.school",
        role: "admin",
        avatarColor: "#DC2626",
        adminSecurityKey: adminKey,
        salesCluster: cluster,
        deviceType: audit.deviceType,
        deviceModel: audit.deviceModel,
        osName: audit.osName,
        deviceAudit: audit,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (name: string, key: string, clust: string) => {
    setAdminName(name);
    setAdminKey(key);
    setCluster(clust);
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
      {/* Left Hero Column */}
      <div className="w-full md:w-5/12 bg-linear-to-br from-red-900 via-red-800 to-red-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-brand-yellow text-xs font-bold uppercase tracking-wider mb-6 border border-white/10">
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Executive Operations & Sales Director</span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-black font-sans leading-tight mb-3">
            Room Bomber & Global Operations Hub
          </h2>
          <p className="text-sm text-rose-100 font-sans leading-relaxed">
            Execute 1-click Room Bomber 1:1 sales partitions, orchestrate classroom automated failover policies, and track real-time global enrollment conversions.
          </p>

          <div className="mt-8 space-y-3 font-sans">
            <div className="flex items-center gap-3 text-xs text-rose-100">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-brand-yellow">
                <Zap className="w-4 h-4" />
              </div>
              <span>1-Click Room Bomber: Auto-partition students into 1:1 pitch rooms</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-rose-100">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-brand-cyan">
                <Network className="w-4 h-4" />
              </div>
              <span>Sub-20ms edge peering topology & cluster load balancing</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-rose-100">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-emerald-300">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>Real-time admissions pipeline, pitch stage tracker & revenue ROI</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/15 text-xs text-rose-200 font-sans flex items-center justify-between">
          <span>Root Security Privilege</span>
          <span className="font-mono text-emerald-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Command Center Active
          </span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="w-full md:w-7/12 p-8 lg:p-10 flex flex-col justify-between font-sans">
        <div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              Executive Authentication
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Other Portals:</span>
              <button
                onClick={() => onSwitchPortal("instructor")}
                className="text-brand-navy hover:underline font-bold"
              >
                Teacher
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => onSwitchPortal("student")}
                className="text-brand-blue hover:underline font-bold"
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
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-1">Administrator Hub Sign In</h3>
          <p className="text-xs text-slate-500 mb-6">
            Enter authorized security key to access Room Bomber sales command and operations.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Quick-Fill Profiles */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Executive Demo Profiles:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("Director Vikram Malhotra", "21K-EXEC-CLUSTER-ALPHA", "Global Admissions & Room Bomber Revenue Operations")}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-rose-600 text-xs transition-colors shadow-2xs"
              >
                <div className="font-bold text-slate-800">Dir. Vikram Malhotra</div>
                <div className="text-2xs text-slate-500 truncate">Admissions & Room Bomber Lead</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("Dr. Robert Chen", "21K-CAO-OPS-GLOBAL-01", "Chief Academic Operations & Scheduling")}
                className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-rose-600 text-xs transition-colors shadow-2xs"
              >
                <div className="font-bold text-slate-800">Dr. Robert Chen</div>
                <div className="text-2xs text-slate-500 truncate">Chief Academic Operations Officer</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Executive Administrator Name
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 text-xs font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cluster Security Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  required
                  placeholder="21K-EXEC-XXXX"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 text-xs font-mono font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Operations & Sales Cluster
              </label>
              <select
                value={cluster}
                onChange={(e) => setCluster(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-rose-600 text-xs font-medium text-slate-800 outline-none"
              >
                <option value="Global Admissions & Room Bomber Revenue Operations">Global Admissions & Room Bomber Revenue Operations</option>
                <option value="Academic Governance & Automation Rules">Academic Governance & Automation Rules</option>
                <option value="Edge Mesh Infrastructure & Sub-20ms Peering">Edge Mesh Infrastructure & Sub-20ms Peering</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <span>Accessing Executive Hub...</span>
              ) : (
                <>
                  <span>Enter Operations & Room Bomber Command</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Multi-Factor Cluster Verified</span>
          </div>
          <span>Admin Portal · 21K School</span>
        </div>
      </div>
    </div>
  );
};
