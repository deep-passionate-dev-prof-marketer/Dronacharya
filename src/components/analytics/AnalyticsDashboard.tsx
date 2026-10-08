import { EngagementInsightsPanel } from "../engagement/EngagementInsightsPanel";
import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  BarChart3,
  TrendingUp,
  Award,
  Sparkles,
  ShieldAlert,
  Users,
  Clock,
  Radio,
  BookOpen,
  Zap,
} from "lucide-react";
import { requestAdaptivePathway, AdaptivePathwayResponse } from "../../services/geminiService";

export const AnalyticsDashboard: React.FC = () => {
  const { participants, breakoutRooms, userXp, badges } = useClassroom();

  // Adaptive Pathway State
  const [selectedStudent, setSelectedStudent] = useState("Sophia Chen");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState("Intermediate");
  const [weakTopics, setWeakTopics] = useState("Eigenvalue Decomposition, Dephasing noise");
  const [scorePercentage, setScorePercentage] = useState(84);
  const [isGeneratingPathway, setIsGeneratingPathway] = useState(false);
  const [pathwayResult, setPathwayResult] = useState<AdaptivePathwayResponse | null>(null);

  const handleGeneratePathway = async () => {
    setIsGeneratingPathway(true);
    try {
      const res = await requestAdaptivePathway({
        studentName: selectedStudent,
        skillLevel: selectedSkillLevel,
        weakTopics: weakTopics.split(",").map((s) => s.trim()),
        scorePercentage,
        currentTopic: "Quantum Mechanics & Superconducting Circuits",
      });
      setPathwayResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPathway(false);
    }
  };

  // Pre-seed an initial pathway for instant preview
  React.useEffect(() => {
    handleGeneratePathway();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] overflow-y-auto select-none p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-4 lg:gap-6">
        <EngagementInsightsPanel />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">Sample data below · cohort widgets not yet connected to live data</p>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>STEM Engagement Analytics & Real-Time Monitoring</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-dimensional cohort metrics, breakout health indicators, and AI adaptive learning roadmaps
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/50">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Telemetry: Live Active Stream</span>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1 shadow-md">
            <span className="text-xs text-slate-400 font-medium">Cohort Engagement Index</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">94.8%</span>
              <span className="text-xs text-emerald-400 font-mono">+3.2% vs avg</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500 w-[94.8%]" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1 shadow-md">
            <span className="text-xs text-slate-400 font-medium">Active Participation Ratio</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">5 / 6</span>
              <span className="text-xs text-slate-400">Students Active</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div className="h-full bg-indigo-500 w-[83%]" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1 shadow-md">
            <span className="text-xs text-slate-400 font-medium">Lab Quiz Mastery Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">88.5%</span>
              <span className="text-xs text-indigo-400 font-mono">High Honors</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div className="h-full bg-cyan-500 w-[88.5%]" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1 shadow-md">
            <span className="text-xs text-slate-400 font-medium">Accumulated Cohort XP</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">{userXp} XP</span>
              <span className="text-xs text-amber-400 font-mono">Tier 1</span>
            </div>
            <div className="w-full h-1 rounded-full bg-slate-800 mt-2 overflow-hidden">
              <div className="h-full bg-amber-500 w-[72%]" />
            </div>
          </div>
        </div>

        {/* Middle row: Real-time monitoring & Class Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-Time Classroom Monitoring Console (Requirement 23) */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-white">
                  Real-Time Classroom & Breakout Monitoring Console
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">All Rooms Healthy</span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Main Hall */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Main Lecture Hall</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Presenter: Dr. Evelyn Vance · Screen Share Active
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Noise: 14dB (Optimal)</span>
                </div>
              </div>

              {/* Breakout rooms */}
              {breakoutRooms.map((bo) => (
                <div
                  key={bo.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-medium text-white">{bo.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{bo.topic}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-300">
                    <span>{bo.participantIds.length} Students Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gamified Leaderboard & Badges (Requirement 32) */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-white">
                  STEM Cohort Leaderboard & Milestone Badges
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-300">Top Performers</span>
            </div>

            <div className="flex flex-col gap-2">
              {participants
                .slice()
                .sort((a, b) => b.xpPoints - a.xpPoints)
                .map((student, rank) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-400 w-4">
                        #{rank + 1}
                      </span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: student.avatarColor }}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-slate-200 font-medium">{student.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {student.role} · {student.attendanceStatus}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-amber-400 font-semibold">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{student.xpPoints} XP</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* AI-Powered Personalized Learning Pathways (Requirements 25 & 31) */}
        <div className="rounded-xl bg-slate-900 border border-indigo-500/40 p-6 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>POWERED BY GEMINI 3.8 NEURAL CURRICULUM SPECIALIST</span>
              </div>
              <h2 className="text-sm font-bold text-white">
                Personalized Adaptive Learning Pathway Generator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyzes live laboratory telemetry, quiz performance metrics, and identified conceptual gaps to synthesize tailored mastery tracks.
              </p>
            </div>

            <button
              onClick={handleGeneratePathway}
              disabled={isGeneratingPathway}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shrink-0 shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingPathway ? "Synthesizing Track..." : "Regenerate Pathway"}</span>
            </button>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Current Skill Tier</label>
              <select
                value={selectedSkillLevel}
                onChange={(e) => setSelectedSkillLevel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              >
                <option value="Foundational">Foundational</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced Honors">Advanced Honors</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Target Weak Areas (Comma-separated)
              </label>
              <input
                type="text"
                value={weakTopics}
                onChange={(e) => setWeakTopics(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Generated Pathway Output */}
          {pathwayResult && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span className="text-indigo-300 font-semibold">
                  Track: {pathwayResult.recommendedTrack}
                </span>
                <span>Readiness Score: {pathwayResult.readinessScore}%</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pathwayResult.modules.map((mod: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-indigo-400 mb-1">
                        <span>STAGE {idx + 1} · {mod.type}</span>
                        <span>{mod.duration}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white leading-snug">{mod.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{mod.reason}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Tier: {mod.difficulty}</span>
                      <button
                        onClick={() => alert(`Enrolled ${selectedStudent} into ${mod.title}.`)}
                        className="text-indigo-400 hover:underline"
                      >
                        Enroll Student →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pathwayResult.aiTip && (
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>AI Pedagogical Recommendation:</strong> {pathwayResult.aiTip}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
