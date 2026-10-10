import React, { useState } from "react";
import { SampleNotice } from "../ui";
import { useClassroom } from "../../context/ClassroomContext";
import { buildMeetingUrl, buildShortMeetingUrl } from "../../services/domainService";
import {
  Workflow,
  Sparkles,
  Zap,
  Globe,
  Link2,
  Copy,
  Check,
  ArrowRight,
  Database,
  Radio,
  Layers,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CrmProvisionedRoom {
  id: string;
  crmSource: string;
  cohortName: string;
  roomSlug: string;
  shortCode: string;
  shortUrl: string;
  assignedTeacher: {
    name: string;
    email: string;
    qualityScore: number;
  };
  studentCount: number;
  primaryContactEmail: string;
  status: "provisioned" | "active" | "completed";
  provisionedAt: string;
}

export const CrmRoomIntegrationView: React.FC = () => {
  const { setActiveView, setRoomId, setRoomTitle } = useClassroom();

  const [crmSource, setCrmSource] = useState<string>("Salesforce Enterprise");
  const [schoolBrand, setSchoolBrand] = useState<string>("21kos");
  const [countryCode, setCountryCode] = useState<string>("in");
  const [gradeLevel, setGradeLevel] = useState<number>(10);
  const [curriculum, setCurriculum] = useState<string>("bc");
  const [subject, setSubject] = useState<string>("phy");
  const [cohortName, setCohortName] = useState<string>("Cohort 10-A (Cambridge STEM)");
  const [parentEmail, setParentEmail] = useState<string>("lead.guardian@family.org");
  const [studentCount, setStudentCount] = useState<number>(24);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [provisionedRooms, setProvisionedRooms] = useState<CrmProvisionedRoom[]>([
    {
      id: "crm-1",
      crmSource: "Salesforce Enterprise",
      cohortName: "Cohort 10-A (Cambridge STEM)",
      roomSlug: "in-21kos-gr10-bc-phy-vance",
      shortCode: "8xN2pQ",
      shortUrl: buildShortMeetingUrl("8xN2pQ"),
      assignedTeacher: {
        name: "Dr. Evelyn Vance",
        email: "e.vance@faculty.21k.school",
        qualityScore: 98,
      },
      studentCount: 26,
      primaryContactEmail: "linda.chen@family.org",
      status: "provisioned",
      provisionedAt: "Today 08:30 AM",
    },
    {
      id: "crm-2",
      crmSource: "HubSpot Education Hub",
      cohortName: "Cohort Gr8 (Robotics Alpha)",
      roomSlug: "sg-21klf-gr8-rb-secA-sharma",
      shortCode: "3mK9sR",
      shortUrl: buildShortMeetingUrl("3mK9sR"),
      assignedTeacher: {
        name: "Prof. Arjun Sharma",
        email: "a.sharma@faculty.21k.school",
        qualityScore: 95,
      },
      studentCount: 20,
      primaryContactEmail: "guardian.sg@parent.org",
      status: "provisioned",
      provisionedAt: "Today 08:45 AM",
    },
  ]);

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);

    try {
      const res = await fetch("/api/crm/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crmSource,
          cohortName,
          schoolBrand,
          countryCode,
          gradeLevel,
          curriculum,
          subject,
          studentCount,
          primaryContactEmail: parentEmail,
        }),
      });

      const data = await res.json();
      if (data.room) {
        setProvisionedRooms((prev) => [data.room, ...prev]);
      }
    } catch {
      // Fallback local provision
      const slug = `${countryCode}-${schoolBrand}-gr${gradeLevel}-${curriculum}-${subject}`;
      const code = Math.random().toString(36).substring(2, 8);
      const newRoom: CrmProvisionedRoom = {
        id: `crm-${Date.now()}`,
        crmSource,
        cohortName,
        roomSlug: slug,
        shortCode: code,
        shortUrl: buildShortMeetingUrl(code),
        assignedTeacher: {
          name: "Dr. Evelyn Vance",
          email: "e.vance@faculty.21k.school",
          qualityScore: 98,
        },
        studentCount,
        primaryContactEmail: parentEmail,
        status: "provisioned",
        provisionedAt: "Just now",
      };
      setProvisionedRooms((prev) => [newRoom, ...prev]);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleEnterRoom = (room: CrmProvisionedRoom) => {
    setRoomId(room.roomSlug);
    setRoomTitle(room.cohortName);
    setActiveView("classroom");
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-canvas text-slate-100 font-sans p-4 md:p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 lg:gap-6">
        <SampleNotice>The CRM connection here is simulated with example leads; provisioned rooms are not saved to a CRM.</SampleNotice>
        {/* Header */}
        <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center text-white shadow-xs">
              <Database className="w-5 h-5 text-brand-yellow" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-300">
                Automated CRM Room Provisioning & Webhooks
              </h1>
              <p className="text-xs text-slate-400">
                Connect Salesforce, HubSpot, Zoho or LeadSquared to automatically generate hierarchical rooms, base62 shortlinks, and match facilitators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Webhook Endpoint: /api/crm/webhook</span>
            </span>
          </div>
        </div>

        {/* 2 Columns: Webhook Simulator + Recent CRM Provisioned Rooms */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SIMULATOR */}
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-blue-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Zap className="w-4 h-4 text-brand-yellow" />
              <span>Simulate CRM Inbound Webhook</span>
            </h2>

            <form onSubmit={handleSimulateWebhook} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-200 block mb-1">CRM Platform Source</label>
                <select
                  value={crmSource}
                  onChange={(e) => setCrmSource(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                >
                  <option value="Salesforce Enterprise">Salesforce Education Cloud</option>
                  <option value="HubSpot Education Hub">HubSpot Inbound Admissions</option>
                  <option value="Zoho CRM Plus">Zoho CRM Campus Edition</option>
                  <option value="LeadSquared EdTech">LeadSquared Admissions Automation</option>
                  <option value="Custom REST Webhook">Custom Inbound REST Webhook</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-200 block mb-1">Cohort Name</label>
                <input
                  type="text"
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">School Brand</label>
                  <select
                    value={schoolBrand}
                    onChange={(e) => setSchoolBrand(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="21kos">21K Online School (21kos)</option>
                    <option value="21klf">21K Learning Floww (21klf)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Country Server</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="in">India (in)</option>
                    <option value="ae">UAE (ae)</option>
                    <option value="sg">Singapore (sg)</option>
                    <option value="gb">United Kingdom (gb)</option>
                    <option value="us">United States (us)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Grade</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Gr {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Curriculum</label>
                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="bc">British (bc)</option>
                    <option value="ic">Indian (ic)</option>
                    <option value="ac">American (ac)</option>
                    <option value="ib">IB Diploma (ib)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-200 block mb-1">Course</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none cursor-pointer"
                  >
                    <option value="phy">Physics (phy)</option>
                    <option value="cd">Coding (cd)</option>
                    <option value="rb">Robotics (rb)</option>
                    <option value="math">Mathematics (math)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-200 block mb-1">Primary Guardian Email</label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-white/10 bg-white/[0.03] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isProvisioning}
                className="mt-2 w-full py-2.5 px-3 rounded-xl bg-brand-navy hover:bg-brand-navy-ink disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Trigger Inbound CRM Provisioning</span>
              </button>
            </form>
          </div>

          {/* RECENT CRM PROVISIONED ROOMS */}
          <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-white/10 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-sm font-bold text-blue-300 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-brand-blue" />
                <span>Live Provisioned CRM Rooms & Shortcuts</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {provisionedRooms.length} Active Integrations
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {provisionedRooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-xl border border-white/10 hover:border-white/20 p-4 flex flex-col gap-3 transition-colors bg-slate-900/70 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{room.cohortName}</span>
                        <span className="px-2 py-0.5 rounded text-2xs font-bold bg-sky-500/10 text-sky-300 uppercase">
                          {room.crmSource.split(" ")[0]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Lead contact: {room.primaryContactEmail} • {room.studentCount} students enrolled • {room.provisionedAt}
                      </p>
                    </div>

                    <button
                      onClick={() => handleEnterRoom(room)}
                      className="px-3 py-1.5 rounded-xl bg-brand-navy hover:bg-brand-navy-ink text-white text-xs font-bold transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      Enter Room
                    </button>
                  </div>

                  {/* Slug & Shortlink Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/10">
                      <div className="flex flex-col">
                        <span className="text-2xs font-mono text-slate-400">Standard Slug:</span>
                        <span className="font-mono text-xs font-bold text-slate-200 truncate max-w-[200px]">
                          {room.roomSlug}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(buildMeetingUrl(room.roomSlug))}
                        className="p-1 rounded hover:bg-white/10 text-slate-400"
                        title="Copy slug URL"
                      >
                        {copiedLink === buildMeetingUrl(room.roomSlug) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/10">
                      <div className="flex flex-col">
                        <span className="text-2xs font-mono text-slate-400">Base62 Shortlink:</span>
                        <span className="font-mono text-xs font-bold text-brand-blue truncate max-w-[200px]">
                          {room.shortUrl}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(room.shortUrl)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400"
                        title="Copy shortlink"
                      >
                        {copiedLink === room.shortUrl ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Assigned Facilitator Info */}
                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                    <span>
                      Assigned Facilitator: <strong className="text-slate-100">{room.assignedTeacher.name}</strong> ({room.assignedTeacher.email})
                    </span>
                    <span className="font-mono font-bold text-emerald-300">
                      Quality SLA: {room.assignedTeacher.qualityScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
