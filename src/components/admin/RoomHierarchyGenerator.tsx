import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { buildMeetingUrl } from "../../services/domainService";
import {
  RoomCategory,
  RoomSubCategory,
  RoomSubCategoryCode,
  MicroSpecialRequest,
  RoomRatio,
} from "../../types";
import {
  Layers,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Play,
  Coffee,
  Globe,
  Clock,
  User,
  HeartHandshake,
  BookOpen,
  Sparkles,
  GitFork,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const RoomHierarchyGenerator: React.FC = () => {
  const {
    roomCategories,
    roomSubCategories,
    generatedRooms,
    createRoomFlow,
    switchActiveRoom,
    activeRoomFlow,
    setActiveView,
    teachers,
  } = useClassroom();

  const [category, setCategory] = useState<RoomCategory>("21K School");
  const [subCategory, setSubCategory] = useState<RoomSubCategory>("Enrolled Classes");
  const [course, setCourse] = useState("Grade 10 Physics: Quantum Mechanics");
  const [language, setLanguage] = useState("English (Global)");
  const [timezone, setTimezone] = useState("IST (UTC+5:30)");
  const [teacherId, setTeacherId] = useState("tch-1");
  const [requestType, setRequestType] = useState<MicroSpecialRequest>("General");
  const [breakMinutes, setBreakMinutes] = useState(10);
  const [roomRatio, setRoomRatio] = useState<RoomRatio>("1:4");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedTeacher = teachers.find((t) => t.id === teacherId) || teachers[0];

  const subCategoryCodes: Record<RoomSubCategory, RoomSubCategoryCode> = {
    "Demo Classes": "DC",
    "Enrolled Classes": "PC",
    "Doubt Clearance Classes": "DCC",
    "Community Activities Classes": "CAC",
    "Student Collaboration Classes": "SCC",
  };

  // Live dynamic shortlink calculation preview
  const currentSubCode = subCategoryCodes[subCategory] || "PC";
  const sanitize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const catPrefix = category === "21K School" ? "21k" : "floww";
  const courseSlug = sanitize(course).slice(0, 18);
  const teacherSlug = sanitize(selectedTeacher.name.split(" ").pop() || "lead").slice(0, 10);
  const tzSlug = sanitize(timezone.split(" ")[0]);
  const reqSlug = requestType !== "General" ? `-${sanitize(requestType).slice(0, 12)}` : "";
  const ratioCode = roomRatio.replace(":", "X");

  const previewRoomCode = `${catPrefix.toUpperCase()}-${currentSubCode}-${ratioCode}-${courseSlug.toUpperCase().slice(0, 8)}-${tzSlug.toUpperCase()}`;
  const previewRoomUrl = buildMeetingUrl(`${catPrefix}-${currentSubCode.toLowerCase()}-${roomRatio.replace(":", "x")}-${courseSlug}-${teacherSlug}-${tzSlug}${reqSlug}`);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCapacity = parseInt(roomRatio.split(":")[1], 10) || 4;
    const newRoom = createRoomFlow({
      name: `${course} · [${currentSubCode}] (${roomRatio})`,
      category,
      subCategory,
      subCategoryCode: currentSubCode,
      microCategory: {
        course,
        language,
        timezone,
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        requestType,
      },
      scheduledBreakMinutes: breakMinutes,
      activeBreak: false,
      studentCapacity: parsedCapacity,
      roomRatio,
    });
    // Copy link
    navigator.clipboard.writeText(newRoom.roomUrl);
    setCopiedId(newRoom.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLaunch = (id: string) => {
    switchActiveRoom(id);
    setActiveView("classroom");
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-navy-deep via-brand-navy to-brand-navy-ink text-white border border-blue-500/60 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold uppercase tracking-wider bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40">
                Hierarchical Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold uppercase tracking-wider bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/40">
                DC · PC · DCC · CAC · SCC
              </span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Dronacharya Multi-Tier Room Flow & Standardized Shortlink Generator
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Construct high-capacity synchronized classrooms across <strong>21K School</strong> and{" "}
              <strong>21K Learning Floww</strong>, with micro-routing tags, scheduled breaks, and standardized URL slugs.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-right">
              <p className="text-2xs text-slate-400 font-mono">Active Rooms Catalog</p>
              <p className="text-lg font-black font-mono text-brand-cyan">
                {generatedRooms.length} Active Flow(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Configuration Builder (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-blue" />
              <span>Hierarchical Room Parameters</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Tier 1 · Tier 2 · Tier 3</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            {/* 1. Category Selector */}
            <div>
              <label className="block text-slate-200 font-bold mb-1.5 uppercase tracking-wider text-2xs">
                1. Category Dimension:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roomCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      category === cat
                        ? "bg-brand-navy-deep text-white border-brand-navy-deep shadow-md font-bold"
                        : "bg-white/[0.03] text-slate-200 border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <p className="text-xs">{cat}</p>
                    <p className="text-2xs opacity-75 mt-0.5">
                      {cat === "21K School" ? "Core K-12 Curriculum" : "Co-Curricular & Special Skills"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Sub-Category Selector */}
            <div>
              <label className="block text-slate-200 font-bold mb-1.5 uppercase tracking-wider text-2xs">
                2. Sub-Category & Link Code:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roomSubCategories.map((sub) => {
                  const code = subCategoryCodes[sub];
                  return (
                    <button
                      type="button"
                      key={sub}
                      onClick={() => setSubCategory(sub)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        subCategory === sub
                          ? "bg-brand-navy text-white border-blue-500/60 shadow-md font-bold"
                          : "bg-white/[0.03] text-slate-200 border-white/10 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="inline-block px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-brand-yellow text-brand-navy-deep mb-1">
                        {code}
                      </span>
                      <p className="text-xs truncate">{sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Micro-Categories Dimensions */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <h4 className="text-2xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-brand-blue" />
                <span>3. Micro-Category Dimensions (Granular Filters)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Course */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-2xs">
                    Course / Subject:
                  </label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900/70 border border-white/15 text-slate-100 text-xs focus:outline-none focus:border-brand-blue"
                    required
                  />
                </div>

                {/* Lead Teacher */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-2xs">
                    Assigned Lead Facilitator:
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900/70 border border-white/15 text-slate-100 text-xs focus:outline-none focus:border-brand-blue"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subjects[0]})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-2xs">
                    Classroom Medium:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900/70 border border-white/15 text-slate-100 text-xs focus:outline-none focus:border-brand-blue"
                  >
                    <option value="English (Global)">English (Global Universal)</option>
                    <option value="Spanish (Castilian & Latin)">Spanish</option>
                    <option value="Hindi (Bilingual)">Hindi</option>
                    <option value="French (Immersion)">French</option>
                    <option value="Arabic (Standard)">Arabic</option>
                    <option value="Mandarin (Standard)">Mandarin</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-2xs">
                    Timezone Cohort:
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900/70 border border-white/15 text-slate-100 text-xs focus:outline-none focus:border-brand-blue"
                  >
                    <option value="IST (UTC+5:30)">IST (UTC+5:30 · India & South Asia)</option>
                    <option value="GMT (UTC+0)">GMT (UTC+0 · UK & Europe)</option>
                    <option value="EST (UTC-5)">EST (UTC-5 · North America East)</option>
                    <option value="PST (UTC-8)">PST (UTC-8 · North America West)</option>
                    <option value="SGT (UTC+8)">SGT (UTC+8 · Singapore & ASEAN)</option>
                    <option value="GST (UTC+4)">GST (UTC+4 · UAE & Middle East)</option>
                  </select>
                </div>
              </div>

              {/* Special Needs / Request Dimension */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-2xs">
                  Special Pedagogical Request / Accommodation:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      "General",
                      "Special Needs (IEP)",
                      "Accelerated Learning",
                      "Dyslexia Accommodation",
                      "Bilingual Support",
                    ] as const
                  ).map((req) => (
                    <button
                      type="button"
                      key={req}
                      onClick={() => setRequestType(req)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        requestType === req
                          ? "bg-brand-blue text-white shadow-xs"
                          : "bg-slate-900/70 text-slate-300 border border-white/15 hover:bg-white/[0.08]"
                      }`}
                    >
                      {req}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Capacity Ratio (1:1 to 1:24) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-2xs flex items-center justify-between">
                  <span>Room Capacity Ratio (1:1 to 1:24 Cohorts):</span>
                  <span className="font-mono text-blue-300 font-bold">Selected: {roomRatio}</span>
                </label>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      "1:1",
                      "1:2",
                      "1:3",
                      "1:4",
                      "1:5",
                      "1:6",
                      "1:8",
                      "1:12",
                      "1:16",
                      "1:24",
                    ] as RoomRatio[]
                  ).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRoomRatio(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        roomRatio === r
                          ? "bg-brand-navy text-brand-yellow ring-1 ring-brand-yellow shadow-xs"
                          : "bg-slate-900/70 text-slate-300 border border-white/15 hover:bg-white/[0.08]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Break Scheduler */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
                  <Coffee className="w-3.5 h-3.5 text-brand-yellow" />
                  <span>Scheduled Room Break:</span>
                </span>
                <div className="flex items-center gap-2">
                  {[5, 10, 15].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setBreakMinutes(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        breakMinutes === m
                          ? "bg-brand-navy-deep text-white"
                          : "bg-slate-900/70 text-slate-200 border border-white/15"
                      }`}
                    >
                      {m} Mins
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Shortlink Live Preview */}
            <div className="p-4 rounded-xl bg-brand-navy-deep text-white space-y-2 border border-blue-500/60">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                  Standardized Shortlink Preview
                </span>
                <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-brand-yellow text-brand-navy-deep">
                  PREFIX: {currentSubCode}
                </span>
              </div>
              <p className="font-mono text-xs text-white truncate bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                {previewRoomUrl}
              </p>
              <p className="text-2xs text-slate-300 font-mono">
                Room Code: <strong className="text-cyan-300">{previewRoomCode}</strong> · Break:{" "}
                {breakMinutes} mins
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue-strong text-white font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Room Flow & Copy Encoded Shortlink</span>
            </button>
          </form>
        </div>

        {/* Right Panel: Hierarchical Tree & Active Rooms Catalog (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Flow Catalog */}
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-blue" />
                <span>Active 21K Rooms Catalog</span>
              </h3>
              <span className="text-xs font-mono font-bold text-brand-blue">
                {generatedRooms.length} Ready
              </span>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {generatedRooms.map((room) => {
                const isCurrent = activeRoomFlow.id === room.id;
                const isCopied = copiedId === room.id;

                return (
                  <div
                    key={room.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-blue-500/10 border-brand-blue shadow-xs"
                        : "bg-white/[0.03] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-brand-yellow text-brand-navy-deep">
                            {room.subCategoryCode}
                          </span>
                          <span className="text-2xs font-semibold text-slate-400">
                            {room.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 leading-snug">
                          {room.name}
                        </h4>
                      </div>

                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          Active Stage
                        </span>
                      )}
                    </div>

                    <div className="text-2xs text-slate-300 space-y-1 mb-2.5">
                      <p className="truncate">
                        Teacher: <strong>{room.microCategory.teacherName}</strong> · TZ:{" "}
                        {room.microCategory.timezone.split(" ")[0]}
                      </p>
                      {room.microCategory.requestType !== "General" && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-2xs bg-purple-500/10 text-purple-300 font-medium">
                          {room.microCategory.requestType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <button
                        onClick={() => handleCopy(room.id, room.roomUrl)}
                        className="flex items-center gap-1 text-2xs font-medium text-slate-300 hover:text-brand-blue transition-colors cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span className="text-emerald-300 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Shortlink</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleLaunch(room.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-navy hover:bg-brand-navy-ink text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Launch Room</span>
                      </button>
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
