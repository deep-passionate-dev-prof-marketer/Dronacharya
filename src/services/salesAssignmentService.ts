import { UserRole } from "../types";
import { buildMeetingUrl, buildShortMeetingUrl } from "./domainService";

export interface SalesRepresentative {
  id: string;
  name: string;
  email: string;
  role: "sales_rep";
  avatarColor: string;
  status: "available" | "in_pitch" | "offline";
  languages: string[];
  gradeSpecialization: number[];
  curriculumFocus: string[];
  conversionRatePercent: number;
  currentLeadCount: number;
  maxConcurrentLeads: number;
  crmUserId: string;
  salesCluster: string;
  deviceType: "laptop" | "desktop";
  deviceModel: string;
  totalDealsClosed: number;
}

export interface SalesLead {
  id: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  gradeLevel: number;
  curriculum: string; // "Cambridge IGCSE" | "IB DP" | "American Diploma" | "Robotics Floww"
  preferredLanguage: string;
  timezone: string;
  crmSource: "Salesforce Enterprise" | "HubSpot Education" | "LeadSquared" | "Inbound Demo API" | "Campus Website";
  leadScore: number; // 0 - 100
  academicGoals: string;
  assignedRepId?: string;
  assignedRepName?: string;
  assignedAt?: string;
  status: "new" | "assigned" | "pitch_in_progress" | "closed_won" | "follow_up";
  assignmentReason?: string;
  pitchRoomCode?: string;
  pitchRoomUrl?: string;
  tuitionQuote: number;
  maxScholarshipPercent: number;
}

export const SALES_REP_ROSTER: SalesRepresentative[] = [
  {
    id: "sales-kabir",
    name: "Kabir Mehta",
    email: "k.mehta@admissions.21k.school",
    role: "sales_rep",
    avatarColor: "#EA580C",
    status: "available",
    languages: ["English", "Hindi"],
    gradeSpecialization: [9, 10, 11, 12],
    curriculumFocus: ["Cambridge IGCSE", "American Diploma", "STEM & Physics"],
    conversionRatePercent: 88,
    currentLeadCount: 1,
    maxConcurrentLeads: 3,
    crmUserId: "SF-REP-9021",
    salesCluster: "North America & International Admissions",
    deviceType: "laptop",
    deviceModel: 'Lenovo ThinkPad X1 Carbon Gen 12',
    totalDealsClosed: 142,
  },
  {
    id: "sales-carlos",
    name: "Carlos Ruiz",
    email: "c.ruiz@admissions.21k.school",
    role: "sales_rep",
    avatarColor: "#0082FF",
    status: "available",
    languages: ["English", "Spanish"],
    gradeSpecialization: [6, 7, 8, 9, 10],
    curriculumFocus: ["IB MYP", "Cambridge IGCSE", "Bilingual Academy"],
    conversionRatePercent: 84,
    currentLeadCount: 0,
    maxConcurrentLeads: 3,
    crmUserId: "HS-REP-3814",
    salesCluster: "LATAM & Western Europe Admissions",
    deviceType: "laptop",
    deviceModel: 'Apple MacBook Pro 14" (M3 Pro)',
    totalDealsClosed: 118,
  },
  {
    id: "sales-priya",
    name: "Priya Desai",
    email: "p.desai@admissions.21k.school",
    role: "sales_rep",
    avatarColor: "#9333EA",
    status: "available",
    languages: ["English", "Hindi", "French"],
    gradeSpecialization: [1, 2, 3, 4, 5, 6],
    curriculumFocus: ["Primary Foundations", "Robotics Floww", "IB PYP"],
    conversionRatePercent: 91,
    currentLeadCount: 1,
    maxConcurrentLeads: 3,
    crmUserId: "LS-REP-5120",
    salesCluster: "Asia-Pacific & Middle East Admissions",
    deviceType: "laptop",
    deviceModel: 'Dell XPS 15 (OLED)',
    totalDealsClosed: 164,
  },
  {
    id: "sales-sarah",
    name: "Sarah Jenkins",
    email: "s.jenkins@admissions.21k.school",
    role: "sales_rep",
    avatarColor: "#059669",
    status: "available",
    languages: ["English", "German"],
    gradeSpecialization: [8, 9, 10, 11, 12],
    curriculumFocus: ["Advanced STEM", "AI & Quantum Computing", "American High School"],
    conversionRatePercent: 86,
    currentLeadCount: 0,
    maxConcurrentLeads: 3,
    crmUserId: "SF-REP-7731",
    salesCluster: "UK & European High School Track",
    deviceType: "laptop",
    deviceModel: 'MacBook Air 15" (M3)',
    totalDealsClosed: 98,
  },
];

