import { EngagementInsightsPanel } from "../engagement/EngagementInsightsPanel";
import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  ShieldAlert,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Volume2,
  Users,
  FileCheck,
  Save,
  Award,
  RefreshCw,
} from "lucide-react";
import {
  AttentionAudit,
  AudioQualityMetrics,
  ManualRubricParameters,
  QualityScoreProfile,
} from "../../types";

export const AuditorCockpitView: React.FC = () => {
  const {
    participants,
    attentionAudits,
    audioMetrics,
    qualityProfiles,
    updateManualRubricScore,
    roomId,
    roomTitle,
    latencyMs,
  } = useClassroom();

  const teacherAttention: AttentionAudit = attentionAudits["host-1"] || {
    participantId: "host-1",
    name: "Dr. Evelyn Vance",
    role: "instructor" as const,
    eyesOnScreen: true,
    gaze: "center" as const,
    blinkRate: 16,
    headPose: { yaw: 0.5, pitch: -1.2, roll: 0.2 },
    attentionScore: 98,
    engagementLevel: "High Focus" as const,
    distractionAlert: false,
    landmarks: {
      leftEye: [0.35, 0.4],
      rightEye: [0.65, 0.4],
      noseTip: [0.5, 0.55],
      mouthCenter: [0.5, 0.7],
      chin: [0.5, 0.9],
    },
  };

  const teacherAudio = audioMetrics["host-1"] || {
    participantId: "host-1",
    snrDb: 32.4,
    ambientNoiseDb: -48.2,
    packetLossPercent: 0.001,
    jitterMs: 0.6,
    audioLatencyMs: 11.2,
    vocalClarityGrade: "A+" as const,
    clippingDetected: false,
    speechPaceWpm: 128,
  };

  const teacherQualityProfile = qualityProfiles["host-1"] || {
    participantId: "host-1",
    participantName: "Dr. Evelyn Vance",
    role: "instructor" as const,
    autoComputedScore: 97,
    manualRubricScore: 95,
    finalCompositeScore: 96,
    rubricBreakdown: {
      pedagogyDelivery: 24,
      studentInclusivity: 23,
      vocalClarityAcoustics: 24,
      screenEngagementPacing: 24,
    },
    evaluatorNotes: "Exemplary delivery of quantum mechanics fundamentals.",
    lastAuditedAt: "Today, 09:15 AM",
    auditorName: "Quality Assurance Council",
  };

  const [activeTab, setActiveTab] = useState<"overview" | "teacher" | "students" | "rubric">("overview");
  const [selectedStudentId, setSelectedStudentId] = useState(participants[1]?.id || "stu-1");
  const [evaluatorNotes, setEvaluatorNotes] = useState(teacherQualityProfile.evaluatorNotes || "");
  const [rubric, setRubric] = useState<ManualRubricParameters>(
    teacherQualityProfile.rubricBreakdown || {
      pedagogyDelivery: 24,
      studentInclusivity: 23,
      vocalClarityAcoustics: 24,
      screenEngagementPacing: 24,
    }
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveRubric = () => {
    updateManualRubricScore("host-1", rubric, evaluatorNotes);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const exportAuditReportJson = () => {
    const report = {
      school: "21K School & 21K Learning Floww",
      platform: "Dronacharya Live Intelligence & Biometric Audit",
      date: new Date().toISOString(),
      roomId,
      roomTitle,
      latencyMs,
      sub20msSlaMet: latencyMs <= 20,
      teacherProfile: teacherQualityProfile,
      studentAudits: Object.values(attentionAudits).filter((a) => a.role === "student"),
      audioMetrics,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `21K-Dronacharya-Audit-Report-${roomId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const studentAuditList = Object.values(attentionAudits).filter((a) => a.role === "student");
  const collectiveStudentAttentionScore = Math.round(
    studentAuditList.reduce((acc, curr) => acc + curr.attentionScore, 0) / (studentAuditList.length || 1)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080d19] text-slate-100 overflow-hidden font-sans">
      {/* Cockpit Top Bar */}
      <div className="p-4 border-b border-slate-800 bg-[#0d1527] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                21K School Auditor &amp; Quality Evaluator Cockpit
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                AUDITOR MODE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Biometric face tracking attention audit, vocal clarity acoustics &amp; pedagogical quality scores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick tab switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
            {(["overview", "teacher", "students", "rubric"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md capitalize font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={exportAuditReportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Formal Audit Report</span>
          </button>
        </div>
      </div>

      {/* Cockpit Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5">
        {/* Real, consented, on-device engagement signals for this room */}
        <EngagementInsightsPanel />

        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">Sample data below · rubric & legacy widgets</p>
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>TEACHER QUALITY SCORE</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 font-mono mt-1">
              {teacherQualityProfile?.finalCompositeScore || 96} / 100
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              Grade A+ Exemplary Delivery
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>COHORT ATTENTION SCORE</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-400 font-mono mt-1">
              {collectiveStudentAttentionScore}%
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              High Focus across {studentAuditList.length} active learners
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>VOCAL ACOUSTIC SNR</span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 font-mono mt-1">
              {teacherAudio.snrDb} dB
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              Ambient Noise: {teacherAudio.ambientNoiseDb} dB
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>GAZE LOCK RATIO</span>
              <Eye className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-400 font-mono mt-1">
              98.2%
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              0 Distraction alerts recorded
            </div>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {(activeTab === "overview" || activeTab === "teacher") && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Lead Facilitator Biometric Telemetry (Dr. Evelyn Vance)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Evaluation Window: Active Session (09:00 - 10:00 AM)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Facial Tracking Telemetry */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Face Mesh &amp; Attention Audit</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">ATTENTION SCORE</span>
                    <span className="font-bold text-white text-base">{teacherAttention.attentionScore}%</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">ENGAGEMENT LEVEL</span>
                    <span className="font-bold text-emerald-400 text-sm">{teacherAttention.engagementLevel}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">HEAD POSE (Y/P/R)</span>
                    <span className="font-bold text-slate-200 text-xs font-mono">
                      {teacherAttention.headPose.yaw}° / {teacherAttention.headPose.pitch}° / {teacherAttention.headPose.roll}°
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">BLINK FREQUENCY</span>
                    <span className="font-bold text-slate-200 text-xs font-mono">
                      {teacherAttention.blinkRate} blinks/min (Optimal)
                    </span>
                  </div>
                </div>
              </div>

              {/* Audio SNR & Telemetry */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Acoustic SNR &amp; Transmission Integrity</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">VOCAL CLARITY GRADE</span>
                    <span className="font-bold text-emerald-400 text-base">{teacherAudio.vocalClarityGrade}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">SPEECH PACING</span>
                    <span className="font-bold text-slate-200 text-sm font-mono">
                      {teacherAudio.speechPaceWpm} WPM (Ideal)
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">PACKET LOSS / JITTER</span>
                    <span className="font-bold text-slate-200 text-xs font-mono">
                      {teacherAudio.packetLossPercent}% / {teacherAudio.jitterMs}ms
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block font-mono">CLIPPING STATUS</span>
                    <span className="font-bold text-emerald-400 text-xs">
                      {teacherAudio.clippingDetected ? "Clipping" : "Clean Waveform"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Students Attendance & Attention Grid */}
        {(activeTab === "overview" || activeTab === "students") && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Learner Attention &amp; Biometric Audit Matrix</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-900 text-[11px] font-mono text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Attention Score</th>
                    <th className="py-2.5 px-3">Engagement Status</th>
                    <th className="py-2.5 px-3">Gaze Angle</th>
                    <th className="py-2.5 px-3">Audio SNR</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {participants
                    .filter((p) => p.role === "student")
                    .map((stu) => {
                      const att = attentionAudits[stu.id];
                      const aud = audioMetrics[stu.id];
                      const score = att ? att.attentionScore : 88;

                      return (
                        <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: stu.avatarColor }}
                            >
                              {stu.name.charAt(0)}
                            </div>
                            <span>{stu.name}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                stu.attendanceStatus === "present"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : stu.attendanceStatus === "late"
                                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                                  : "bg-rose-950 text-rose-400 border border-rose-800"
                              }`}
                            >
                              {stu.attendanceStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-cyan-400">{score}%</span>
                              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    score >= 85 ? "bg-cyan-400" : score >= 70 ? "bg-amber-400" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {att?.engagementLevel || "Attentive"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                            {att?.headPose?.yaw ?? 2.1}° Yaw
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px]">
                            {aud?.snrDb || 28.5} dB ({aud?.vocalClarityGrade || "A"})
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => {
                                setSelectedStudentId(stu.id);
                                setActiveTab("rubric");
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 font-medium transition-colors cursor-pointer"
                            >
                              Audit Rubric
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Manual Rubric Parameters & Formal Certification */}
        {(activeTab === "overview" || activeTab === "rubric") && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Manual Pedagogical Rubric Evaluation (0 - 100)
                </h3>
              </div>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Rubric Saved to 21K School Ledger!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Pedagogy Delivery &amp; Clarity</span>
                    <span className="font-mono font-bold text-amber-400">{rubric.pedagogyDelivery} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={rubric.pedagogyDelivery}
                    onChange={(e) => setRubric({ ...rubric, pedagogyDelivery: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Student Inclusivity &amp; IEP Support</span>
                    <span className="font-mono font-bold text-amber-400">{rubric.studentInclusivity} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={rubric.studentInclusivity}
                    onChange={(e) => setRubric({ ...rubric, studentInclusivity: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Acoustics &amp; Vocal Clarity</span>
                    <span className="font-mono font-bold text-amber-400">{rubric.vocalClarityAcoustics} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={rubric.vocalClarityAcoustics}
                    onChange={(e) => setRubric({ ...rubric, vocalClarityAcoustics: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Screen Engagement &amp; Interactive Pacing</span>
                    <span className="font-mono font-bold text-amber-400">{rubric.screenEngagementPacing} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={rubric.screenEngagementPacing}
                    onChange={(e) => setRubric({ ...rubric, screenEngagementPacing: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Evaluator Notes & Submission */}
              <div className="flex flex-col space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Official Evaluator Observations &amp; Accreditation Remarks:
                </label>
                <textarea
                  value={evaluatorNotes}
                  onChange={(e) => setEvaluatorNotes(e.target.value)}
                  placeholder="Record formal classroom audit notes regarding pedagogy delivery, student participation, room break compliance, and IEP accommodations..."
                  className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-sans min-h-[110px]"
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs font-mono text-slate-400">
                    Total Rubric Score: <span className="text-amber-400 font-bold text-sm">
                      {rubric.pedagogyDelivery + rubric.studentInclusivity + rubric.vocalClarityAcoustics + rubric.screenEngagementPacing} / 100
                    </span>
                  </div>
                  <button
                    onClick={handleSaveRubric}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Evaluation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
