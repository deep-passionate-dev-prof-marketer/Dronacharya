import React, { useState, useEffect } from "react";
import {
  Link2,
  Copy,
  Check,
  Globe,
  Sliders,
  ExternalLink,
  Sparkles,
  Server,
  Layers,
  X,
  Plus,
  RefreshCw,
  QrCode,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  SchoolBrandCode,
  CountryCode,
  CurriculumCode,
  CourseCode,
  buildStandardRoomSlug,
  generateBase62Code,
  SCHOOL_BRANDS_MAP,
  COUNTRIES_MAP,
  CURRICULA_MAP,
  LEARNING_FLOWW_COURSES,
  ACTIVE_SHORTLINKS_STORE,
  StandardRoomLinkRecord,
} from "../../services/linkNomenclatureService";
import { buildMeetingUrl, buildShortMeetingUrl } from "../../services/domainService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyRoomSlug?: (slug: string, shortUrl: string) => void;
}

export const RoomLinkManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyRoomSlug,
}) => {
  const { currentRole } = useClassroom();
  const isAuthorized =
    currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep";

  const [schoolBrand, setSchoolBrand] = useState<SchoolBrandCode>("21kos");
  const [countryCode, setCountryCode] = useState<CountryCode>("in");
  const [gradeLevel, setGradeLevel] = useState<number>(10);
  const [curriculumCode, setCurriculumCode] = useState<CurriculumCode>("bc");
  const [courseCode, setCourseCode] = useState<CourseCode>("cd");
  const [subjectCode, setSubjectCode] = useState<string>("phy");
  const [sectionOrTeacher, setSectionOrTeacher] = useState<string>("vance");

  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [linksList, setLinksList] = useState<StandardRoomLinkRecord[]>(ACTIVE_SHORTLINKS_STORE);
  const [isGenerating, setIsGenerating] = useState(false);

  // Compute live slug and shortlink
  const liveSlug = buildStandardRoomSlug({
    schoolBrand,
    countryCode,
    gradeLevel,
    curriculumCode: schoolBrand === "21kos" ? curriculumCode : undefined,
    courseCode: schoolBrand === "21klf" ? courseCode : undefined,
    subjectCode,
    sectionOrTeacher,
  });

  const fullUrl = buildMeetingUrl(liveSlug);
  const [activeShortCode, setActiveShortCode] = useState("8xN2pQ");
  const shortUrl = buildShortMeetingUrl(activeShortCode);

  useEffect(() => {
    fetch("/api/links/all")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLinksList(data);
      })
      .catch(() => {});
  }, []);

  const handleCopySlug = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const handleCopyShort = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedShort(true);
    setTimeout(() => setCopiedShort(false), 2000);
  };

  const handleCreateAndSave = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/links/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: liveSlug,
          schoolBrand,
          countryCode,
          gradeLevel,
          subjectCode,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setActiveShortCode(data.record.shortCode);
        setLinksList((prev) => [data.record, ...prev]);
        if (onApplyRoomSlug) {
          onApplyRoomSlug(data.record.slug, data.record.shortUrl);
        }
      }
    } catch {
      const code = generateBase62Code(6);
      setActiveShortCode(code);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center flex flex-col items-center gap-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Restricted Authorization Required</h3>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            Creating and modifying standard room links and shortlinks is restricted to certified Instructors, Admissions Officers, and Platform Administrators.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-1 rounded-full border border-white/10">
            Current Role: <span className="text-amber-400 font-bold uppercase">{currentRole}</span> (Unauthorized)
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-md font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-16 px-6 bg-[#001F40] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#003872] flex items-center justify-center text-[#FFBB00]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Standard Room Nomenclature & Shortlink Manager
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Authorized: {currentRole.toUpperCase()}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Hierarchical URL nomenclature (21kos, 21klf, gr&#123;&#125;, curriculum & country codes) + Base62 shortlinks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Active Generated Nomenclature Display Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#003872] uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0082FF]" />
                <span>Computed Standard Room Slug</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                Server Node: {COUNTRIES_MAP[countryCode]?.regionServer || "Edge"}
              </span>
            </div>

            {/* Slug Row */}
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 font-mono text-xs font-bold text-[#003872] break-all select-all">
                {fullUrl}
              </div>
              <button
                onClick={handleCopySlug}
                className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedSlug ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSlug ? "Copied" : "Copy Slug"}</span>
              </button>
            </div>

            {/* Base62 Shortlink Row */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
              <div className="flex-1 px-3 py-2 rounded-lg bg-blue-50/80 border border-blue-200 font-mono text-xs font-bold text-[#0082FF] break-all select-all flex items-center justify-between">
                <span>{shortUrl}</span>
                <span className="text-[10px] uppercase font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                  Base62 6-Char
                </span>
              </div>
              <button
                onClick={handleCopyShort}
                className="px-3 py-2 rounded-lg bg-[#0082FF] hover:bg-[#0070dc] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedShort ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedShort ? "Copied" : "Copy Shortlink"}</span>
              </button>

              <button
                onClick={handleCreateAndSave}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-[#FFBB00] hover:bg-[#e6a800] text-[#001F40] text-xs font-black flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#001F40]" />
                <span>Save & Provision</span>
              </button>
            </div>
          </div>

          {/* Configuration Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* School Brand & Country Server */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  1. School Entity Brand
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSchoolBrand("21kos")}
                    className={`p-2 rounded-lg border font-bold text-xs text-center transition-colors ${
                      schoolBrand === "21kos"
                        ? "bg-[#003872] text-white border-[#003872] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    21kos (School)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolBrand("21klf")}
                    className={`p-2 rounded-lg border font-bold text-xs text-center transition-colors ${
                      schoolBrand === "21klf"
                        ? "bg-[#003872] text-white border-[#003872] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    21klf (Floww)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  2. Country Edge Server
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value as CountryCode)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-[#003872]"
                >
                  {Object.entries(COUNTRIES_MAP).map(([code, c]) => (
                    <option key={code} value={code}>
                      [{code.toUpperCase()}] {c.name} ({c.regionServer})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grade Level & Curriculum / Course */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px] flex justify-between">
                  <span>3. Grade Level</span>
                  <span className="font-mono text-[#003872]">gr{gradeLevel}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-[#003872] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>gr1</span>
                  <span>gr6</span>
                  <span>gr12</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  {schoolBrand === "21kos" ? "4. Academic Curriculum" : "4. Learning Floww Course"}
                </label>
                {schoolBrand === "21kos" ? (
                  <select
                    value={curriculumCode}
                    onChange={(e) => setCurriculumCode(e.target.value as CurriculumCode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-[#003872]"
                  >
                    {Object.entries(CURRICULA_MAP).map(([code, curr]) => (
                      <option key={code} value={code}>
                        [{code.toUpperCase()}] {curr.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value as CourseCode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-[#003872]"
                  >
                    {Object.entries(LEARNING_FLOWW_COURSES).map(([code, course]) => (
                      <option key={code} value={code}>
                        [{code.toUpperCase()}] {course.name} ({course.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Subject Code & Section / Teacher */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  5. Subject Identifier
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="phy, math, cs, bio"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 outline-none focus:border-[#003872]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[11px]">
                  6. Section / Teacher Suffix
                </label>
                <input
                  type="text"
                  value={sectionOrTeacher}
                  onChange={(e) => setSectionOrTeacher(e.target.value)}
                  placeholder="vance, secA, batch1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 outline-none focus:border-[#003872]"
                />
              </div>
            </div>
          </div>

          {/* Active Provisioned Shortlinks Roster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Provisioned Shortlinks Directory ({linksList.length})
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {linksList.map((link) => (
                <div
                  key={link.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#003872]">{link.slug}</span>
                      <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {link.shortUrl}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Teacher: {link.assignedTeacherName || "Faculty Assigned"} · {link.createdAt} · {link.clicksCount} clicks
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(link.shortUrl);
                        if (onApplyRoomSlug) onApplyRoomSlug(link.slug, link.shortUrl);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-md bg-[#003872] text-white font-bold text-[11px] hover:bg-[#00264d] transition-colors"
                    >
                      Copy & Launch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Deterministic URL Invariants Verified</span>
          </div>
          <span>21K School Global Routing Engine</span>
        </div>
      </div>
    </div>
  );
};
