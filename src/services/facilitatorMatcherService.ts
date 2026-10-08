export interface FacilitatorCandidate {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  country: string;
  countryCode: string;
  state: string;
  city: string;
  languages: string[];
  subjects: string[];
  qualityScore: number; // 0 - 100
  vocalClarityScore: number; // 0 - 100
  pedagogyScore: number; // 0 - 100
  activeWeeklyHours: number;
  maxWeeklyHours: number;
  status: "available" | "in_class" | "offline";
  currentRoomCode?: string;
  isSubstituteEligible: boolean;
  yearsExperience: number;
  accreditations: string[];
}

export interface RoomAssignmentRequirement {
  roomCode: string;
  roomName: string;
  countryCode: string;
  state?: string;
  city?: string;
  primaryLanguage: string;
  secondaryLanguage?: string;
  targetSubject: string;
  gradeLevel: number;
  curriculum: string;
  requiresExperiencedLead?: boolean;
}

export interface FacilitatorMatchResult {
  candidate: FacilitatorCandidate;
  compositeScore: number; // 0 - 100
  scoreBreakdown: {
    geoScore: number; // max 25
    languageScore: number; // max 25
    subjectScore: number; // max 25
    qualityScore: number; // max 15
    capacityScore: number; // max 10
    penalties: number;
  };
  matchReasons: string[];
  isTopRecommendation: boolean;
}

export const FACILITATOR_ROSTER: FacilitatorCandidate[] = [
  {
    id: "tch-vance",
    name: "Dr. Evelyn Vance",
    email: "e.vance@faculty.21k.school",
    avatarColor: "#003872",
    country: "India",
    countryCode: "in",
    state: "Karnataka",
    city: "Bengaluru",
    languages: ["English", "Hindi", "French"],
    subjects: ["Quantum Physics", "Physics", "Linear Algebra", "Applied STEM"],
    qualityScore: 98,
    vocalClarityScore: 96,
    pedagogyScore: 99,
    activeWeeklyHours: 16,
    maxWeeklyHours: 24,
    status: "in_class",
    currentRoomCode: "in-21kos-gr10-bc-phy-vance",
    isSubstituteEligible: true,
    yearsExperience: 14,
    accreditations: ["Cambridge IGCSE Certified", "IB DP Master Examiner", "PhD MIT"],
  },
  {
    id: "tch-sharma",
    name: "Prof. Arjun Sharma",
    email: "a.sharma@faculty.21k.school",
    avatarColor: "#0082FF",
    country: "India",
    countryCode: "in",
    state: "Maharashtra",
    city: "Mumbai",
    languages: ["English", "Hindi", "German"],
    subjects: ["Robotics", "Coding", "Artificial Intelligence", "Computer Science"],
    qualityScore: 95,
    vocalClarityScore: 94,
    pedagogyScore: 96,
    activeWeeklyHours: 14,
    maxWeeklyHours: 22,
    status: "available",
    isSubstituteEligible: true,
    yearsExperience: 10,
    accreditations: ["Cambridge CS Specialist", "Robotics Olympiad Coach"],
  },
  {
    id: "tch-iyer",
    name: "Dr. Ananya Iyer",
    email: "a.iyer@faculty.21k.school",
    avatarColor: "#7C3AED",
    country: "United Arab Emirates",
    countryCode: "ae",
    state: "Dubai",
    city: "Dubai",
    languages: ["English", "Arabic", "Hindi", "Tamil"],
    subjects: ["Mathematics", "Data Science", "Higher Calculus", "Bio-Sciences"],
    qualityScore: 96,
    vocalClarityScore: 95,
    pedagogyScore: 97,
    activeWeeklyHours: 12,
    maxWeeklyHours: 22,
    status: "available",
    isSubstituteEligible: true,
    yearsExperience: 12,
    accreditations: ["IB HL Math Examiner", "NEASC Quality Auditor"],
  },
  {
    id: "tch-ray",
    name: "Kaelen Ray",
    email: "k.ray@faculty.21k.school",
    avatarColor: "#10B981",
    country: "Singapore",
    countryCode: "sg",
    state: "Central",
    city: "Singapore",
    languages: ["English", "Mandarin", "Malay"],
    subjects: ["Applied STEM", "Coding", "Robotics", "Physics"],
    qualityScore: 92,
    vocalClarityScore: 93,
    pedagogyScore: 91,
    activeWeeklyHours: 10,
    maxWeeklyHours: 24,
    status: "available",
    isSubstituteEligible: true,
    yearsExperience: 8,
    accreditations: ["Cambridge STEM Fellow", "PBL Master Trainer"],
  },
  {
    id: "tch-dubois",
    name: "Claire Dubois",
    email: "c.dubois@faculty.21k.school",
    avatarColor: "#EC4899",
    country: "United Kingdom",
    countryCode: "uk",
    state: "Greater London",
    city: "London",
    languages: ["English", "French", "Spanish"],
    subjects: ["Physics", "Chemistry", "Sciences", "Environmental Tech"],
    qualityScore: 94,
    vocalClarityScore: 96,
    pedagogyScore: 93,
    activeWeeklyHours: 18,
    maxWeeklyHours: 22,
    status: "available",
    isSubstituteEligible: true,
    yearsExperience: 11,
    accreditations: ["Oxford STEM Fellow", "Cambridge A-Level Chief"],
  },
  {
    id: "tch-schmidt",
    name: "Dr. Marcus Schmidt",
    email: "m.schmidt@faculty.21k.school",
    avatarColor: "#F59E0B",
    country: "Germany",
    countryCode: "de",
    state: "Hesse",
    city: "Frankfurt",
    languages: ["German", "English"],
    subjects: ["Quantum Physics", "Higher Mathematics", "Computer Science"],
    qualityScore: 97,
    vocalClarityScore: 95,
    pedagogyScore: 98,
    activeWeeklyHours: 21,
    maxWeeklyHours: 22,
    status: "in_class",
    isSubstituteEligible: false,
    yearsExperience: 16,
    accreditations: ["TU Munich Faculty", "IEEE Senior Fellow"],
  },
];