export const INITIAL_SALES_LEADS: SalesLead[] = [
  {
    id: "lead-101",
    studentName: "Lucas Hernandez",
    parentName: "Mateo Hernandez",
    parentEmail: "mateo.h@family.es",
    parentPhone: "+34 612 345 678",
    gradeLevel: 10,
    curriculum: "Cambridge IGCSE",
    preferredLanguage: "Spanish",
    timezone: "Europe/Madrid (CET)",
    crmSource: "HubSpot Education",
    leadScore: 94,
    academicGoals: "Quantum Computing & Bilingual STEM Diploma",
    assignedRepId: "sales-carlos",
    assignedRepName: "Carlos Ruiz",
    assignedAt: "Today 08:30 AM",
    status: "assigned",
    assignmentReason: "Native Spanish Language Affinity + High School Grade 10 Track Specialization",
    pitchRoomCode: "21K-PITCH-HERNANDEZ-01",
    pitchRoomUrl: buildShortMeetingUrl("p-es10h"),
    tuitionQuote: 6200,
    maxScholarshipPercent: 25,
  },
  {
    id: "lead-102",
    studentName: "Aarav Sharma",
    parentName: "Rajesh & Meera Sharma",
    parentEmail: "rajesh.sharma@parent.in",
    parentPhone: "+91 98201 23456",
    gradeLevel: 11,
    curriculum: "American Diploma",
    preferredLanguage: "Hindi",
    timezone: "Asia/Kolkata (IST)",
    crmSource: "Salesforce Enterprise",
    leadScore: 89,
    academicGoals: "Ivy League Engineering Track & AP Physics Prep",
    assignedRepId: "sales-kabir",
    assignedRepName: "Kabir Mehta",
    assignedAt: "Today 08:45 AM",
    status: "pitch_in_progress",
    assignmentReason: "Senior Counselor High-Value Intent Match + Hindi Native + Grade 11 STEM Focus",
    pitchRoomCode: "21K-PITCH-SHARMA-02",
    pitchRoomUrl: buildShortMeetingUrl("p-in11s"),
    tuitionQuote: 7500,
    maxScholarshipPercent: 20,
  },
  {
    id: "lead-103",
    studentName: "Chloe Dupont",
    parentName: "Jean-Marc Dupont",
    parentEmail: "jm.dupont@paris.fr",
    parentPhone: "+33 6 12 34 56 78",
    gradeLevel: 4,
    curriculum: "Robotics Floww",
    preferredLanguage: "French",
    timezone: "Europe/Paris (CET)",
    crmSource: "LeadSquared",
    leadScore: 82,
    academicGoals: "Early Childhood Coding & Robotics Olympiad",
    assignedRepId: "sales-priya",
    assignedRepName: "Priya Desai",
    assignedAt: "Today 09:05 AM",
    status: "assigned",
    assignmentReason: "Primary Foundations K-5 Specialist + French Fluency Match",
    pitchRoomCode: "21K-PITCH-DUPONT-03",
    pitchRoomUrl: buildShortMeetingUrl("p-fr04d"),
    tuitionQuote: 4800,
    maxScholarshipPercent: 15,
  },
  {
    id: "lead-104",
    studentName: "Ethan Vance",
    parentName: "Caroline Vance",
    parentEmail: "c.vance@boston.us",
    parentPhone: "+1 (617) 555-0192",
    gradeLevel: 9,
    curriculum: "American High School",
    preferredLanguage: "English",
    timezone: "America/New_York (EST)",
    crmSource: "Inbound Demo API",
    leadScore: 91,
    academicGoals: "Competitive STEM, Math Olympiad & AI Specialization",
    status: "new",
    tuitionQuote: 6800,
    maxScholarshipPercent: 25,
  },
];

/**
 * Intelligent Multi-Factor Sales Assignment Logic Engine
 */
export function assignLeadToOptimalRep(
  lead: Partial<SalesLead>,
  reps: SalesRepresentative[] = SALES_REP_ROSTER
): { assignedRep: SalesRepresentative; reason: string; roomCode: string; roomUrl: string } {
  // 1. Filter available reps with capacity
  const eligibleReps = reps.filter(
    (r) => r.status !== "offline" && r.currentLeadCount < r.maxConcurrentLeads
  );

  const pool = eligibleReps.length > 0 ? eligibleReps : reps;

  // 2. Score candidates
  let bestRep = pool[0];
  let highestScore = -1;
  const reasons: string[] = [];

  for (const rep of pool) {
    let score = 0;
    const repReasons: string[] = [];

    // Factor A: Language affinity (Highest weight +40)
    const leadLang = (lead.preferredLanguage || "English").toLowerCase();
    const hasLang = rep.languages.some((l) => l.toLowerCase() === leadLang);
    if (hasLang) {
      score += 40;
      repReasons.push(`Language affinity (${lead.preferredLanguage})`);
    }

    // Factor B: Grade Level Specialization (+30)
    const grade = lead.gradeLevel || 10;
    if (rep.gradeSpecialization.includes(grade)) {
      score += 30;
      repReasons.push(`Grade ${grade} track specialist`);
    }

    // Factor C: High-Value Intent Routing (+20)
    if ((lead.leadScore || 80) >= 90 && rep.conversionRatePercent >= 88) {
      score += 20;
      repReasons.push(`Senior counselor VIP lead tier (${rep.conversionRatePercent}% win rate)`);
    }

    // Factor D: Load Balancing / Available Capacity (+15)
    const remainingSlots = rep.maxConcurrentLeads - rep.currentLeadCount;
    score += remainingSlots * 5;
    if (remainingSlots >= 2) {
      repReasons.push(`Optimal bandwidth capacity (${rep.currentLeadCount}/${rep.maxConcurrentLeads} active)`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestRep = rep;
      reasons.splice(0, reasons.length, ...repReasons);
    }
  }

  const roomSlug = `p-${(lead.studentName || "student").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}-${Date.now().toString(36).slice(-4)}`;
  const roomCode = `21K-PITCH-${(lead.studentName || "STUDENT").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8)}-${Math.floor(10 + Math.random() * 90)}`;
  const roomUrl = buildMeetingUrl(roomSlug);
  const rationale = reasons.length > 0 ? reasons.join(" + ") : "Round-Robin Load Balanced Allocation";

  return {
    assignedRep: bestRep,
    reason: rationale,
    roomCode,
    roomUrl,
  };
}
