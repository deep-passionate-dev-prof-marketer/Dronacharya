import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { X, Calendar, Download, ExternalLink, Copy, Check, Users, ShieldCheck, Zap, UserCheck, Play, ArrowRight, Clock, Globe } from "lucide-react";
import { demoClassService, DemoBookingLead } from "../../services/demoClassService";

export const ScheduleMeetingModal: React.FC = () => {
  const { isScheduleModalOpen, setIsScheduleModalOpen, roomTitle, roomLink, setRoomId, setActiveView, startClass } = useClassroom();

  const [activeTab, setActiveTab] = useState<"crm_leads" | "custom_schedule">("crm_leads");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col gap-4 shadow-2xl font-sans text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FFBB00]" />
            <h2 className="text-sm font-bold text-white">Schedule 21K School Live Classroom Session</h2>
          </div>
          <button
            onClick={() => setIsScheduleModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("crm_leads")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "crm_leads"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>CRM Demo Bookings ({demoClassService.getTeacherSchedule("tch-1").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("custom_schedule")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "custom_schedule"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Create Custom Schedule</span>
          </button>
        </div>

        {activeTab === "crm_leads" ? (
          /* CRM Demo Bookings Tab */
          <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
            <div className="text-[11px] text-slate-400 leading-relaxed bg-blue-950/40 p-2.5 rounded-xl border border-blue-500/20">
              ⚡ <strong>CRM Demo Queue Connected:</strong> Student leads booked via website are automatically assigned to your teacher schedule. Unique Student IDs (<code className="text-cyan-300">2-digit numeric + 8-char alphabet</code>) and auto-filled passwords have been provisioned.
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
                      <span className="text-[11px]">{lead.countryFlag}</span>
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