export function computeFacilitatorMatch(
  candidate: FacilitatorCandidate,
  req: RoomAssignmentRequirement
): FacilitatorMatchResult {
  let geoScore = 0;
  let languageScore = 0;
  let subjectScore = 0;
  let qualityScore = 0;
  let capacityScore = 0;
  let penalties = 0;
  const matchReasons: string[] = [];

  // 1. Geographic Affinity (Max 25 pts)
  if (candidate.countryCode.toLowerCase() === req.countryCode.toLowerCase()) {
    geoScore += 15;
    matchReasons.push(`Country Match (${candidate.country})`);
    if (req.state && candidate.state.toLowerCase() === req.state.toLowerCase()) {
      geoScore += 6;
      matchReasons.push(`State Match (${candidate.state})`);
    }
    if (req.city && candidate.city.toLowerCase() === req.city.toLowerCase()) {
      geoScore += 4;
      matchReasons.push(`City Match (${candidate.city})`);
    }
  } else {
    geoScore += 5; // Global remote baseline
  }

  // 2. Language Fluency (Max 25 pts)
  const speaksPrimary = candidate.languages.some(
    (l) => l.toLowerCase() === req.primaryLanguage.toLowerCase()
  );
  if (speaksPrimary) {
    languageScore += 20;
    matchReasons.push(`Fluent in ${req.primaryLanguage}`);
  }
  if (req.secondaryLanguage) {
    const speaksSecondary = candidate.languages.some(
      (l) => l.toLowerCase() === req.secondaryLanguage?.toLowerCase()
    );
    if (speaksSecondary) {
      languageScore += 5;
      matchReasons.push(`Bilingual support in ${req.secondaryLanguage}`);
    }
  } else if (speaksPrimary) {
    languageScore += 5;
  }

  // 3. Subject & Curriculum Expertise (Max 25 pts)
  const hasDirectSubject = candidate.subjects.some((s) =>
    s.toLowerCase().includes(req.targetSubject.toLowerCase())
  );
  if (hasDirectSubject) {
    subjectScore += 20;
    matchReasons.push(`Expert in ${req.targetSubject}`);
  } else {
    // Cross-STEM applicability
    subjectScore += 8;
  }
  if (req.requiresExperiencedLead && candidate.yearsExperience >= 10) {
    subjectScore += 5;
    matchReasons.push("Senior Lead Faculty (>10 yrs exp)");
  } else if (!req.requiresExperiencedLead) {
    subjectScore += 5;
  }

  // 4. Quality Score & Acoustics (Max 15 pts)
  qualityScore = Math.round((candidate.qualityScore / 100) * 15);
  if (candidate.qualityScore >= 95) {
    matchReasons.push(`Elite Pedagogical Rating (${candidate.qualityScore}%)`);
  }

  // 5. Capacity Bucketing & Workload (Max 10 pts)
  const remainingHours = candidate.maxWeeklyHours - candidate.activeWeeklyHours;
  if (remainingHours >= 6) {
    capacityScore = 10;
    matchReasons.push(`Optimal Teaching Load (${candidate.activeWeeklyHours}/${candidate.maxWeeklyHours} hrs)`);
  } else if (remainingHours >= 2) {
    capacityScore = 5;
  } else {
    capacityScore = 0;
    penalties += 15; // Workload cap penalty
  }

  // Status Penalties
  if (candidate.status === "in_class") {
    penalties += 25;
  } else if (candidate.status === "offline") {
    penalties += 35;
  }

  const compositeScore = Math.max(0, Math.min(100, geoScore + languageScore + subjectScore + qualityScore + capacityScore - penalties));

  return {
    candidate,
    compositeScore,
    scoreBreakdown: {
      geoScore,
      languageScore,
      subjectScore,
      qualityScore,
      capacityScore,
      penalties,
    },
    matchReasons,
    isTopRecommendation: false,
  };
}

export function rankFacilitatorsForRoom(
  req: RoomAssignmentRequirement,
  pool: FacilitatorCandidate[] = FACILITATOR_ROSTER
): FacilitatorMatchResult[] {
  const results = pool.map((c) => computeFacilitatorMatch(c, req));
  results.sort((a, b) => b.compositeScore - a.compositeScore);
  if (results.length > 0) {
    results[0].isTopRecommendation = true;
  }
  return results;
}

// Emergency Last-Minute Substitute Failover Protocol (<3 seconds)
export function findEmergencySubstitute(
  currentTeacherId: string,
  req: RoomAssignmentRequirement,
  pool: FacilitatorCandidate[] = FACILITATOR_ROSTER
): FacilitatorCandidate | null {
  const eligibleSubstitutes = pool.filter(
    (c) =>
      c.id !== currentTeacherId &&
      c.isSubstituteEligible &&
      c.status === "available" &&
      c.activeWeeklyHours < c.maxWeeklyHours
  );

  const ranked = rankFacilitatorsForRoom(req, eligibleSubstitutes);
  return ranked.length > 0 ? ranked[0].candidate : null;
}

export const calculateFacilitatorMatches = rankFacilitatorsForRoom;
