import React, { useState } from "react";
import { SampleNotice } from "../ui";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Flame,
  UserCheck,
  Users,
  Zap,
  TrendingUp,
  Globe,
  Database,
  Link2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
  Award,
  ArrowRight,
  ShieldCheck,
  Send,
  PlusCircle,
  Copy,
  Check,
  Laptop,
} from "lucide-react";
import {
  SalesLead,
  SalesRepresentative,
  SALES_REP_ROSTER,
  INITIAL_SALES_LEADS,
  assignLeadToOptimalRep,
} from "../../services/salesAssignmentService";
import { PitchRoomStatus } from "../../types";

export const SalesHub: React.FC = () => {
  const {
    setActiveView,
    setRoomId,
    setRoomTitle,
    setActivePitchRoom,
    currentUser,
    currentRole,
    triggerRoomBomber,
  } = useClassroom();

  const [leads, setLeads] = useState<SalesLead[]>(INITIAL_SALES_LEADS);
  const [reps, setReps] = useState<SalesRepresentative[]>(SALES_REP_ROSTER);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isSimulatingCrm, setIsSimulatingCrm] = useState(false);

  // New Inbound Lead Modal / Form State
  const [newStudentName, setNewStudentName] = useState("Maya Lin");
  const [newParentName, setNewParentName] = useState("David & Angela Lin");
  const [newParentEmail, setNewParentEmail] = useState("lin.family@california.us");
  const [newGradeLevel, setNewGradeLevel] = useState(10);
  const [newCurriculum, setNewCurriculum] = useState("Cambridge IGCSE");
  const [newLanguage, setNewLanguage] = useState("English");
  const [newCrmSource, setNewCrmSource] = useState<"Salesforce Enterprise" | "HubSpot Education" | "LeadSquared">("HubSpot Education");

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // 1-Click Join Pitch Room logic
  const handleJoinPitchRoom = (lead: SalesLead) => {
    // 1. Construct active pitch room data
    const assignedRepObj = reps.find((r) => r.id === lead.assignedRepId);
    const pitchStatus: PitchRoomStatus = {
      roomId: lead.pitchRoomCode || `21K-PITCH-${lead.id}`,
      roomName: `1:1 Admissions Pitch · ${lead.studentName}`,
      salesRepId: lead.assignedRepId || "sales-kabir",
      salesRepName: lead.assignedRepName || "Admissions Specialist",
      assignedRepEmail: assignedRepObj?.email || `${(lead.assignedRepName || "counselor").toLowerCase().replace(/\s+/g, ".")}@admissions.21k.school`,
      studentId: `stu-${lead.id}`,
      studentName: lead.studentName,
      parentName: lead.parentName,
      parentEmail: lead.parentEmail,
      parentPhone: lead.parentPhone,
      gradeLevel: lead.gradeLevel,
      academicGoals: lead.academicGoals,
      curriculumTrack: lead.curriculum,
      leadQualityScore: lead.leadScore || 94,
      conversionProbability: Math.min(96, Math.max(70, (lead.leadScore || 90) - 4)),
      preCallSummary: `High-value inbound inquiry from ${lead.parentName} seeking ${lead.curriculum} placement for ${lead.studentName} in Grade ${lead.gradeLevel}. Primary academic objective: ${lead.academicGoals}.`,
      currentSchool: "Traditional Brick-and-Mortar School",
      budgetTier: "Premium International ($6,000 - $8,000/yr)",
      keySellingPoints: [
        "1:4 Student-to-Teacher Ratio with Cambridge & Cognia certified faculty.",
        "PhET WebXR 3D quantum & robotics simulation labs built directly into classroom dock.",
        "Transcripts validated under Hague Apostille for seamless university admissions worldwide.",
      ],
      keyObjections: [
        {
          category: "Accreditation",
          objection: "Is online schooling recognized by foreign universities?",
          winningResponse: "Yes, 21K School issues official Cambridge and Cognia-accredited transcripts accepted worldwide.",
        },
        {
          category: "Socialization",
          objection: "Will the student miss physical peer socialization?",
          winningResponse: "21K fosters global student clubs, peer study groups, and regional campus meetups.",
        },
      ],
      currentStage: 1,
      stageName: "Diagnostic",
      parentEngagementScore: 92,
      scholarshipGrantedPercent: lead.maxScholarshipPercent || 20,
      tuitionTotal: lead.tuitionQuote || 6500,
      discountedTuition: Math.round((lead.tuitionQuote || 6500) * (1 - (lead.maxScholarshipPercent || 20) / 100)),
      contractStatus: "pending",
      startedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notes: `Connected via ${lead.crmSource}. Parent priority: ${lead.academicGoals}`,
    };

    // 2. Mark lead as in pitch
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: "pitch_in_progress" } : l))
    );

    // 3. Set active classroom & pitch HUD
    setRoomId(pitchStatus.roomId);
    setRoomTitle(pitchStatus.roomName);
    setActivePitchRoom(pitchStatus);
    setActiveView("classroom");
  };

  // Simulate Inbound CRM Webhook Trigger with Auto-Assignment
  const handleSimulateCrmInbound = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulatingCrm(true);

    const draftLead: Partial<SalesLead> = {
      studentName: newStudentName,
      parentName: newParentName,
      parentEmail: newParentEmail,
      parentPhone: "+1 (415) 890-1234",
      gradeLevel: newGradeLevel,
      curriculum: newCurriculum,
      preferredLanguage: newLanguage,
      timezone: "America/Los_Angeles (PST)",
      crmSource: newCrmSource,
      leadScore: 95,
      academicGoals: "High School STEM & Quantum Physics Preparation",
      tuitionQuote: 7200,
      maxScholarshipPercent: 25,
    };

    // Evaluate multi-factor assignment logic
    const { assignedRep, reason, roomCode, roomUrl } = assignLeadToOptimalRep(draftLead, reps);

    const fullLead: SalesLead = {
      id: `lead-${Date.now()}`,
      studentName: newStudentName,
      parentName: newParentName,
      parentEmail: newParentEmail,
      parentPhone: "+1 (415) 890-1234",
      gradeLevel: newGradeLevel,
      curriculum: newCurriculum,
      preferredLanguage: newLanguage,
      timezone: "America/Los_Angeles (PST)",
      crmSource: newCrmSource,
      leadScore: 95,
      academicGoals: "High School STEM & Quantum Physics Preparation",
      assignedRepId: assignedRep.id,
      assignedRepName: assignedRep.name,
      assignedAt: "Just now",
      status: "assigned",
      assignmentReason: reason,
      pitchRoomCode: roomCode,
      pitchRoomUrl: roomUrl,
      tuitionQuote: 7200,
      maxScholarshipPercent: 25,
    };

    // Update reps capacity
    setReps((prev) =>
      prev.map((r) =>
        r.id === assignedRep.id ? { ...r, currentLeadCount: r.currentLeadCount + 1 } : r
      )
    );

    setLeads((prev) => [fullLead, ...prev]);

    setTimeout(() => {
      setIsSimulatingCrm(false);
      setSelectedLeadId(fullLead.id);
    }, 600);
  };

  // Assign a pending new lead
  const handleAutoAssignLead = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    const { assignedRep, reason, roomCode, roomUrl } = assignLeadToOptimalRep(target, reps);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              assignedRepId: assignedRep.id,
              assignedRepName: assignedRep.name,
              assignedAt: "Just now",
              status: "assigned",
              assignmentReason: reason,
              pitchRoomCode: roomCode,
              pitchRoomUrl: roomUrl,
            }
          : l
      )
    );

    setReps((prev) =>
      prev.map((r) =>
        r.id === assignedRep.id ? { ...r, currentLeadCount: r.currentLeadCount + 1 } : r
      )
    );
  };

  // Pipeline Metrics
  const totalLeads = leads.length;
  const inPitchCount = leads.filter((l) => l.status === "pitch_in_progress").length;
  const assignedCount = leads.filter((l) => l.status === "assigned").length;
  const closedCount = leads.filter((l) => l.status === "closed_won").length;

  return (
    <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto text-slate-100 font-sans p-3 sm:p-4 lg:p-6 select-none">
      <SampleNotice className="mb-4">Leads, pipeline numbers and conversion figures on this page are sample data. Real counselling and admission results are in Class analytics (Counselling).</SampleNotice>
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-red-800 via-orange-700 to-orange-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden mb-4 sm:mb-6 shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-brand-yellow text-2xs sm:text-xs font-bold uppercase tracking-wider mb-2 border border-white/20 max-w-full">
              <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Admissions Sales Engine & Automated Lead Assignment</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
              Sales Representative Command Hub & CRM Connect
            </h1>
            <p className="text-sm text-amber-100 max-w-2xl mt-1">
              Multi-factor algorithmic lead matching based on language affinity, grade specialization, and real-time bandwidth. 1-click joining for high-converting 1:1 demo & pitch rooms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:shrink-0">
            <button
              onClick={() => setActiveView("room_bomber")}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Room Bomber Grid</span>
            </button>
            <button
              onClick={() => setActiveView("crm")}
              className="px-4 py-2.5 rounded-xl bg-brand-navy-deep hover:bg-brand-navy-ink border border-blue-400/30 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Database className="w-4 h-4 text-cyan-300" />
              <span>CRM Webhook Matrix</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-2xs font-bold text-amber-200 uppercase tracking-wider block">
              Inbound CRM Leads
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Users className="shrink-0 self-center w-4 h-4 text-brand-yellow" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{totalLeads}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Total Prospects</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-2xs font-bold text-amber-200 uppercase tracking-wider block">
              Active Pitch Sessions
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <Zap className="shrink-0 self-center w-4 h-4 text-amber-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{inPitchCount}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Live Breakouts</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-2xs font-bold text-amber-200 uppercase tracking-wider block">
              Assigned & Ready
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <UserCheck className="shrink-0 self-center w-4 h-4 text-emerald-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{assignedCount}</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Ready to Pitch</span>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-2xs font-bold text-amber-200 uppercase tracking-wider block">
              Average Conversion
            </span>
            <div className="mt-1.5 flex items-baseline gap-x-1.5 gap-y-0.5 flex-wrap min-w-0">
              <TrendingUp className="shrink-0 self-center w-4 h-4 text-cyan-300" />
              <span className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">87.2%</span>
              <span className="text-xs font-semibold text-white/70 leading-tight">Win Rate</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Leads Queue & 1-Click Joining */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Live Admissions Leads & Match Queue</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Auto-Sync: <span className="text-emerald-400 font-bold">Active</span>
            </span>
          </div>

          <div className="space-y-3">
            {leads.map((lead) => {
              const isSelected = selectedLeadId === lead.id;
              const isAssigned = !!lead.assignedRepId;

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl p-4 border transition-all ${
                    lead.status === "pitch_in_progress"
                      ? "bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20"
                      : isAssigned
                      ? "bg-slate-900/90 border-white/10 hover:border-amber-500/40"
                      : "bg-amber-950/20 border-amber-500/30"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md">
                        {lead.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-sm">{lead.studentName}</h3>
                          <span className="px-2 py-0.5 rounded text-2xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Grade {lead.gradeLevel} · {lead.curriculum}
                          </span>
                          <span className="px-2 py-0.5 rounded text-2xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lead.preferredLanguage}
                          </span>
                          <span className="px-2 py-0.5 rounded text-2xs font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Score {lead.leadScore}/100
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          Parent: <strong className="text-slate-200">{lead.parentName}</strong> ({lead.parentEmail}) · {lead.parentPhone}
                        </p>
                        <p className="text-2xs text-slate-500 mt-0.5">
                          CRM Source: <span className="text-slate-300 font-medium">{lead.crmSource}</span> · Timezone: {lead.timezone}
                        </p>
                      </div>
                    </div>

                    {/* Right Action: 1-Click Join or Auto-Assign */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2 md:shrink-0">
                      {isAssigned ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            onClick={() => handleJoinPitchRoom(lead)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>1-Click Join Pitch Room</span>
                          </button>
                          {lead.pitchRoomUrl && (
                            <div className="flex items-center gap-1.5 text-2xs text-slate-400 font-mono">
                              <span>{lead.pitchRoomCode}</span>
                              <button
                                onClick={() => handleCopyLink(lead.pitchRoomUrl!)}
                                className="p-1 hover:text-white transition-colors"
                                title="Copy Room Link"
                              >
                                {copiedLink === lead.pitchRoomUrl ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAutoAssignLead(lead.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Run Smart Auto-Assign</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Assignment Rationale Banner */}
                  {lead.assignmentReason && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-2xs text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        <span><strong>Assigned to:</strong> {lead.assignedRepName}</span>
                      </div>
                      <div className="text-2xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                        Logic: {lead.assignmentReason}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Rep Roster & Inbound Webhook Simulator */}
        <div className="space-y-6">
          {/* Active Sales Reps Matrix */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Admissions Counselors Roster</h3>
              </div>
              <span className="text-2xs font-mono text-slate-400">{reps.length} Reps</span>
            </div>

            <div className="space-y-2.5">
              {reps.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: rep.avatarColor }}
                    >
                      {rep.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{rep.name}</p>
                      <p className="text-2xs text-slate-400 truncate">
                        {rep.languages.join(", ")} · {rep.salesCluster.split(" ")[0]}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {rep.conversionRatePercent}% Win
                    </span>
                    <p className="text-2xs text-slate-500 font-mono">
                      Load: {rep.currentLeadCount}/{rep.maxConcurrentLeads}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulate Inbound CRM Webhook Form */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-white text-sm">CRM Inbound Webhook Simulator</h3>
            </div>
            <p className="text-xs text-slate-400">
              Test live lead dispatch from HubSpot, Salesforce, or LeadSquared through the API assignment algorithm.
            </p>

            <form onSubmit={handleSimulateCrmInbound} className="space-y-3 text-xs">
              <div>
                <label className="block text-2xs font-semibold text-slate-300 mb-1">
                  CRM Source API
                </label>
                <select
                  value={newCrmSource}
                  onChange={(e) => setNewCrmSource(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="HubSpot Education">HubSpot Education Hub</option>
                  <option value="Salesforce Enterprise">Salesforce Enterprise</option>
                  <option value="LeadSquared">LeadSquared Education</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 mb-1">
                    Parent Name
                  </label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 mb-1">
                    Grade Level
                  </label>
                  <select
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Hindi">Hindi</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSimulatingCrm}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSimulatingCrm ? "Assigning via Logic..." : "Simulate Inbound Lead & Auto-Assign"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
