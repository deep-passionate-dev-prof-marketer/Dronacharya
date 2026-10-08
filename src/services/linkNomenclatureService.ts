import { buildMeetingUrl, buildShortMeetingUrl } from "./domainService";

export type SchoolBrandCode = "21kos" | "21klf";
export type CountryCode = "in" | "ae" | "sg" | "uk" | "us" | "ca" | "au" | "de";
export type CurriculumCode = "ic" | "bc" | "ac" | "ib";
export type CourseCode = "cd" | "rb" | "ai" | "ds" | "dm";

export interface LinkNomenclatureConfig {
  schoolBrand: SchoolBrandCode;
  countryCode: CountryCode;
  gradeLevel: number; // 1 - 12
  curriculumCode?: CurriculumCode;
  courseCode?: CourseCode;
  subjectCode: string; // e.g. "phy", "math", "chem", "bio"
  sectionOrTeacher?: string; // e.g. "secA", "vance"
}

export interface StandardRoomLinkRecord {
  id: string;
  slug: string; // e.g. "in-21kos-gr10-bc-phy-vance"
  shortCode: string; // e.g. "8xN2pQ"
  fullUrl: string; // e.g. "${window.location.origin}/room/in-21kos-gr10-bc-phy-vance"
  shortUrl: string; // e.g. "${window.location.origin}/s/8xN2pQ"
  schoolBrand: SchoolBrandCode;
  countryCode: CountryCode;
  gradeLevel: number;
  curriculumCode?: CurriculumCode;
  courseCode?: CourseCode;
  subjectCode: string;
  sectionOrTeacher?: string;
  assignedTeacherName?: string;
  createdAt: string;
  clicksCount: number;
}

export const SCHOOL_BRANDS_MAP: Record<SchoolBrandCode, { name: string; domain: string }> = {
  "21kos": { name: "21K Online School", domain: "21kos.school" },
  "21klf": { name: "21K Learning Floww", domain: "21klf.com" },
};

export const COUNTRIES_MAP: Record<CountryCode, { name: string; regionServer: string }> = {
  in: { name: "India", regionServer: "BOM-1 (Mumbai)" },
  ae: { name: "United Arab Emirates", regionServer: "DXB-1 (Dubai)" },
  sg: { name: "Singapore", regionServer: "SIN-1 (Singapore)" },
  uk: { name: "United Kingdom", regionServer: "LHR-1 (London)" },
  us: { name: "United States", regionServer: "JFK-1 (New York)" },
  ca: { name: "Canada", regionServer: "YYZ-1 (Toronto)" },
  au: { name: "Australia", regionServer: "SYD-1 (Sydney)" },
  de: { name: "Germany", regionServer: "FRA-1 (Frankfurt)" },
};

export const CURRICULA_MAP: Record<CurriculumCode, { name: string; description: string }> = {
  ic: { name: "Indian Curriculum", description: "CBSE & ICSE Aligned" },
  bc: { name: "British Curriculum", description: "Cambridge IGCSE & A-Levels" },
  ac: { name: "American Curriculum", description: "US Common Core & AP Honors" },
  ib: { name: "International Baccalaureate", description: "IB MYP & IB Diploma" },
};

export const LEARNING_FLOWW_COURSES: Record<CourseCode, { name: string; category: string }> = {
  cd: { name: "Coding & Algorithms", category: "Computer Science" },
  rb: { name: "Robotics & Embedded Systems", category: "Applied STEM" },
  ai: { name: "Artificial Intelligence & ML", category: "Advanced Technology" },
  ds: { name: "Data Science & Quantum Math", category: "Mathematics" },
  dm: { name: "Digital Media & Game Dev", category: "Creative Tech" },
};

// Base62 generator for deterministic or random shortlinks
const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateBase62Code(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS.charAt(Math.floor(Math.random() * BASE62_CHARS.length));
  }
  return result;
}

