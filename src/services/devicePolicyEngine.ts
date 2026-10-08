/**
 * Device Access Policy Engine (shared by the Express server and the browser).
 *
 * Decides which device form factors may join a room, based on an ordered list
 * of auto-workflow rules (session type, course, brand, grade). Pure functions only:
 * no DOM, no Node APIs, so the same logic runs server-side (authoritative) and
 * client-side (preview in the link generator, offline fallback).
 */

export type PolicyDeviceType = "phone" | "tablet" | "laptop" | "desktop";
export type SessionType = "demo" | "paid" | "trial" | "free" | "internal";
export type ApproverRole = "instructor" | "admin" | "sales_rep" | "auditor";

export const ALL_DEVICE_TYPES: PolicyDeviceType[] = ["phone", "tablet", "laptop", "desktop"];
export const COMPUTER_ONLY: PolicyDeviceType[] = ["laptop", "desktop"];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  demo: "Demo class",
  paid: "Paid class",
  trial: "Free trial",
  free: "Free / open session",
  internal: "Internal / staff",
};

export const DEVICE_TYPE_LABELS: Record<PolicyDeviceType, string> = {
  phone: "Phone",
  tablet: "Tablet",
  laptop: "Laptop",
  desktop: "Desktop",
};

export interface RoomPolicyContext {
  sessionType?: SessionType;
  schoolBrand?: string; // "21kos" | "21klf"
  courseCode?: string; // "cd" | "rb" | "ai" | "ds" | "dm"
  subjectCode?: string;
  gradeLevel?: number;
}

export interface DevicePolicyRule {
  id: string;
  name: string;
  description: string;
  priority: number; // lower runs first
  enabled: boolean;
  match: {
    sessionTypes?: SessionType[];
    courseCodes?: string[];
    schoolBrands?: string[];
    subjectCodes?: string[];
    gradeMin?: number;
    gradeMax?: number;
  };
  allowedDeviceTypes: PolicyDeviceType[];
  allowRequestOverride: boolean;
  approverRoles: ApproverRole[];
}

export interface ResolvedDevicePolicy {
  mode: "auto" | "manual";
  allowedDeviceTypes: PolicyDeviceType[];
  allowRequestOverride: boolean;
  approverRoles: ApproverRole[];
  matchedRuleId: string | null;
  matchedRuleName: string;
  reason: string;
}

export const DEFAULT_DEVICE_POLICY_RULES: DevicePolicyRule[] = [
  {
    id: "rule-demo-computer",
    name: "Demo classes need a laptop or desktop",
    description: "Demo sessions are the first impression. Students must join from a laptop or desktop so the full classroom (whiteboard, labs, screen share) works.",
    priority: 10,
    enabled: true,
    match: { sessionTypes: ["demo"] },
    allowedDeviceTypes: COMPUTER_ONLY,
    allowRequestOverride: true,
    approverRoles: ["instructor", "admin", "sales_rep"],
  },
  {
    id: "rule-paid-computer",
    name: "Paid classes need a laptop or desktop",
    description: "Enrolled (paid) classes require a laptop or desktop for assessments, coding labs and proctored activities.",
    priority: 20,
    enabled: true,
    match: { sessionTypes: ["paid"] },
    allowedDeviceTypes: COMPUTER_ONLY,
    allowRequestOverride: true,
    approverRoles: ["instructor", "admin"],
  },
  {
    id: "rule-handson-courses",
    name: "Hands-on courses need a laptop or desktop",
    description: "Coding, Robotics, AI/ML, Data Science and Game Dev courses need a keyboard and a full IDE.",
    priority: 30,
    enabled: true,
    match: { courseCodes: ["cd", "rb", "ai", "ds", "dm"] },
    allowedDeviceTypes: COMPUTER_ONLY,
    allowRequestOverride: true,
    approverRoles: ["instructor", "admin"],
  },
];

const OPEN_POLICY: Omit<ResolvedDevicePolicy, "reason"> = {
  mode: "auto",
  allowedDeviceTypes: ALL_DEVICE_TYPES,
  allowRequestOverride: false,
  approverRoles: ["instructor", "admin"],
  matchedRuleId: null,
  matchedRuleName: "No restriction",
};

