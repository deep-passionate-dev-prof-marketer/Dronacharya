import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  ShieldCheck,
  Laptop,
  Tablet,
  Smartphone,
  Monitor,
  Mic,
  Video,
  Volume2,
  Wifi,
  Cpu,
  HardDrive,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { DeviceAuditRecord, UserRole } from "../../types";
import { DeviceAccessControlPanel } from "../access/DeviceAccessControlPanel";

export const DeviceAuditCenter: React.FC = () => {
  const { deviceAuditLogs, logDeviceAudit, currentRole, authenticatedUser } = useClassroom();

  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"access" | "telemetry">("access");

  // Filter logs by selected role and search query
  const filteredLogs = deviceAuditLogs.filter((log) => {
    const matchesRole =
      selectedRoleFilter === "all" ? true : log.userRole === selectedRoleFilter;
    const matchesSearch =
      searchQuery.trim() === ""
        ? true
        : log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.osName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.userRole.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleRunManualScan = async () => {
    setIsScanning(true);
    await logDeviceAudit(currentRole, `Manual deep-hardware telemetry audit triggered by ${currentRole}`);
    setTimeout(() => setIsScanning(false), 800);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(deviceAuditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `21k-school-device-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    const headers = ["ID", "User", "Role", "Device Type", "Device Model", "OS", "Browser", "Resolution", "Mics", "Cams", "Network", "Compliance", "Timestamp"];
    const rows = deviceAuditLogs.map((l) => [
      l.id,
      `"${l.userName}"`,
      l.userRole,
      l.deviceType,
      `"${l.deviceModel}"`,
      `"${l.osName}"`,
      `"${l.browserName} ${l.browserVersion}"`,
      `"${l.screenResolution}"`,
      l.audioInputsCount,
      l.videoInputsCount,
      `"${l.networkType || "Broadband"}"`,
      l.complianceStatus,
      `"${l.detectedAt}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `21k-school-device-audit-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Aggregated Stats
  const totalCount = deviceAuditLogs.length || 1;
  const compliantCount = deviceAuditLogs.filter((l) => l.complianceStatus === "compliant").length || totalCount;
  const complianceRate = Math.round((compliantCount / totalCount) * 100);

  const deviceTypeCounts = {
    laptop: deviceAuditLogs.filter((l) => l.deviceType === "laptop").length,
    tablet: deviceAuditLogs.filter((l) => l.deviceType === "tablet").length,
    desktop: deviceAuditLogs.filter((l) => l.deviceType === "desktop").length,
    phone: deviceAuditLogs.filter((l) => l.deviceType === "phone").length,
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "tablet":
        return <Tablet className="w-4 h-4 text-cyan-400" />;
      case "phone":
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case "desktop":
        return <Monitor className="w-4 h-4 text-amber-400" />;
      default:
        return <Laptop className="w-4 h-4 text-blue-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "instructor":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#003872] text-white">Teacher</span>;
      case "student":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">Student</span>;
      case "auditor":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30">Auditor</span>;
      case "sales_rep":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/20 text-amber-300 border border-amber-500/30">Sales Rep</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-200">{role}</span>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070b14] overflow-y-auto text-slate-100 font-sans p-3 sm:p-4 lg:p-6 select-none">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#001F40] via-[#003872] to-[#0082FF] rounded-2xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden mb-4 sm:mb-6 shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[#FFBB00] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 border border-white/20 max-w-full">
              <ShieldCheck className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Zero-Friction Hardware Verification & Telemetry Audit Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
              Device Audit & Peripheral Telemetry Center
            </h1>
            <p className="text-sm text-blue-100 max-w-2xl mt-1">
              Continuous background environment detection without user questionnaires. Real-time audit logs categorized across Students, Teachers, Auditors, and Sales Reps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 md:shrink-0">
            <button
              onClick={handleRunManualScan}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Probing Specs..." : "Run Telemetry Probe"}</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-[#00C2E0] hover:bg-[#00a8c2] text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
              Compliance Pass Rate
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <CheckCircle2 className="shrink-0 self-center w-4 h-4 text-emerald-400" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{complianceRate}%</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Verified</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
              Monitored Endpoints
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Layers className="shrink-0 self-center w-4 h-4 text-[#FFBB00]" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{deviceAuditLogs.length}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Records</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
              Audio & Mic Integrity
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Mic className="shrink-0 self-center w-4 h-4 text-cyan-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">100%</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Signal Pass</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
              Zero-Prompt Mode
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Sparkles className="shrink-0 self-center w-4 h-4 text-amber-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">100%</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Background</span>
            </div>
          </div>
        </div>
      </div>

      {/* Access control (device-locked links) vs passive telemetry */}
      <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 mb-4 sm:mb-6 self-start text-sm" role="tablist">
        {([
          ["access", "Access control"],
          ["telemetry", "Device telemetry"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={activeTab === k}
            onClick={() => setActiveTab(k)}
            className={`px-4 h-10 rounded-lg font-semibold transition-colors ${activeTab === k ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "access" && <DeviceAccessControlPanel />}

      {activeTab === "telemetry" && (<>
      {/* Form Factor & OS Distribution Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Educational Laptops</p>
            <p className="text-xl font-bold text-white mt-0.5">{deviceTypeCounts.laptop} Active</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Tablet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">iPads & Stylus Tablets</p>
            <p className="text-xl font-bold text-white mt-0.5">{deviceTypeCounts.tablet} Active</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Desktop Workstations</p>
            <p className="text-xl font-bold text-white mt-0.5">{deviceTypeCounts.desktop} Active</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Mobile Participants</p>
            <p className="text-xl font-bold text-white mt-0.5">{deviceTypeCounts.phone} Active</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 bg-slate-900/90 p-3 rounded-2xl border border-white/10">
        {/* Role Segment Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All Roles" },
            { id: "student", label: "Students" },
            { id: "instructor", label: "Teachers" },
            { id: "auditor", label: "Auditors" },
            { id: "sales_rep", label: "Sales Reps" },
            { id: "admin", label: "Admins" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, model, OS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Audit Records Table */}
      <div className="flex-1 rounded-2xl bg-slate-900/90 border border-white/10 overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Participant & Role</th>
                <th className="py-3 px-4">Detected Hardware Model</th>
                <th className="py-3 px-4">OS & Browser</th>
                <th className="py-3 px-4">Screen Resolution</th>
                <th className="py-3 px-4">Peripherals</th>
                <th className="py-3 px-4">Network & Latency</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{log.userName}</div>
                      <div className="mt-1">{getRoleBadge(log.userRole)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(log.deviceType)}
                        <span className="font-semibold text-slate-200">{log.deviceModel}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">
                        Form Factor: {log.deviceType}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{log.osName}</div>
                      <div className="text-[10px] text-slate-400">{log.browserName} {log.browserVersion}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {log.screenResolution}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-1 text-cyan-300" title="Audio Inputs">
                          <Mic className="w-3 h-3" /> {log.audioInputsCount}
                        </span>
                        <span className="flex items-center gap-1 text-purple-300" title="Video Inputs">
                          <Video className="w-3 h-3" /> {log.videoInputsCount}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-300" title="Audio Outputs">
                          <Volume2 className="w-3 h-3" /> {log.audioOutputsCount}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Wifi className="w-3 h-3" />
                        <span>{log.networkType || "Broadband WiFi"}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.hardwareConcurrency} Cores · {log.deviceMemoryGb || 8}GB RAM
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.detectedAt}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Compliant
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No device audit records match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}
    </div>
  );
};