export function buildStandardRoomSlug(config: LinkNomenclatureConfig): string {
  const parts: string[] = [];

  // 1. Country Code
  parts.push(config.countryCode.toLowerCase());

  // 2. School Brand
  parts.push(config.schoolBrand.toLowerCase());

  // 3. Grade Level: gr1 to gr12
  parts.push(`gr${config.gradeLevel}`);

  // 4. Curriculum (for 21kos) or Course (for 21klf)
  if (config.schoolBrand === "21klf" && config.courseCode) {
    parts.push(config.courseCode.toLowerCase());
  } else if (config.curriculumCode) {
    parts.push(config.curriculumCode.toLowerCase());
  } else {
    parts.push("bc");
  }

  // 5. Subject Code
  if (config.subjectCode) {
    parts.push(config.subjectCode.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }

  // 6. Optional Section or Teacher Suffix
  if (config.sectionOrTeacher) {
    parts.push(config.sectionOrTeacher.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }

  return parts.join("-");
}

export function parseStandardRoomSlug(slug: string): Partial<LinkNomenclatureConfig> {
  const segments = slug.split("-");
  if (segments.length < 4) return {};

  const countryCode = segments[0] as CountryCode;
  const schoolBrand = segments[1] as SchoolBrandCode;
  const gradeMatch = segments[2].match(/^gr(\d+)$/);
  const gradeLevel = gradeMatch ? parseInt(gradeMatch[1], 10) : 10;
  const currOrCourse = segments[3];
  const subjectCode = segments[4] || "stem";
  const sectionOrTeacher = segments[5];

  return {
    countryCode,
    schoolBrand,
    gradeLevel,
    curriculumCode: ["ic", "bc", "ac", "ib"].includes(currOrCourse) ? (currOrCourse as CurriculumCode) : undefined,
    courseCode: ["cd", "rb", "ai", "ds", "dm"].includes(currOrCourse) ? (currOrCourse as CourseCode) : undefined,
    subjectCode,
    sectionOrTeacher,
  };
}

// In-Memory store of shortened links
export const ACTIVE_SHORTLINKS_STORE: StandardRoomLinkRecord[] = [
  {
    id: "link-1",
    slug: "in-21kos-gr10-bc-phy-vance",
    shortCode: "8xN2pQ",
    fullUrl: buildMeetingUrl("in-21kos-gr10-bc-phy-vance"),
    shortUrl: buildShortMeetingUrl("8xN2pQ"),
    schoolBrand: "21kos",
    countryCode: "in",
    gradeLevel: 10,
    curriculumCode: "bc",
    subjectCode: "phy",
    sectionOrTeacher: "vance",
    assignedTeacherName: "Dr. Evelyn Vance",
    createdAt: "Today 08:30 AM",
    clicksCount: 42,
  },
  {
    id: "link-2",
    slug: "sg-21klf-gr8-rb-secA-sharma",
    shortCode: "3mK9sR",
    fullUrl: buildMeetingUrl("sg-21klf-gr8-rb-secA-sharma"),
    shortUrl: buildShortMeetingUrl("3mK9sR"),
    schoolBrand: "21klf",
    countryCode: "sg",
    gradeLevel: 8,
    courseCode: "rb",
    subjectCode: "robotics",
    sectionOrTeacher: "sharma",
    assignedTeacherName: "Prof. Arjun Sharma",
    createdAt: "Today 08:45 AM",
    clicksCount: 29,
  },
  {
    id: "link-3",
    slug: "ae-21kos-gr11-ib-math-iyer",
    shortCode: "9pL4wE",
    fullUrl: buildMeetingUrl("ae-21kos-gr11-ib-math-iyer"),
    shortUrl: buildShortMeetingUrl("9pL4wE"),
    schoolBrand: "21kos",
    countryCode: "ae",
    gradeLevel: 11,
    curriculumCode: "ib",
    subjectCode: "math",
    sectionOrTeacher: "iyer",
    assignedTeacherName: "Dr. Ananya Iyer",
    createdAt: "Today 09:00 AM",
    clicksCount: 18,
  },
];