function ruleMatches(rule: DevicePolicyRule, ctx: RoomPolicyContext): boolean {
  const m = rule.match;
  const lower = (v?: string) => (v || "").toLowerCase();
  if (m.sessionTypes?.length && !(ctx.sessionType && m.sessionTypes.includes(ctx.sessionType))) return false;
  if (m.courseCodes?.length && !m.courseCodes.map(lower).includes(lower(ctx.courseCode))) return false;
  if (m.schoolBrands?.length && !m.schoolBrands.map(lower).includes(lower(ctx.schoolBrand))) return false;
  if (m.subjectCodes?.length && !m.subjectCodes.map(lower).includes(lower(ctx.subjectCode))) return false;
  if (m.gradeMin != null && (ctx.gradeLevel == null || ctx.gradeLevel < m.gradeMin)) return false;
  if (m.gradeMax != null && (ctx.gradeLevel == null || ctx.gradeLevel > m.gradeMax)) return false;
  return true;
}

/** Runs the auto-workflow rules (first match by priority wins). */
export function resolvePolicyFromRules(ctx: RoomPolicyContext, rules: DevicePolicyRule[]): ResolvedDevicePolicy {
  const ordered = [...rules].filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  const hit = ordered.find((r) => ruleMatches(r, ctx));
  if (!hit) {
    return { ...OPEN_POLICY, reason: "No device rule applies to this session. Any device can join." };
  }
  return {
    mode: "auto",
    allowedDeviceTypes: hit.allowedDeviceTypes,
    allowRequestOverride: hit.allowRequestOverride,
    approverRoles: hit.approverRoles,
    matchedRuleId: hit.id,
    matchedRuleName: hit.name,
    reason: hit.description,
  };
}

/** Best-effort room context from a standard slug, e.g. "sg-21klf-gr8-rb-robotics-sharma". */
export function inferContextFromSlug(slug: string): RoomPolicyContext {
  const parts = (slug || "").toLowerCase().split("-");
  const ctx: RoomPolicyContext = {};
  const brand = parts.find((p) => p === "21kos" || p === "21klf");
  if (brand) ctx.schoolBrand = brand;
  const grade = parts.map((p) => p.match(/^gr(\d{1,2})$/)).find(Boolean);
  if (grade) ctx.gradeLevel = parseInt(grade[1], 10);
  const course = parts.find((p) => ["cd", "rb", "ai", "ds", "dm"].includes(p));
  if (course && brand === "21klf") ctx.courseCode = course;
  if (parts.includes("demo")) ctx.sessionType = "demo";
  return ctx;
}

/**
 * Classifies a User-Agent string on its own. Used server-side to cross-check what
 * the browser claims (a phone in "Request desktop site" mode still sends sec-ch-ua-mobile
 * on Chromium, and most mobile UAs keep "Mobile"). iPadOS in desktop mode is
 * indistinguishable from macOS by UA alone, so that case returns "unknown".
 */
export function classifyUserAgent(ua: string, chUaMobile?: string): PolicyDeviceType | "unknown" {
  const s = ua || "";
  if (chUaMobile === "?1") return "phone";
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(s)) return "tablet";
  if (/Android/i.test(s) && !/Mobile/i.test(s)) return "tablet";
  if (/iPhone|iPod|Android.*Mobile|Windows Phone|Mobile Safari|Opera Mini|IEMobile/i.test(s)) return "phone";
  if (/Macintosh/i.test(s)) return "unknown"; // could be an iPad requesting the desktop site
  if (/Windows NT|X11|Linux x86_64|CrOS/i.test(s)) return "laptop";
  return "unknown";
}

const RANK: Record<PolicyDeviceType, number> = { phone: 0, tablet: 1, laptop: 2, desktop: 3 };

/** When client and server disagree, trust the more restrictive (smaller) form factor. */
export function reconcileDeviceType(
  claimed: PolicyDeviceType,
  serverSeen: PolicyDeviceType | "unknown"
): { effective: PolicyDeviceType; integrity: "consistent" | "mismatch" | "unverifiable" } {
  if (serverSeen === "unknown") return { effective: claimed, integrity: "unverifiable" };
  const sameClass = (t: PolicyDeviceType) => (t === "laptop" || t === "desktop" ? "computer" : t);
  if (sameClass(serverSeen) === sameClass(claimed)) return { effective: claimed, integrity: "consistent" };
  return {
    effective: RANK[serverSeen] < RANK[claimed] ? serverSeen : claimed,
    integrity: "mismatch",
  };
}

export function isDeviceAllowed(policy: Pick<ResolvedDevicePolicy, "allowedDeviceTypes">, device: PolicyDeviceType): boolean {
  return policy.allowedDeviceTypes.includes(device);
}

export function describeAllowedDevices(types: PolicyDeviceType[]): string {
  if (ALL_DEVICE_TYPES.every((t) => types.includes(t))) return "Any device";
  if (types.length === 2 && types.includes("laptop") && types.includes("desktop")) return "Laptop or desktop only";
  return types.map((t) => DEVICE_TYPE_LABELS[t]).join(", ") + " only";
}
