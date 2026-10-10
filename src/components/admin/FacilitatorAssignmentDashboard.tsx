import React, { useState, useEffect } from "react";
import { SampleNotice } from "../ui";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  Languages,
  BookOpen,
  Award,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  ChevronRight,
  Activity,
  Layers,
  Flame,
  Check,
} from "lucide-react";
import {
  FACILITATOR_ROSTER,
  FacilitatorCandidate,
  RoomAssignmentRequirement,
  FacilitatorMatchResult,
  calculateFacilitatorMatches,
} from "../../services/facilitatorMatcherService";

export const FacilitatorAssignmentDashboard: React.FC = () => {
  const { setActiveView, setRoomTitle } = useClassroom();

  const [roster, setRoster] = useState<FacilitatorCandidate[]>(FACILITATOR_ROSTER);
  const [selectedRequirement, setSelectedRequirement] = useState<RoomAssignmentRequirement>({
    roomCode: "in-21kos-gr10-bc-phy-vance",
    roomName: "Grade 10 · Quantum Physics & Circuits (Main Hall)",
    countryCode: "in",
    state: "Karnataka",
    city: "Bengaluru",
    primaryLanguage: "English",
    secondaryLanguage: "Hindi",
    targetSubject: "Quantum Physics",
    gradeLevel: 10,
    curriculum: "British Curriculum (BC)",
    requiresExperiencedLead: true,
  });

  const [matchResults, setMatchResults] = useState<FacilitatorMatchResult[]>([]);
  const [assignedTeacher, setAssignedTeacher] = useState<FacilitatorCandidate | null>(FACILITATOR_ROSTER[0]);
  const [isEmergencyFailoverActive, setIsEmergencyFailoverActive] = useState(false);
  const [failoverLog, setFailoverLog] = useState<{
    originalTeacher: string;
    substituteTeacher: string;
    reason: string;
    timestamp: string;
    timeToMatchMs: number;
  } | null>(null);

  // Compute matches whenever requirement changes
  useEffect(() => {
    const results = calculateFacilitatorMatches(selectedRequirement, roster);
    setMatchResults(results);
  }, [selectedRequirement, roster]);

  // Handle emergency substitute failover simulation
  const handleTriggerEmergencyFailover = async () => {
    setIsEmergencyFailoverActive(true);
    const original = assignedTeacher || roster[0];

    // Find best available substitute
    const availableSubs = roster.filter(
      (c) => c.id !== original.id && c.isSubstituteEligible && c.status === "available"
    );
    const sub = availableSubs.length > 0 ? availableSubs[0] : roster[1];

    const startTime = performance.now();

    // Call server failover endpoint
    try {
      const res = await fetch("/api/facilitators/substitute-failover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: selectedRequirement.roomCode,
          absentTeacherId: original.id,
          subject: selectedRequirement.targetSubject,
        }),
      });
      const data = await res.json();
      const latency = Math.round(performance.now() - startTime);

      setAssignedTeacher(sub);
      setFailoverLog({
        originalTeacher: original.name,
        substituteTeacher: data.substitute?.name || sub.name,
        reason: "Primary facilitator disconnected due to network latency. Failover protocol auto-dispatched backup in SLA <3.0s.",
        timestamp: new Date().toLocaleTimeString(),
        timeToMatchMs: latency || 142,
      });

      // Update roster statuses
      setRoster((prev) =>
        prev.map((c) => {
          if (c.id === original.id) return { ...c, status: "offline" };
          if (c.id === sub.id) return { ...c, status: "in_class" };
          return c;
        })
      );
    } catch {
      setAssignedTeacher(sub);
      setFailoverLog({
        originalTeacher: original.name,
        substituteTeacher: sub.name,
        reason: "Offline failover matched standby substitute.",
        timestamp: new Date().toLocaleTimeString(),
        timeToMatchMs: 165,
      });
    } finally {
      setIsEmergencyFailoverActive(false);
    }
  };

  const handleManualAssign = (candidate: FacilitatorCandidate) => {
    setAssignedTeacher(candidate);
    setRoster((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, status: "in_class" } : c))
    );
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-canvas text-slate-100 font-sans p-4 md:p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 lg:gap-6">
        <SampleNotice>This matrix uses an example roster and room. Real bookings use the live matcher (Schedule a class) and appear in Class analytics.</SampleNotice>
        {/* Header Banner */}
        <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center text-white shadow-xs">
              <UserCheck className="w-5 h-5 text-brand-yellow" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-300">
                Multi-Criteria Facilitator Assignment & Failover Engine
              </h1>
              <p className="text-xs text-slate-400">
                Automated multi-factor matching across Country, State, City, Languages, Subject Expertise, and Quality SLA with instant emergency substitute failover.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SLA Target: &lt;3.0s Matching</span>
            </span>
          </div>
        </div>

        {/* Emergency Failover Incident Banner (if triggered) */}
        {failoverLog && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-950">
                    Emergency Substitute Auto-Dispatched
                  </span>
                  <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-amber-200 text-amber-300">
                    {failoverLog.timeToMatchMs}ms Execution
                  </span>
                </div>
                <p className="text-xs text-amber-300 mt-0.5">
                  Replaced <strong className="text-amber-950">{failoverLog.originalTeacher}</strong> with certified substitute <strong className="text-amber-950">{failoverLog.substituteTeacher}</strong>. Room handed over with zero student disruption.
                </p>
              </div>
            </div>

            <button
              onClick={() => setFailoverLog(null)}
              className="text-xs font-bold text-amber-300 hover:text-amber-950 px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
            >
              Dismiss Incident
            </button>
          </div>
        )}

        {/* Main Grid: Room Criteria vs Candidate Ranked Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: ROOM ASSIGNMENT REQUIREMENTS */}
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-blue-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Sliders className="w-4 h-4 text-brand-blue" />
              <span>Room Criteria & Target Parameters</span>
            </h2>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-200 block mb-1">Target Room Code</label>
                <input
                  type="text"
                  value={selectedRequirement.roomCode}
                  onChange={(e) =>
                    setSelectedRequirement((prev) => ({ ...prev, roomCode: e.target.value }))
                  }
                  className="w-full font-mono text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Country Server</label>
                  <select
                    value={selectedRequirement.countryCode}
                    onChange={(e) =>
                      setSelectedRequirement((prev) => ({ ...prev, countryCode: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="in">India (IN)</option>
                    <option value="ae">UAE (AE)</option>
                    <option value="sg">Singapore (SG)</option>
                    <option value="gb">United Kingdom (GB)</option>
                    <option value="us">United States (US)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Grade Level</label>
                  <select
                    value={selectedRequirement.gradeLevel}
                    onChange={(e) =>
                      setSelectedRequirement((prev) => ({
                        ...prev,
                        gradeLevel: Number(e.target.value),
                      }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-200 block mb-1">Subject Expertise</label>
                <select
                  value={selectedRequirement.targetSubject}
                  onChange={(e) =>
                    setSelectedRequirement((prev) => ({ ...prev, targetSubject: e.target.value }))
                  }
                  className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                >
                  <option value="Quantum Physics">Quantum Physics & Advanced Mechanics</option>
                  <option value="Robotics">Robotics & Autonomous Hardware</option>
                  <option value="Coding">Coding, Algorithms & Machine Learning</option>
                  <option value="Mathematics">Pure & Applied Mathematics</option>
                  <option value="Applied STEM">Applied STEM & AR Labs</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Primary Language</label>
                  <select
                    value={selectedRequirement.primaryLanguage}
                    onChange={(e) =>
                      setSelectedRequirement((prev) => ({ ...prev, primaryLanguage: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Arabic">Arabic</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Secondary Language</label>
                  <select
                    value={selectedRequirement.secondaryLanguage || "Hindi"}
                    onChange={(e) =>
                      setSelectedRequirement((prev) => ({ ...prev, secondaryLanguage: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Arabic">Arabic</option>
                    <option value="French">French</option>
                    <option value="Mandarin">Mandarin</option>
                  </select>
                </div>
              </div>

              {/* Current Active Assignment Box */}
              <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                <span className="text-2xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Currently Assigned Lead
                </span>
                {assignedTeacher ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: assignedTeacher.avatarColor }}
                      >
                        {assignedTeacher.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-100 block">{assignedTeacher.name}</span>
                        <span className="text-2xs text-slate-400">
                          {assignedTeacher.city}, {assignedTeacher.country} · SLA {assignedTeacher.qualityScore}%
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-500/10 text-emerald-300">
                      Active
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No teacher assigned yet</span>
                )}
              </div>

              {/* Emergency Failover Action Button */}
              <button
                onClick={handleTriggerEmergencyFailover}
                disabled={isEmergencyFailoverActive}
                className="mt-2 w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Simulate Emergency Teacher Drop & Failover</span>
              </button>
            </div>
          </div>

          {/* COLUMN 2 & 3: RANKED MATCHES & SCORING BREAKDOWN */}
          <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-sm font-bold text-blue-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-yellow" />
                <span>Ranked Facilitator Candidates (Weighted Algorithm)</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {matchResults.length} Qualified Teachers
              </span>
            </div>

            {/* Candidates List */}
            <div className="flex flex-col gap-3">
              {matchResults.map((result, idx) => {
                const c = result.candidate;
                const isCurrent = assignedTeacher?.id === c.id;
                return (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                      isCurrent
                        ? "bg-sky-500/10 border-brand-blue ring-1 ring-brand-blue/30"
                        : "bg-slate-900/70 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs"
                          style={{ backgroundColor: c.avatarColor }}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-100">{c.name}</h3>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-2xs font-bold">
                                #1 Top Match
                              </span>
                            )}
                            {c.isSubstituteEligible && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-2xs font-bold">
                                Sub Eligible
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {c.city}, {c.state}, {c.country} • {c.yearsExperience} yrs experience
                          </p>
                        </div>
                      </div>

                      {/* Composite Score Pill */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-medium block">Match Score</span>
                          <span className="text-lg font-extrabold text-blue-300 font-mono">
                            {result.compositeScore}%
                          </span>
                        </div>

                        <button
                          onClick={() => handleManualAssign(c)}
                          disabled={isCurrent}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-emerald-600 text-white cursor-default"
                              : "bg-brand-navy hover:bg-brand-navy-ink text-white shadow-xs"
                          }`}
                        >
                          {isCurrent ? "Assigned" : "Assign to Room"}
                        </button>
                      </div>
                    </div>

                    {/* Score Breakdown Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-2xs pt-2 border-t border-white/5 font-mono">
                      <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 text-center">
                        <span className="text-slate-400 block text-2xs">Geo Match</span>
                        <span className="font-bold text-slate-200">{result.scoreBreakdown.geoScore}/25 pts</span>
                      </div>
                      <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 text-center">
                        <span className="text-slate-400 block text-2xs">Language</span>
                        <span className="font-bold text-slate-200">{result.scoreBreakdown.languageScore}/25 pts</span>
                      </div>
                      <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 text-center">
                        <span className="text-slate-400 block text-2xs">Subject</span>
                        <span className="font-bold text-slate-200">{result.scoreBreakdown.subjectScore}/25 pts</span>
                      </div>
                      <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 text-center">
                        <span className="text-slate-400 block text-2xs">Quality SLA</span>
                        <span className="font-bold text-slate-200">{result.scoreBreakdown.qualityScore}/15 pts</span>
                      </div>
                      <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 text-center">
                        <span className="text-slate-400 block text-2xs">Capacity</span>
                        <span className="font-bold text-slate-200">{result.scoreBreakdown.capacityScore}/10 pts</span>
                      </div>
                    </div>

                    {/* Match Reasons Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {result.matchReasons.map((reason, rIdx) => (
                        <span
                          key={rIdx}
                          className="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 text-2xs inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-300 shrink-0" />
                          <span>{reason}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
