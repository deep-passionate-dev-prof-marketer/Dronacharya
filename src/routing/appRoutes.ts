/**
 * Address-bar URLs that say who you are and where you are:
 *
 *   staff:    /{facilitator|admissions|auditor|admin}/{ISO-3 country}/{lang-tag}/{userId}/{name-slug}/{page}[/{feature}]
 *             e.g. /facilitator/IND/hi-IN/tch-vance/dr-evelyn-vance/live-stage/whiteboard
 *   learners: /learner/{ISO-3 country}/{lang-tag}/{studentCode}/{page}[/{feature}]   (no names of minors in URLs)
 *
 * Shareable class links stay /room/{slug} and /s/{code}.
 */
import type { UserRole } from "../types";

export type AppPage =
  | "classroom"
  | "social"
  | "sales_hub"
  | "room_bomber"
  | "facilitators"
  | "crm"
  | "notebook"
  | "admin"
  | "materials"
  | "analytics"
  | "attendance"
  | "blockchain"
  | "selfhosted"
  | "remote_access"
  | "device_audit";

const ROLE_SEGMENT: Record<string, string> = {
  instructor: "facilitator",
  ta: "facilitator",
  sales_rep: "admissions",
  auditor: "auditor",
  admin: "admin",
  student: "learner",
};
const SEGMENT_ROLE: Record<string, UserRole> = {
  facilitator: "instructor",
  admissions: "sales_rep",
  auditor: "auditor",
  admin: "admin",
  learner: "student",
};

const PAGE_SLUG: Record<AppPage, string> = {
  classroom: "live-stage",
  social: "campus-feed",
  sales_hub: "sales-hub",
  room_bomber: "pitch-rooms",
  facilitators: "faculty-schedule",
  crm: "crm",
  notebook: "notebook",
  admin: "automation-hub",
  materials: "library",
  analytics: "analytics",
  attendance: "attendance",
  blockchain: "credentials",
  selfhosted: "self-hosted",
  remote_access: "remote-access",
  device_audit: "device-access",
};
const SLUG_PAGE = Object.fromEntries(Object.entries(PAGE_SLUG).map(([k, v]) => [v, k])) as Record<string, AppPage>;

/** ISO 3166-1 alpha-2 → alpha-3 for the countries the school operates in (plus common ones). */
const ISO2_TO_ISO3: Record<string, string> = {
  IN: "IND", AE: "ARE", SG: "SGP", GB: "GBR", UK: "GBR", US: "USA", CA: "CAN", AU: "AUS", DE: "DEU", FR: "FRA",
  ES: "ESP", IT: "ITA", NL: "NLD", SA: "SAU", QA: "QAT", KW: "KWT", OM: "OMN", BH: "BHR", NP: "NPL", LK: "LKA",
  BD: "BGD", PK: "PAK", MY: "MYS", ID: "IDN", PH: "PHL", JP: "JPN", CN: "CHN", HK: "HKG", NZ: "NZL", ZA: "ZAF",
  NG: "NGA", KE: "KEN", EG: "EGY", BR: "BRA", MX: "MEX", IE: "IRL", CH: "CHE", SE: "SWE", NO: "NOR", DK: "DNK",
};

/** BCP-47 tag like "hi-IN", "en", "zh-Hant-TW"; 2–22 chars as required. */
export const LANG_TAG_RE = /^(?=.{2,22}$)[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/;
const ISO3_RE = /^[A-Z]{3}$/;

export const slugify = (s: string) =>
  (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "user";

export function toIso3(iso2OrIso3?: string): string {
  const c = (iso2OrIso3 || "").toUpperCase();
  if (ISO3_RE.test(c)) return c;
  return ISO2_TO_ISO3[c] || "INT";
}

export interface RouteIdentity {
  id: string;
  name: string;
  role: string;
  studentCode?: string;
  /** ISO-2 or ISO-3 */
  country?: string;
  languageTag?: string;
}

/** Fills country/language from the profile, falling back to the browser locale. */
export function resolveLocale(identity: RouteIdentity): { iso3: string; lang: string } {
  const browser = typeof navigator !== "undefined" ? navigator.language : "en-IN";
  const lang = identity.languageTag && LANG_TAG_RE.test(identity.languageTag) ? identity.languageTag : LANG_TAG_RE.test(browser) ? browser : "en";
  const region = identity.country || lang.split("-").find((p) => /^[A-Z]{2}$/.test(p)) || "IN";
  return { iso3: toIso3(region), lang };
}

export function buildPath(identity: RouteIdentity, page: AppPage, feature?: string): string {
  const seg = ROLE_SEGMENT[identity.role] || "learner";
  const { iso3, lang } = resolveLocale(identity);
  const pageSlug = PAGE_SLUG[page] || "live-stage";
  const tail = feature ? `/${slugify(feature)}` : "";
  if (seg === "learner") {
    const code = encodeURIComponent(identity.studentCode || identity.id);
    return `/learner/${iso3}/${lang}/${code}/${pageSlug}${tail}`;
  }
  return `/${seg}/${iso3}/${lang}/${encodeURIComponent(identity.id)}/${slugify(identity.name)}/${pageSlug}${tail}`;
}

export interface ParsedRoute {
  role: UserRole;
  iso3: string;
  lang: string;
  userId: string;
  nameSlug?: string;
  page: AppPage;
  feature?: string;
}

export function parsePath(pathname: string): ParsedRoute | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const role = SEGMENT_ROLE[parts[0]];
  if (!role) return null;
  const [_, iso3, lang, userId] = parts;
  if (!iso3 || !ISO3_RE.test(iso3.toUpperCase()) || !lang || !LANG_TAG_RE.test(lang) || !userId) return null;
  const rest = role === "student" ? parts.slice(4) : parts.slice(5);
  const page = SLUG_PAGE[rest[0]];
  if (!page) return null;
  return {
    role,
    iso3: iso3.toUpperCase(),
    lang,
    userId,
    nameSlug: role === "student" ? undefined : parts[4],
    page,
    feature: rest[1],
  };
}
