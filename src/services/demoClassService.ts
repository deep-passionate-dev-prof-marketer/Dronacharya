/**
 * Demo Class & CRM Integration Service for 21K School (Dronacharya)
 * 
 * Handles:
 * - CRM Demo Lead bookings
 * - Unique Student ID generation (2-Digit Numeric + 8-Character Alphabet, e.g. "21SCHOLARX")
 * - Passcode auto-fill (last 4 characters of Student ID, e.g. "LARX")
 * - Unique meeting URL generation based on Grade, Country, Course, Language, and Ratio
 * - Teacher Calendar Schedule
 */

import { RoomRatio } from "../types";
import { buildMeetingUrl } from "./domainService";

export interface DemoBookingLead {
  id: string;
  studentId: string; // 2-Digit Numeric + 8-Character Alphabet
  password: string; // Last 4 characters of studentId auto-filled
  studentName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  gradeLevel: number;
  country: string; // e.g. "US", "IN", "SG", "AE", "GB"
  countryFlag: string;
  course: string;
  preferredLanguage: string;
  meetingRatio: RoomRatio; // "1:1" | "1:4"
  scheduledTime: string;
  scheduledTimestamp: number;
  assignedTeacherId: string;
  assignedTeacherName: string;
  roomCode: string;
  meetingUrl: string;
  crmSource: "Salesforce Enterprise" | "HubSpot Education" | "LeadSquared" | "Website Booking";
  status: "scheduled" | "lobby_waiting" | "in_demo" | "sales_pitch" | "completed";
  notes?: string;
}

