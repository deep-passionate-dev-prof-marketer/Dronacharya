import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  X,
  Calendar,
  Download,
  ExternalLink,
  Copy,
  Check,
  Users,
  ShieldCheck,
  ShieldAlert,
  Zap,
  UserCheck,
  Play,
  ArrowRight,
  Clock,
  Globe,
  RefreshCw,
  Sparkles,
  Lock,
  Link2,
  FileText,
  MessageSquare,
} from "lucide-react";
import {
  demoClassService,
  DemoBookingLead,
  generateStudentId,
  generatePassword,
  generateDemoMeetingUrl,
} from "../../services/demoClassService";
import { RoomRatio } from "../../types";

export const ScheduleMeetingModal: React.FC = () => {
  const {
    isScheduleModalOpen,
    setIsScheduleModalOpen,
    roomTitle,
    roomLink,
    setRoomId,
    setActiveView,
    startClass,
    currentRole,
  } = useClassroom();

  // Role Authorization Check: Only Certified Instructors, Admins, and Admissions reps can manually provision rooms/links
  const isAuthorizedToCreate =
    currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep";

  const [activeTab, setActiveTab] = useState<"manual_builder" | "crm_leads" | "custom_schedule">("manual_builder");

  // Manual Room & Link Builder Form States
  const [manualStudentName, setManualStudentName] = useState("Lucas Vance");
  const [manualGrade, setManualGrade] = useState<number>(10);
  const [manualStudentId, setManualStudentId] = useState(() => generateStudentId(10));
  const [manualPassword, setManualPassword] = useState(() => generatePassword(manualStudentId));
  const [manualParentName, setManualParentName] = useState("Eleanor Vance");
  const [manualParentEmail, setManualParentEmail] = useState("parent.vance@21k.family");
  const [manualCourse, setManualCourse] = useState("Quantum Physics & Mechanics");
  const [manualCountry, setManualCountry] = useState("US");
  const [manualLanguage, setManualLanguage] = useState("en");
  const [manualRatio, setManualRatio] = useState<RoomRatio>("1:4");
  const [manualTeacher, setManualTeacher] = useState("Dr. Evelyn Vance");
  const [manualRoomCode, setManualRoomCode] = useState("dronacharya-gr10-phy");
  const [copiedManualLink, setCopiedManualLink] = useState(false);
  const [copiedManualInvite, setCopiedManualInvite] = useState(false);

  // Sync password when studentId changes
  const handleStudentIdChange = (newId: string) => {
    const clean = newId.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 10);
    setManualStudentId(clean);
    setManualPassword(generatePassword(clean));
  };

  const handleRegenerateStudentId = () => {
    const freshId = generateStudentId(manualGrade);
    setManualStudentId(freshId);
    setManualPassword(generatePassword(freshId));
  };

  // Live generated dynamic URL
  const liveGeneratedUrl = generateDemoMeetingUrl({
    roomCode: manualRoomCode,
    studentId: manualStudentId,
    grade: manualGrade,
    course: manualCourse,
    language: manualLanguage,
    ratio: manualRatio,
    teacherName: manualTeacher,
  });

  const handleCopyManualLink = () => {
    // Also persist lead in demo queue for teacher tracking
    demoClassService.createDemoLead({
      studentName: manualStudentName,
      parentName: manualParentName || "Parent",
      parentEmail: manualParentEmail || "parent@21k.family",
      gradeLevel: manualGrade,
      country: manualCountry,
      course: manualCourse,
      preferredLanguage: manualLanguage,
      meetingRatio: manualRatio,
      assignedTeacherId: "tch-1",
      assignedTeacherName: manualTeacher,
      roomCode: manualRoomCode,
      crmSource: "Website Booking",
    });

    navigator.clipboard.writeText(liveGeneratedUrl);
    setCopiedManualLink(true);
    setTimeout(() => setCopiedManualLink(false), 2500);
  };

  const handleCopyManualInvitation = () => {
    const inviteText = `21K School — Live Interactive Demo Class Invitation
--------------------------------------------------
Student: ${manualStudentName} (Grade ${manualGrade})
Course: ${manualCourse}
Format: ${manualRatio} Interactive Cohort
Teacher: ${manualTeacher}
Preferred Language: ${manualLanguage.toUpperCase()}

Direct Student Access Link:
${liveGeneratedUrl}

Student Check-in Credentials:
• Student ID: ${manualStudentId}
• Password: ${manualPassword} (auto-filled on portal)

Real-time 2-way AI Speech Translation across 50+ languages included.
Edge Delivery: Netflix Open Connect Mesh (<20ms latency SLA).`;

    navigator.clipboard.writeText(inviteText);
    setCopiedManualInvite(true);
    setTimeout(() => setCopiedManualInvite(false), 2500);
  };

  const handleLaunchManualRoom = () => {
    demoClassService.createDemoLead({
      studentName: manualStudentName,
      parentName: manualParentName || "Parent",
      parentEmail: manualParentEmail || "parent@21k.family",
      gradeLevel: manualGrade,
      country: manualCountry,
      course: manualCourse,
      preferredLanguage: manualLanguage,
      meetingRatio: manualRatio,
      assignedTeacherId: "tch-1",
      assignedTeacherName: manualTeacher,
      roomCode: manualRoomCode,
      crmSource: "Website Booking",
    });

    setRoomId(manualRoomCode);
    setActiveView("classroom");
    setIsScheduleModalOpen(false);
    startClass();
  };

  const [sessionName, setSessionName] = useState("Quantum Physics Lab: Entanglement & Bell Tests");
  const [sessionDate, setSessionDate] = useState("2026-10-12");
  const [sessionTime, setSessionTime] = useState("10:00");
  const [durationMins, setDurationMins] = useState(60);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [roomCategory, setRoomCategory] = useState<"21K School" | "21K Learning Floww">("21K School");
  const [subCategoryCode, setSubCategoryCode] = useState<"DC" | "PC" | "DCC" | "CAC" | "SCC">("PC");
  const [capacityRatio, setCapacityRatio] = useState<string>("1:4");

  if (!isScheduleModalOpen) return null;

  // Google Calendar URL generation
  const handleOpenGoogleCalendar = () => {
    const startIso = sessionDate.replace(/-/g, "") + "T" + sessionTime.replace(/:/g, "") + "00Z";
    const endHour = (parseInt(sessionTime.split(":")[0], 10) + 1).toString().padStart(2, "0");
    const endIso = sessionDate.replace(/-/g, "") + "T" + endHour + sessionTime.split(":")[1] + "00Z";
    const title = encodeURIComponent(`[${subCategoryCode}] ${sessionName} (${capacityRatio})`);
    const details = encodeURIComponent(
      `Join the 21K School Dronacharya Live online classroom session:\nCategory: ${roomCategory}\nSubcategory: ${subCategoryCode}\nCapacity: ${capacityRatio}\nRoom Link: ${roomLink}\nEdge Routing: Netflix Open Connect Mesh (<20ms SLA)\nEncrypted WebRTC AES-256.`
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${encodeURIComponent(
      roomLink
    )}`;
    window.open(url, "_blank");
  };

  // .ICS file download
  const handleDownloadIcs = () => {
    const startIso = sessionDate.replace(/-/g, "") + "T" + sessionTime.replace(/:/g, "") + "00Z";
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//21K School//Dronacharya Classroom//EN
BEGIN:VEVENT
SUMMARY:[${subCategoryCode}] ${sessionName}
DESCRIPTION:Join 21K School live video class: ${roomLink} (${roomCategory} - ${capacityRatio})
LOCATION:${roomLink}
DTSTART:${startIso}
DURATION:PT${durationMins}M
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `21k-school-${subCategoryCode.toLowerCase()}-${sessionDate}.ics`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyInvite = () => {
    const text = `Join 21K School Dronacharya Live Online Classroom:
Topic: [${subCategoryCode}] ${sessionName}
Category: ${roomCategory} (${capacityRatio} Capacity)
Date: ${sessionDate} at ${sessionTime} UTC
Direct Room Link: ${roomLink}
Edge Infrastructure: Netflix Open Connect Mesh (<20ms SLA)
Security: Hardware-Accelerated AES-256-GCM`;
    navigator.clipboard.writeText(text);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-5 md:p-6 flex flex-col gap-4 shadow-2xl font-sans text-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FFBB00]" />
            <h2 className="text-sm font-bold text-white">21K School Meeting & Demo Room Manager</h2>
          </div>
          <button
            onClick={() => setIsScheduleModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("manual_builder")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "manual_builder"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#FFBB00]" />
            <span>Manual Link & Room Builder</span>
          </button>
          <button
            onClick={() => setActiveTab("crm_leads")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "crm_leads"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>CRM Leads (Optional)</span>
          </button>
          <button
            onClick={() => setActiveTab("custom_schedule")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "custom_schedule"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar (.ICS/Google)</span>
          </button>
        </div>

        {activeTab === "manual_builder" ? (
          /* Manual Link & Room Builder Tab (Authorization Protected) */
          !isAuthorizedToCreate ? (
            <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center flex flex-col items-center gap-3">
              <ShieldAlert className="w-10 h-10 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Access Restricted · Authorized Faculty Only</h3>
              <p className="text-xs text-rose-200/80 max-w-md leading-relaxed">
                Manual room creation and student credential provisioning is strictly restricted to certified Instructors, Admissions Officers, and Platform Administrators.
              </p>
              <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-1 rounded-full border border-white/10 mt-1">
                Active Role: <span className="text-amber-400 font-bold uppercase">{currentRole}</span> (Unauthorized)
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="text-[11px] text-slate-300 leading-relaxed bg-blue-950/50 p-3 rounded-xl border border-blue-500/30 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300">CRM is Optional:</strong> You have full authorization to manually generate custom meeting links and provision classroom rooms on-demand. Unique Student IDs (<code className="text-emerald-300 font-mono">2-Digit Numeric + 8-Char Alpha</code>) and auto-filled passwords will be provisioned instantly.
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Student Name */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Student Full Name</label>
                  <input
                    type="text"
                    value={manualStudentName}
                    onChange={(e) => setManualStudentName(e.target.value)}
                    placeholder="e.g. Lucas Vance"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Grade Level */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Grade Level</label>
                  <select
                    value={manualGrade}
                    onChange={(e) => {
                      const g = parseInt(e.target.value, 10);
                      setManualGrade(g);
                      const fresh = generateStudentId(g);
                      setManualStudentId(fresh);
                      setManualPassword(generatePassword(fresh));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student ID (Auto-generated with Regenerate button) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-semibold">Student ID (2-Digit + 8-Alpha)</label>
                    <button
                      type="button"
                      onClick={handleRegenerateStudentId}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={manualStudentId}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    maxLength={10}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono font-bold tracking-wider focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                {/* Password (Auto-extracted last 4 chars) */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center justify-between">
                    <span>Auto-filled Password</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Last 4 chars of ID</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={manualPassword}
                      readOnly
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono font-bold tracking-widest cursor-default"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                  </div>
                </div>

                {/* Course / Subject */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Course / Subject</label>
                  <select
                    value={manualCourse}
                    onChange={(e) => setManualCourse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Quantum Physics & Mechanics">Quantum Physics & Mechanics</option>
                    <option value="Robotics & Autonomous AI Systems">Robotics & Autonomous AI Systems</option>
                    <option value="Applied Calculus & Linear Algebra">Applied Calculus & Linear Algebra</option>
                    <option value="Computer Science & Fullstack Engineering">Computer Science & Fullstack Engineering</option>
                    <option value="Biochemistry & Genetics">Biochemistry & Genetics</option>
                    <option value="English Literature & Rhetoric">English Literature & Rhetoric</option>
                    <option value="Space Sciences & Astrophysics">Space Sciences & Astrophysics</option>
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Student Country</label>
                  <select
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="US">United States (US)</option>
                    <option value="IN">India (IN)</option>
                    <option value="SG">Singapore (SG)</option>
                    <option value="AE">United Arab Emirates (AE)</option>
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="AU">Australia (AU)</option>
                  </select>
                </div>

                {/* Preferred Spoken Language */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Preferred Spoken Language (AI Interpreter)</label>
                  <select
                    value={manualLanguage}
                    onChange={(e) => setManualLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="ar">Arabic (ar)</option>
                    <option value="zh">Mandarin Chinese (zh)</option>
                    <option value="ja">Japanese (ja)</option>
                  </select>
                </div>

                {/* Meeting Ratio */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Room Capacity Ratio</label>
                  <select
                    value={manualRatio}
                    onChange={(e) => setManualRatio(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="1:1">1:1 (Private Demo / IEP)</option>
                    <option value="1:2">1:2 (Paired Learning)</option>
                    <option value="1:4">1:4 (Quad Squad Demo - Default)</option>
                    <option value="1:6">1:6 (Specialized Seminar)</option>
                    <option value="1:12">1:12 (Half Cohort Section)</option>
                    <option value="1:24">1:20 - 1:24 (Full Paid Class)</option>
                  </select>
                </div>

                {/* Assigned Teacher */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Assigned Teacher</label>
                  <input
                    type="text"
                    value={manualTeacher}
                    onChange={(e) => setManualTeacher(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Room Code */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Room Code / Slug</label>
                  <input
                    type="text"
                    value={manualRoomCode}
                    onChange={(e) => setManualRoomCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dynamic URL Preview Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Live Generated Meeting Link:</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Ready to Share
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-white/5 font-mono text-[11px] text-cyan-300 truncate select-all">
                  {liveGeneratedUrl}
                </div>
              </div>

              {/* Actions Button Island */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleLaunchManualRoom}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch & Enter Room</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyManualLink}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-950/40 cursor-pointer"
                >
                  {copiedManualLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedManualLink ? "Link Copied!" : "Copy Student Link"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyManualInvitation}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedManualInvite ? <Check className="w-4 h-4 text-emerald-400" /> : <MessageSquare className="w-4 h-4 text-amber-400" />}
                  <span>{copiedManualInvite ? "Invite Copied!" : "Copy Full Invite"}</span>
                </button>
              </div>
            </div>
          )
        ) : activeTab === "crm_leads" ? (
          /* CRM Demo Bookings Tab */
          <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
            <div className="text-[11px] text-slate-400 leading-relaxed bg-blue-950/40 p-2.5 rounded-xl border border-blue-500/20 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FFBB00] shrink-0" />
              <span><strong>CRM Demo Queue Connected:</strong> Student leads booked via website are automatically assigned to your teacher schedule. Unique Student IDs (<code className="text-cyan-300 font-mono">2-digit numeric + 8-char alphabet</code>) and auto-filled passwords have been provisioned.</span>
            </div>

            {demoClassService.getTeacherSchedule("tch-1").map((lead) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{lead.studentName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">{lead.country}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        {lead.studentId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Grade {lead.gradeLevel} · {lead.course} · Ratio {lead.meetingRatio}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">
                    {lead.crmSource}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{lead.scheduledTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
                    <span>Auto-pass:</span>
                    <strong className="text-cyan-300 font-bold">{lead.password}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.meetingUrl);
                      alert(`Meeting link copied for student ${lead.studentName}:\n${lead.meetingUrl}`);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>Copy Student Link</span>
                  </button>

                  <button
                    onClick={() => {
                      setRoomId(lead.roomCode);
                      setActiveView("classroom");
                      setIsScheduleModalOpen(false);
                      startClass();
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch Demo Room</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Custom Session Schedule Tab */
          <>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Session Topic</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                  <select
                    value={roomCategory}
                    onChange={(e) => setRoomCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="21K School">21K School</option>
                    <option value="21K Learning Floww">21K Learning Floww</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Class Type (Subcategory Code)</label>
                  <select
                    value={subCategoryCode}
                    onChange={(e) => setSubCategoryCode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="DC">DC · Demo Classes</option>
                    <option value="PC">PC · Enrolled Primary Classes</option>
                    <option value="DCC">DCC · Doubt Clearance Classes</option>
                    <option value="CAC">CAC · Community Activities Classes</option>
                    <option value="SCC">SCC · Student Collaboration Classes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Capacity Ratio (1:1 to 1:24)</label>
                  <select
                    value={capacityRatio}
                    onChange={(e) => setCapacityRatio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="1:1">1:1 (Private Mentorship / IEP)</option>
                    <option value="1:2">1:2 (Paired Peer Learning)</option>
                    <option value="1:3">1:3 (Triad Lab Problem-Solving)</option>
                    <option value="1:4">1:4 (Quad Small Squad)</option>
                    <option value="1:5">1:5 (Quintet Language Immersion)</option>
                    <option value="1:6">1:6 (Specialized Seminar)</option>
                    <option value="1:8">1:8 (Small Group Studio)</option>
                    <option value="1:12">1:12 (Cohort Half-Section)</option>
                    <option value="1:16">1:16 (Section Collaborative)</option>
                    <option value="1:20">1:20 (Paid Cohort Class)</option>
                    <option value="1:24">1:24 (Full Cohort Class)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Duration</label>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={45}>45 Minutes (Short Session)</option>
                    <option value={60}>60 Minutes (Standard Class)</option>
                    <option value={90}>90 Minutes (Deep Dive & Breakouts)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Start Time (UTC)</label>
                  <input
                    type="time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Integration Buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenGoogleCalendar}
                  className="flex-1 py-2 rounded-lg bg-[#003872] hover:bg-[#00264d] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#FFBB00]" />
                  <span>Add to Google Calendar</span>
                </button>
                <button
                  onClick={handleDownloadIcs}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .iCal (.ics)</span>
                </button>
              </div>

              <button
                onClick={handleCopyInvite}
                className="w-full py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedInvite ? "Invite Copied to Clipboard" : "Copy Meeting Invitation Text"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
