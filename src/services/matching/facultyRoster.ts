/**
 * Canonical faculty roster, shared by the server (booking/matching API) and the browser.
 * One ID per teacher everywhere (these IDs are also the teacher's login/user ID).
 *
 * Availability is weekly, in the teacher's own IANA timezone.
 */
export interface WeeklySlot {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** "HH:MM", 24h, teacher-local */
  start: string;
  end: string;
}

export interface FacultyProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  countryIso2: string;
  countryIso3: string;
  country: string;
  state: string;
  city: string;
  timezone: string;
  /** Primary BCP-47 language tag, e.g. "hi-IN" */
  languageTag: string;
  /** ISO 639-1 codes the teacher can teach in */
  languages: string[];
  subjects: string[];
  grades: [number, number];
  /** Curriculum codes (ic/bc/ac/ib) and Learning Floww course codes (cd/rb/ai/ds/dm) */
  programs: string[];
  qualityScore: number;
  yearsExperience: number;
  /** Largest class this teacher runs (1:N) */
  maxClassSize: number;
  maxWeeklyHours: number;
  weeklySlots: WeeklySlot[];
  status: "available" | "in_class" | "offline" | "on_leave";
  isSubstituteEligible: boolean;
  accreditations: string[];
}

const weekdays = (start: string, end: string): WeeklySlot[] => [1, 2, 3, 4, 5].map((day) => ({ day, start, end }));

export const FACULTY_ROSTER: FacultyProfile[] = [
  {
    id: "tch-vance",
    name: "Dr. Evelyn Vance",
    email: "e.vance@faculty.21k.school",
    avatarColor: "#003872",
    countryIso2: "IN",
    countryIso3: "IND",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    timezone: "Asia/Kolkata",
    languageTag: "en-IN",
    languages: ["en", "hi", "fr"],
    subjects: ["Quantum Physics", "Physics", "Linear Algebra", "Applied STEM"],
    grades: [8, 12],
    programs: ["ic", "bc", "ib"],
    qualityScore: 98,
    yearsExperience: 14,
    maxClassSize: 24,
    maxWeeklyHours: 24,
    weeklySlots: [...weekdays("09:00", "18:00"), { day: 6, start: "10:00", end: "13:00" }],
    status: "available",
    isSubstituteEligible: true,
    accreditations: ["CBSE Senior Faculty", "Cambridge IGCSE Examiner"],
  },
  {
    id: "tch-sharma",
    name: "Prof. Arjun Sharma",
    email: "a.sharma@faculty.21k.school",
    avatarColor: "#0082FF",
    countryIso2: "IN",
    countryIso3: "IND",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    timezone: "Asia/Kolkata",
    languageTag: "hi-IN",
    languages: ["hi", "en", "de"],
    subjects: ["Robotics", "Coding", "Artificial Intelligence", "Computer Science"],
    grades: [5, 12],
    programs: ["ic", "cd", "rb", "ai"],
    qualityScore: 95,
    yearsExperience: 10,
    maxClassSize: 20,
    maxWeeklyHours: 22,
    weeklySlots: weekdays("10:00", "19:00"),
    status: "available",
    isSubstituteEligible: true,
    accreditations: ["ROS Certified", "Google AI Educator"],
  },
  {
    id: "tch-iyer",
    name: "Dr. Ananya Iyer",
    email: "a.iyer@faculty.21k.school",
    avatarColor: "#7C3AED",
    countryIso2: "AE",
    countryIso3: "ARE",
    country: "United Arab Emirates",
    state: "Dubai",
    city: "Dubai",
    timezone: "Asia/Dubai",
    languageTag: "en-AE",
    languages: ["en", "ar", "hi", "ta"],
    subjects: ["Mathematics", "Data Science", "Higher Calculus", "Bio-Sciences"],
    grades: [6, 12],
    programs: ["ib", "ac", "bc", "ds"],
    qualityScore: 96,
    yearsExperience: 12,
    maxClassSize: 24,
    maxWeeklyHours: 22,
    weeklySlots: [0, 1, 2, 3, 4].map((day) => ({ day, start: "08:00", end: "16:00" })),
    status: "available",
    isSubstituteEligible: true,
    accreditations: ["IB Diploma Examiner"],
  },
  {
    id: "tch-ray",
    name: "Kaelen Ray",
    email: "k.ray@faculty.21k.school",
    avatarColor: "#10B981",
    countryIso2: "SG",
    countryIso3: "SGP",
    country: "Singapore",
    state: "Central",
    city: "Singapore",
    timezone: "Asia/Singapore",
    languageTag: "en-SG",
    languages: ["en", "zh", "ms"],
    subjects: ["Applied STEM", "Coding", "Robotics", "Physics"],
    grades: [4, 10],
    programs: ["bc", "cd", "rb", "dm"],
    qualityScore: 92,
    yearsExperience: 8,
    maxClassSize: 12,
    maxWeeklyHours: 24,
    weeklySlots: weekdays("09:00", "17:00"),
    status: "available",
    isSubstituteEligible: true,
    accreditations: ["MOE Singapore STEM"],
  },
  {
    id: "tch-dubois",
    name: "Claire Dubois",
    email: "c.dubois@faculty.21k.school",
    avatarColor: "#EC4899",
    countryIso2: "GB",
    countryIso3: "GBR",
    country: "United Kingdom",
    state: "Greater London",
    city: "London",
    timezone: "Europe/London",
    languageTag: "en-GB",
    languages: ["en", "fr", "es"],
    subjects: ["Physics", "Chemistry", "Sciences", "Environmental Tech"],
    grades: [7, 12],
    programs: ["bc", "ib"],
    qualityScore: 94,
    yearsExperience: 11,
    maxClassSize: 24,
    maxWeeklyHours: 22,
    weeklySlots: weekdays("08:00", "16:00"),
    status: "available",
    isSubstituteEligible: true,
    accreditations: ["QTS (UK)", "Cambridge A-Level"],
  },
  {
    id: "tch-schmidt",
    name: "Dr. Marcus Schmidt",
    email: "m.schmidt@faculty.21k.school",
    avatarColor: "#F59E0B",
    countryIso2: "DE",
    countryIso3: "DEU",
    country: "Germany",
    state: "Hesse",
    city: "Frankfurt",
    timezone: "Europe/Berlin",
    languageTag: "de-DE",
    languages: ["de", "en"],
    subjects: ["Quantum Physics", "Higher Mathematics", "Computer Science"],
    grades: [9, 12],
    programs: ["ib", "ac"],
    qualityScore: 97,
    yearsExperience: 16,
    maxClassSize: 16,
    maxWeeklyHours: 22,
    weeklySlots: weekdays("09:00", "15:00"),
    status: "available",
    isSubstituteEligible: false,
    accreditations: ["IB Higher Level Physics"],
  },
];

/** Legacy IDs that older screens/data still use for the lead demo teacher. */
export const LEGACY_TEACHER_IDS: Record<string, string> = {
  "host-1": "tch-vance",
  "tch-1": "tch-vance",
  "tch-2": "tch-sharma",
};

export const canonicalTeacherId = (id: string) => LEGACY_TEACHER_IDS[id] || id;

export const findFaculty = (id: string) => FACULTY_ROSTER.find((f) => f.id === canonicalTeacherId(id));