// Generate valid 2-Digit Numeric + 8-Character Alphabet Student ID
export function generateStudentId(grade: number = 10): string {
  const gradePrefix = grade.toString().padStart(2, "0");
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let randomAlpha = "";
  for (let i = 0; i < 8; i++) {
    randomAlpha += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return `${gradePrefix}${randomAlpha}`;
}

// Extract last 4 characters as password
export function generatePassword(studentId: string): string {
  if (!studentId || studentId.length < 4) return "21K1";
  return studentId.slice(-4).toUpperCase();
}

// Construct dynamic unique meeting link based on parameters
export function generateDemoMeetingUrl(params: {
  roomCode: string;
  studentId: string;
  grade: number;
  course: string;
  language: string;
  ratio: RoomRatio;
  teacherName?: string;
  customOrigin?: string;
}): string {
  const origin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : (params.customOrigin || "https://dronacharya-puce.vercel.app");
  
  const query = new URLSearchParams({
    room: params.roomCode,
    role: "student",
    sid: params.studentId,
    grade: params.grade.toString(),
    course: params.course,
    lang: params.language,
    ratio: params.ratio,
  });

  if (params.teacherName) {
    query.set("teacher", params.teacherName);
  }

  return `${origin}/?${query.toString()}`;
}

export const INITIAL_DEMO_LEADS: DemoBookingLead[] = [
  {
    id: "lead-21k-101",
    studentId: "21SCHOLARX",
    password: "LARX",
    studentName: "Sophia Chen",
    parentName: "Linda Chen",
    parentEmail: "linda.chen@family.org",
    parentPhone: "+1 (415) 890-2341",
    gradeLevel: 10,
    country: "US",
    countryFlag: "🇺🇸",
    course: "Advanced Quantum Mechanics & Physics",
    preferredLanguage: "en",
    meetingRatio: "1:4",
    scheduledTime: "10:30 AM UTC",
    scheduledTimestamp: Date.now() + 180 * 1000, // 3 mins from now
    assignedTeacherId: "tch-1",
    assignedTeacherName: "Dr. Evelyn Vance",
    roomCode: "dronacharya-gr10-phy",
    meetingUrl: "",
    crmSource: "Salesforce Enterprise",
    status: "scheduled",
    notes: "High intent student interested in MIT STEM track. Parent requested live translation preview.",
  },
  {
    id: "lead-21k-102",
    studentId: "10QUANTUMA",
    password: "TUMA",
    studentName: "Liam O'Connor",
    parentName: "Arthur O'Connor",
    parentEmail: "oconnor.guardian@family.org",
    parentPhone: "+44 20 7946 0912",
    gradeLevel: 10,
    country: "GB",
    countryFlag: "🇬🇧",
    course: "Advanced Quantum Mechanics & Physics",
    preferredLanguage: "en",
    meetingRatio: "1:4",
    scheduledTime: "10:30 AM UTC",
    scheduledTimestamp: Date.now() + 180 * 1000,
    assignedTeacherId: "tch-1",
    assignedTeacherName: "Dr. Evelyn Vance",
    roomCode: "dronacharya-gr10-phy",
    meetingUrl: "",
    crmSource: "HubSpot Education",
    status: "scheduled",
    notes: "Cambridge syllabus candidate transitioning to 21K online school.",
  },
  {
    id: "lead-21k-103",
    studentId: "08ROBOTICS",
    password: "TICS",
    studentName: "Aria Thorne",
    parentName: "Dr. Elena Thorne",
    parentEmail: "thorne.family@biotech.org",
    parentPhone: "+91 98201 44521",
    gradeLevel: 8,
    country: "IN",
    countryFlag: "🇮🇳",
    course: "Applied Robotics & Artificial Intelligence",
    preferredLanguage: "hi",
    meetingRatio: "1:1",
    scheduledTime: "11:15 AM UTC",
    scheduledTimestamp: Date.now() + 2700 * 1000,
    assignedTeacherId: "tch-2",
    assignedTeacherName: "Prof. Rajesh Sengupta",
    roomCode: "21k-gr8-secA-rob",
    meetingUrl: "",
    crmSource: "LeadSquared",
    status: "scheduled",
    notes: "Parent speaks Hindi, student bilingual. Requests 1:1 live demo with hardware simulator.",
  },
];

class DemoClassService {
  private leads: DemoBookingLead[] = [];

  constructor() {
    this.leads = INITIAL_DEMO_LEADS.map((lead) => ({
      ...lead,
      meetingUrl: generateDemoMeetingUrl({
        roomCode: lead.roomCode,
        studentId: lead.studentId,
        grade: lead.gradeLevel,
        course: lead.course,
        language: lead.preferredLanguage,
        ratio: lead.meetingRatio,
        teacherName: lead.assignedTeacherName,
      }),
    }));
  }

  public getLeads(): DemoBookingLead[] {
    return [...this.leads];
  }

  public getTeacherSchedule(teacherId: string): DemoBookingLead[] {
    return this.leads.filter((l) => l.assignedTeacherId === teacherId);
  }

  public getLeadByStudentId(studentId: string): DemoBookingLead | undefined {
    const clean = studentId.trim().toUpperCase();
    return this.leads.find((l) => l.studentId.toUpperCase() === clean);
  }

  public getLeadByRoom(roomCode: string): DemoBookingLead[] {
    return this.leads.filter((l) => l.roomCode === roomCode);
  }

  public createDemoLead(params: {
    studentName: string;
    parentName: string;
    parentEmail: string;
    parentPhone?: string;
    gradeLevel: number;
    country: string;
    course: string;
    preferredLanguage: string;
    meetingRatio: RoomRatio;
    assignedTeacherId: string;
    assignedTeacherName: string;
    roomCode: string;
    crmSource?: DemoBookingLead["crmSource"];
  }): DemoBookingLead {
    const studentId = generateStudentId(params.gradeLevel);
    const password = generatePassword(studentId);

    const flags: Record<string, string> = {
      US: "🇺🇸",
      IN: "🇮🇳",
      GB: "🇬🇧",
      SG: "🇸🇬",
      AE: "🇦🇪",
      CA: "🇨🇦",
      AU: "🇦🇺",
    };

    const newLead: DemoBookingLead = {
      id: `lead-${Date.now().toString(36)}`,
      studentId,
      password,
      studentName: params.studentName,
      parentName: params.parentName,
      parentEmail: params.parentEmail,
      parentPhone: params.parentPhone || "+1 (555) 019-2834",
      gradeLevel: params.gradeLevel,
      country: params.country.toUpperCase(),
      countryFlag: flags[params.country.toUpperCase()] || "🌐",
      course: params.course,
      preferredLanguage: params.preferredLanguage,
      meetingRatio: params.meetingRatio,
      scheduledTime: new Date(Date.now() + 180 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scheduledTimestamp: Date.now() + 180 * 1000,
      assignedTeacherId: params.assignedTeacherId,
      assignedTeacherName: params.assignedTeacherName,
      roomCode: params.roomCode,
      meetingUrl: generateDemoMeetingUrl({
        roomCode: params.roomCode,
        studentId,
        grade: params.gradeLevel,
        course: params.course,
        language: params.preferredLanguage,
        ratio: params.meetingRatio,
        teacherName: params.assignedTeacherName,
      }),
      crmSource: params.crmSource || "Salesforce Enterprise",
      status: "scheduled",
    };

    this.leads.unshift(newLead);
    return newLead;
  }
}

export const demoClassService = new DemoClassService();
