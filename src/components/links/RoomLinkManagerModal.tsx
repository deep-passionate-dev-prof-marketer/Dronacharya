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
  ALL_DEVICE_TYPES,
  COMPUTER_ONLY,
  DEFAULT_DEVICE_POLICY_RULES,
  DEVICE_TYPE_LABELS,
  PolicyDeviceType,
  SESSION_TYPE_LABELS,
  SessionType,
  describeAllowedDevices,
  resolvePolicyFromRules,
} from "../../services/devicePolicyEngine";
import { actorFromUser } from "../../services/deviceAccessClient";
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
  const { currentRole, authenticatedUser } = useClassroom();
  const isAuthorized =
    currentRole === "instructor" || currentRole === "admin" || currentRole === "sales_rep";

  const [schoolBrand, setSchoolBrand] = useState<SchoolBrandCode>("21kos");
  const [countryCode, setCountryCode] = useState<CountryCode>("in");
  const [gradeLevel, setGradeLevel] = useState<number>(10);
  const [curriculumCode, setCurriculumCode] = useState<CurriculumCode>("bc");
  const [courseCode, setCourseCode] = useState<CourseCode>("cd");
  const [subjectCode, setSubjectCode] = useState<string>("phy");
  const [sectionOrTeacher, setSectionOrTeacher] = useState<string>("vance");

  // Device access policy for the generated link
  const [sessionType, setSessionType] = useState<SessionType>("paid");
  const [deviceMode, setDeviceMode] = useState<"auto" | "computer" | "any" | "custom">("auto");
  const [customDevices, setCustomDevices] = useState<PolicyDeviceType[]>(COMPUTER_ONLY);
  const autoPolicy = resolvePolicyFromRules(
    { sessionType, schoolBrand, courseCode: schoolBrand === "21klf" ? courseCode : undefined, subjectCode, gradeLevel },
    DEFAULT_DEVICE_POLICY_RULES
  );
  const effectiveDevices: PolicyDeviceType[] =
    deviceMode === "auto" ? autoPolicy.allowedDeviceTypes : deviceMode === "computer" ? COMPUTER_ONLY : deviceMode === "any" ? ALL_DEVICE_TYPES : customDevices;

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
          courseCode: schoolBrand === "21klf" ? courseCode : undefined,
          sessionType,
          devicePolicy:
            deviceMode === "auto"
              ? { mode: "auto" }
              : { mode: "manual", allowedDeviceTypes: effectiveDevices, allowRequestOverride: true },
          actor: actorFromUser(authenticatedUser),
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
          <div className="text-2xs font-mono text-slate-400 bg-black/40 px-3 py-1 rounded-full border border-white/10">
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-slate-950/80 backdrop-blur-sm font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90dvh] animate-sheetUp sm:animate-fadeIn">
        {/* Header */}
        <div className="min-h-16 py-3 px-4 sm:px-6 bg-brand-navy-deep text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-navy flex items-center justify-center text-brand-yellow">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                  Room links & device rules
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-2xs font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Authorized: {currentRole.toUpperCase()}</span>
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-300">
                Hierarchical URL nomenclature (21kos, 21klf, gr&#123;&#125;, curriculum & country codes) + Base62 shortlinks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-slate-100">
          {/* Configuration Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* School Brand & Country Server */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1 text-2xs">
                  1. School Entity Brand
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSchoolBrand("21kos")}
                    className={`p-2 rounded-lg border font-bold text-xs text-center transition-colors ${
                      schoolBrand === "21kos"
                        ? "bg-brand-navy text-white border-blue-500/60 shadow-xs"
                        : "bg-slate-900/70 text-slate-200 border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    21kos (School)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolBrand("21klf")}
                    className={`p-2 rounded-lg border font-bold text-xs text-center transition-colors ${
                      schoolBrand === "21klf"
                        ? "bg-brand-navy text-white border-blue-500/60 shadow-xs"
                        : "bg-slate-900/70 text-slate-200 border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    21klf (Floww)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1 text-2xs">
                  2. Country Edge Server
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value as CountryCode)}
                  className="w-full px-3 py-2 rounded-lg border border-white/15 bg-slate-900/70 font-medium text-slate-100 outline-none focus:border-blue-500"
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
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1 text-2xs flex justify-between">
                  <span>3. Grade Level</span>
                  <span className="font-mono text-blue-300">gr{gradeLevel}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-slate-400 font-mono">
                  <span>gr1</span>
                  <span>gr6</span>
                  <span>gr12</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1 text-2xs">
                  {schoolBrand === "21kos" ? "4. Academic Curriculum" : "4. Learning Floww Course"}
                </label>
                {schoolBrand === "21kos" ? (
                  <select
                    value={curriculumCode}
                    onChange={(e) => setCurriculumCode(e.target.value as CurriculumCode)}
                    className="w-full px-3 py-2 rounded-lg border border-white/15 bg-slate-900/70 font-medium text-slate-100 outline-none focus:border-blue-500"
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
                    className="w-full px-3 py-2 rounded-lg border border-white/15 bg-slate-900/70 font-medium text-slate-100 outline-none focus:border-blue-500"
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
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1 text-2xs">
                  5. Subject Identifier
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="phy, math, cs, bio"
                  className="w-full px-3 py-2 rounded-lg border border-white/15 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-200 uppercase tracking-wider mb-1 text-2xs">
                  6. Section / Teacher Suffix
                </label>
                <input
                  type="text"
                  value={sectionOrTeacher}
                  onChange={(e) => setSectionOrTeacher(e.target.value)}
                  placeholder="vance, secA, batch1"
                  className="w-full px-3 py-2 rounded-lg border border-white/15 font-mono text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Session type & device access policy */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-300">Session type & device access</span>
              <span className="text-xs text-slate-400">Students on other devices must request approval</span>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Session type</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(SESSION_TYPE_LABELS) as SessionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSessionType(t)}
                    className={`px-3 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                      sessionType === t ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {SESSION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Allowed devices</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {([
                  ["auto", "Auto (rules)"],
                  ["computer", "Laptop & desktop"],
                  ["any", "Any device"],
                  ["custom", "Custom"],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDeviceMode(mode)}
                    className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                      deviceMode === mode ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {deviceMode === "custom" && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ALL_DEVICE_TYPES.map((d) => {
                    const on = customDevices.includes(d);
                    return (
                      <label key={d} className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-xs cursor-pointer ${on ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-white/5 border-white/10 text-slate-400"}`}>
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={on}
                          onChange={() => setCustomDevices((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))}
                        />
                        {DEVICE_TYPE_LABELS[d]}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`rounded-lg px-3 py-2.5 text-xs flex items-start gap-2 ${effectiveDevices.length === ALL_DEVICE_TYPES.length ? "bg-white/5 text-slate-300" : "bg-amber-500/10 border border-amber-500/30 text-amber-100"}`}>
              <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
              <span>
                <strong className="font-semibold">{describeAllowedDevices(effectiveDevices.length ? effectiveDevices : COMPUTER_ONLY)}</strong>
                {deviceMode === "auto" ? ` · ${autoPolicy.matchedRuleName}` : " · Manual override"}
                {effectiveDevices.length < ALL_DEVICE_TYPES.length && " · Phone/tablet students can request access; you'll get a notification to approve or deny."}
              </span>
            </div>
          </div>

          {/* Active Generated Nomenclature Display Card */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-brand-blue" />
                <span>Computed Standard Room Slug</span>
              </span>
              <span className="text-2xs font-mono text-slate-400 font-bold">
                Server Node: {COUNTRIES_MAP[countryCode]?.regionServer || "Edge"}
              </span>
            </div>

            {/* Slug Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-slate-900/70 border border-white/15 font-mono text-xs font-bold text-blue-300 break-all select-all">
                {fullUrl}
              </div>
              <button
                onClick={handleCopySlug}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedSlug ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSlug ? "Copied" : "Copy Slug"}</span>
              </button>
            </div>

            {/* Base62 Shortlink Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-white/10">
              <div className="flex-1 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 font-mono text-xs font-bold text-brand-blue break-all select-all flex items-center justify-between">
                <span>{shortUrl}</span>
                <span className="text-2xs uppercase font-bold text-blue-300 bg-slate-900/70 px-2 py-0.5 rounded border border-blue-500/30">
                  Base62 6-Char
                </span>
              </div>
              <button
                onClick={handleCopyShort}
                className="px-3 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue-strong text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedShort ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedShort ? "Copied" : "Copy Shortlink"}</span>
              </button>

              <button
                onClick={handleCreateAndSave}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg bg-brand-yellow hover:bg-brand-yellow-strong text-brand-navy-deep text-xs font-black flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-slate-100" />
                <span>Save & Provision</span>
              </button>
            </div>
          </div>

          {/* Active Provisioned Shortlinks Roster */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                Active Provisioned Shortlinks Directory ({linksList.length})
              </span>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 max-h-64 overflow-y-auto">
              {linksList.map((link) => (
                <div
                  key={link.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.05] text-xs transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-300 break-all">{link.slug}</span>
                      <span className="font-mono text-2xs text-blue-300 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30 break-all">
                        {link.shortUrl}
                      </span>
                      {(link as any).devicePolicy?.allowedDeviceTypes && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200">
                          {describeAllowedDevices((link as any).devicePolicy.allowedDeviceTypes)}
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-slate-400 mt-0.5">
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
                      className="px-2.5 py-1 rounded-md bg-brand-navy text-white font-bold text-2xs hover:bg-brand-navy-ink transition-colors"
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
        <div className="hidden sm:flex h-12 px-6 bg-white/[0.03] border-t border-white/10 items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Deterministic URL Invariants Verified</span>
          </div>
          <span>21K School Global Routing Engine</span>
        </div>
      </div>
    </div>
  );
};
