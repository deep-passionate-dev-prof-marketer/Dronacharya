import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Workflow,
  Layers,
  GraduationCap,
  Users,
  Activity,
  Plus,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { VisualFlowBuilder } from "./VisualFlowBuilder";
import { RoomHierarchyGenerator } from "./RoomHierarchyGenerator";

export const DronacharyaAdminHub: React.FC = () => {
  const {
    gradeRooms,
    createGradeRoom,
    triggerGradeBatchCreation,
    teachers,
    triggerEmergencySubstitute,
    cohorts,
    executionLogs,
    setActiveView,
  } = useClassroom();

  const [activeTab, setActiveTab] = useState<
    "flows" | "hierarchicalRooms" | "gradeRooms" | "teachers" | "cohorts" | "auditLogs"
  >("hierarchicalRooms");

  // Form state for single room creator
  const [selectedGrade, setSelectedGrade] = useState(10);
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedCourse, setSelectedCourse] = useState("Advanced Physics & Mechanics");
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || "");
  const [roomCreatedToast, setRoomCreatedToast] = useState(false);

  // Emergency failover state
  const [failoverTargetRoom, setFailoverTargetRoom] = useState(gradeRooms[0]?.roomCode || "");
  const [failoverToast, setFailoverToast] = useState(false);

  const handleCreateGradeRoom = (e: React.FormEvent) => {
    e.preventDefault();
    createGradeRoom(selectedGrade, selectedSection, selectedCourse, selectedTeacherId);
    setRoomCreatedToast(true);
    setTimeout(() => setRoomCreatedToast(false), 3000);
  };

  const handleTriggerFailover = () => {
    if (!failoverTargetRoom) return;
    triggerEmergencySubstitute(failoverTargetRoom);
    setFailoverToast(true);
    setTimeout(() => setFailoverToast(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#ECECEC] overflow-y-auto select-none">
      {/* 21K School Dronacharya Admin Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E1EDFF] text-[#003872]">
              Campus Operations Engine
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-[#003872]">
              21K School Academic Automation
            </span>
          </div>
          <h1 className="font-headline font-bold text-xl text-[#003872] mt-0.5">
            Dronacharya Operations & Automation Console
          </h1>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
          {[
            { id: "hierarchicalRooms", label: "21K Room Flows & Shortlinks", icon: Sparkles },
            { id: "flows", label: "Automation Flows", icon: Workflow },
            { id: "gradeRooms", label: "Grade & Course Rooms", icon: Layers },
            { id: "teachers", label: "Teachers & Failover", icon: GraduationCap },
            { id: "cohorts", label: "Cohorts & Learners", icon: Users },
            { id: "auditLogs", label: "Execution Logs", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#003872] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notifications */}
      {roomCreatedToast && (
        <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between">
          <span>New encrypted virtual classroom generated and bound to 21K School timetable!</span>
          <button onClick={() => setRoomCreatedToast(false)}>✕</button>
        </div>
      )}

      {failoverToast && (
        <div className="bg-[#FFBB00] text-[#003872] px-6 py-2 text-xs font-bold flex items-center justify-between">
          <span>Emergency substitute facilitator successfully reassigned. Student lobby notified.</span>
          <button onClick={() => setFailoverToast(false)}>✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === "hierarchicalRooms" && (
          <div className="p-6 max-w-7xl w-full mx-auto">
            <RoomHierarchyGenerator />
          </div>
        )}
        {activeTab === "flows" && <VisualFlowBuilder />}

        {/* Tab 2: Grade-Wise & Course-Wise Auto Room Creation */}
        {activeTab === "gradeRooms" && (
          <div className="p-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
            {/* Quick Batch Generator Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#0082FF] uppercase">
                  BATCH AUTOMATION ENGINE
                </span>
                <h3 className="font-headline font-bold text-base text-[#003872] mt-0.5">
                  1-Click Grade-Wide Virtual Room Generation
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Automatically generates isolated section rooms (A, B, C) with teacher allocation, timetable bindings, and student roster links.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[8, 9, 10, 11, 12].map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      triggerGradeBatchCreation(g);
                      setRoomCreatedToast(true);
                      setTimeout(() => setRoomCreatedToast(false), 3000);
                    }}
                    className="px-3 py-2 rounded-lg bg-[#E1EDFF] text-[#003872] hover:bg-[#003872] hover:text-white text-xs font-bold transition-colors"
                  >
                    + Grade {g} Batch
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Single Room Form */}
            <form
              onSubmit={handleCreateGradeRoom}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-headline font-bold text-sm text-[#003872]">
                  Manual Course & Grade Room Provisioner
                </h3>
                <span className="text-xs text-slate-400">Instantly creates active WebRTC classroom</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Grade Level</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(parseInt(e.target.value, 10))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Course Title</label>
                  <input
                    type="text"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Facilitator</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subjects[0]})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] transition-colors shadow-sm"
                >
                  Create Virtual Room
                </button>
              </div>
            </form>

            {/* Active Grade Rooms Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-[#003872]">
                  Provisioned Campus Virtual Rooms ({gradeRooms.length})
                </h3>
                <span className="text-xs font-mono text-emerald-700">AES-256 E2EE Active</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-mono text-[11px] border-b border-slate-200">
                      <th className="p-3 pl-4">Grade & Section</th>
                      <th className="p-3">Course Curriculum</th>
                      <th className="p-3">Assigned Facilitator</th>
                      <th className="p-3">Learners</th>
                      <th className="p-3">Room Code</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {gradeRooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 pl-4 font-bold text-[#003872]">
                          Grade {room.gradeLevel}-{room.section}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{room.courseName}</td>
                        <td className="p-3 text-slate-600">{room.teacherName}</td>
                        <td className="p-3 font-mono text-slate-500">{room.studentCount} enrolled</td>
                        <td className="p-3 font-mono text-[#0082FF]">{room.roomCode}</td>
                        <td className="p-3 font-mono text-slate-500">{room.scheduledTime}</td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            onClick={() => setActiveView("classroom")}
                            className="px-2.5 py-1 rounded-md bg-[#003872]/10 text-[#003872] hover:bg-[#003872] hover:text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <span>Enter Stage</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Teachers Directory & Emergency Failover */}
        {activeTab === "teachers" && (
          <div className="p-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
            {/* Emergency Substitute Failover Control */}
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-slate-900">
                    Emergency Substitute Facilitator Failover
                  </h3>
                  <p className="text-xs text-slate-600 font-sans mt-0.5">
                    If an instructor is disconnected or unverified, this hard operational rule instantly transfers classroom control to an available substitute facilitator.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={failoverTargetRoom}
                  onChange={(e) => setFailoverTargetRoom(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                >
                  {gradeRooms.map((r) => (
                    <option key={r.id} value={r.roomCode}>
                      {r.roomCode} ({r.courseName})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTriggerFailover}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm"
                >
                  Trigger Failover
                </button>
              </div>
            </div>

            {/* Teachers Workload Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.map((teacher) => {
                const workloadPercent = Math.round((teacher.weeklyHours / teacher.maxHours) * 100);
                return (
                  <div
                    key={teacher.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                          style={{ backgroundColor: teacher.avatarColor }}
                        >
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-headline font-bold text-sm text-[#003872]">
                            {teacher.name}
                          </h4>
                          <span className="text-xs text-slate-400 font-mono">{teacher.email}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          teacher.status === "in_class"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {teacher.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 text-xs font-sans">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Certified Subjects:</span>
                        <span className="font-semibold text-slate-800">{teacher.subjects.join(", ")}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Grades Assigned:</span>
                        <span className="font-semibold text-slate-800">
                          Grades {teacher.grades.join(", ")}
                        </span>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>Teaching Capacity</span>
                          <span>
                            {teacher.weeklyHours} / {teacher.maxHours} hrs/wk ({workloadPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              workloadPercent > 80 ? "bg-amber-500" : "bg-[#003872]"
                            }`}
                            style={{ width: `${workloadPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Cohorts & Student Batches */}
        {activeTab === "cohorts" && (
          <div className="p-6 max-w-6xl w-full mx-auto flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="font-headline font-bold text-sm text-[#003872]">
                  Student Cohorts & Batch Allocation
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Pre-configured groups of learners mapped by grade, course specialization, and home facilitator.
                </p>
              </div>

              <button
                onClick={() => alert("CSV student cohort bulk import simulator triggered.")}
                className="px-4 py-2 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] shadow-sm"
              >
                + Import Cohort CSV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#0082FF] uppercase">
                      GRADE {cohort.gradeLevel} SECTION {cohort.section}
                    </span>
                    <h4 className="font-headline font-bold text-sm text-[#003872] mt-0.5">
                      {cohort.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-sans mt-2">
                      Facilitator: <strong>{cohort.primaryTeacher}</strong>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cohort.courseTracks.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{cohort.studentCount} Active Learners</span>
                    <button
                      onClick={() => setActiveView("attendance")}
                      className="text-[#003872] font-bold hover:underline"
                    >
                      View Roster →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Live Execution Audit Logs */}
        {activeTab === "auditLogs" && (
          <div className="p-6 max-w-6xl w-full mx-auto flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="font-headline font-bold text-sm text-[#003872]">
                  Dronacharya Automated Operations Audit Log
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Complete real-time telemetry recording room generation triggers, substitute routing, and compliance events.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400">
                {executionLogs.length} Events Logged Today
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {executionLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs font-sans">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          log.status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.status === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {log.status === "success" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[#003872]">{log.ruleName}</div>
                        <div className="text-slate-700 mt-0.5">{log.actionTaken}</div>
                        <div className="text-slate-400 text-[11px] font-mono mt-1">
                          Trigger: {log.triggerEvent} · {log.details}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-slate-400 text-[11px] shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
