import { Participant, RoomRatio, AttentionAudit, AudioQualityMetrics } from "../types";

export const FULL_24_STUDENT_POOL: Participant[] = [
  { id: "stu-1", name: "Sophia Chen", role: "student", avatarColor: "#0082FF", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 24, attendanceStatus: "present", joinedAt: "08:55 AM", parentEmail: "chen.guardian@21k.family", xpPoints: 1850, gradeLevel: 10, section: "A" },
  { id: "stu-2", name: "Marcus Vance", role: "student", avatarColor: "#FFBB00", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 42, attendanceStatus: "present", joinedAt: "08:57 AM", parentEmail: "vance.guardian@21k.family", xpPoints: 1720, gradeLevel: 10, section: "A" },
  { id: "stu-3", name: "Aria Thorne", role: "student", avatarColor: "#FF7176", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 12, attendanceStatus: "late", joinedAt: "09:04 AM", parentEmail: "thorne.parent@21k.family", xpPoints: 1520, gradeLevel: 10, section: "B" },
  { id: "stu-4", name: "Liam O'Connor", role: "student", avatarColor: "#00C2E0", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:59 AM", parentEmail: "oconnor.guardian@21k.family", xpPoints: 890, gradeLevel: 10, section: "B" },
  { id: "stu-5", name: "Zainab Al-Fassi", role: "student", avatarColor: "#A855F7", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: true, audioLevel: 31, attendanceStatus: "present", joinedAt: "08:52 AM", parentEmail: "alfassi.family@21k.org", xpPoints: 2100, gradeLevel: 10, section: "A" },
  { id: "stu-6", name: "Lucas Silva", role: "student", avatarColor: "#10B981", audioEnabled: true, videoEnabled: false, screenSharing: false, handRaised: false, audioLevel: 15, attendanceStatus: "present", joinedAt: "09:01 AM", parentEmail: "silva.guardian@21k.family", xpPoints: 1400, gradeLevel: 10, section: "C" },
  { id: "stu-7", name: "Ananya Patel", role: "student", avatarColor: "#F43F5E", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 8, attendanceStatus: "present", joinedAt: "08:50 AM", parentEmail: "patel.family@21k.org", xpPoints: 1950, gradeLevel: 10, section: "A" },
  { id: "stu-8", name: "Rohan Verma", role: "student", avatarColor: "#6366F1", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:56 AM", parentEmail: "verma.parent@21k.family", xpPoints: 1610, gradeLevel: 10, section: "B" },
  { id: "stu-9", name: "Mia Zhang", role: "student", avatarColor: "#EC4899", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 19, attendanceStatus: "present", joinedAt: "08:54 AM", parentEmail: "zhang.guardian@21k.family", xpPoints: 1780, gradeLevel: 10, section: "A" },
  { id: "stu-10", name: "Ethan Dubois", role: "student", avatarColor: "#14B8A6", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 6, attendanceStatus: "present", joinedAt: "08:58 AM", parentEmail: "dubois.family@21k.org", xpPoints: 1320, gradeLevel: 10, section: "C" },
  { id: "stu-11", name: "Elena Rossi", role: "student", avatarColor: "#F97316", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:53 AM", parentEmail: "rossi.guardian@21k.family", xpPoints: 1890, gradeLevel: 10, section: "A" },
  { id: "stu-12", name: "Noah Schmidt", role: "student", avatarColor: "#84CC16", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 14, attendanceStatus: "present", joinedAt: "09:00 AM", parentEmail: "schmidt.parent@21k.org", xpPoints: 1450, gradeLevel: 10, section: "B" },
  { id: "stu-13", name: "Maya Lin", role: "student", avatarColor: "#06B6D4", audioEnabled: true, videoEnabled: false, screenSharing: false, handRaised: false, audioLevel: 10, attendanceStatus: "present", joinedAt: "08:51 AM", parentEmail: "lin.guardian@21k.family", xpPoints: 1670, gradeLevel: 10, section: "A" },
  { id: "stu-14", name: "Leo Takahashi", role: "student", avatarColor: "#8B5CF6", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:55 AM", parentEmail: "takahashi.family@21k.org", xpPoints: 1590, gradeLevel: 10, section: "B" },
  { id: "stu-15", name: "Chloe Martin", role: "student", avatarColor: "#D946EF", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 11, attendanceStatus: "present", joinedAt: "08:59 AM", parentEmail: "martin.parent@21k.family", xpPoints: 1380, gradeLevel: 10, section: "C" },
  { id: "stu-16", name: "Devon Miller", role: "student", avatarColor: "#3B82F6", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 7, attendanceStatus: "present", joinedAt: "08:57 AM", parentEmail: "miller.guardian@21k.family", xpPoints: 1250, gradeLevel: 10, section: "A" },
  { id: "stu-17", name: "Priya Sharma", role: "student", avatarColor: "#F59E0B", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: true, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:53 AM", parentEmail: "sharma.family@21k.org", xpPoints: 2040, gradeLevel: 10, section: "A" },
  { id: "stu-18", name: "Mateo Gomez", role: "student", avatarColor: "#EF4444", audioEnabled: true, videoEnabled: false, screenSharing: false, handRaised: false, audioLevel: 16, attendanceStatus: "present", joinedAt: "09:02 AM", parentEmail: "gomez.parent@21k.family", xpPoints: 1180, gradeLevel: 10, section: "B" },
  { id: "stu-19", name: "Fatima Zahra", role: "student", avatarColor: "#10B981", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 13, attendanceStatus: "present", joinedAt: "08:54 AM", parentEmail: "zahra.family@21k.org", xpPoints: 1760, gradeLevel: 10, section: "C" },
  { id: "stu-20", name: "Gabriel Souza", role: "student", avatarColor: "#6366F1", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:58 AM", parentEmail: "souza.guardian@21k.family", xpPoints: 1340, gradeLevel: 10, section: "A" },
  { id: "stu-21", name: "Hana Kim", role: "student", avatarColor: "#EC4899", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 22, attendanceStatus: "present", joinedAt: "08:56 AM", parentEmail: "kim.family@21k.org", xpPoints: 1820, gradeLevel: 10, section: "B" },
  { id: "stu-22", name: "Oliver Davies", role: "student", avatarColor: "#14B8A6", audioEnabled: true, videoEnabled: false, screenSharing: false, handRaised: false, audioLevel: 9, attendanceStatus: "present", joinedAt: "08:50 AM", parentEmail: "davies.parent@21k.family", xpPoints: 1490, gradeLevel: 10, section: "C" },
  { id: "stu-23", name: "Zara Khan", role: "student", avatarColor: "#A855F7", audioEnabled: false, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 0, attendanceStatus: "present", joinedAt: "08:52 AM", parentEmail: "khan.guardian@21k.family", xpPoints: 1630, gradeLevel: 10, section: "A" },
  { id: "stu-24", name: "Alexander Wright", role: "student", avatarColor: "#F97316", audioEnabled: true, videoEnabled: true, screenSharing: false, handRaised: false, audioLevel: 18, attendanceStatus: "present", joinedAt: "08:59 AM", parentEmail: "wright.family@21k.org", xpPoints: 1570, gradeLevel: 10, section: "B" },
];

export const TEACHER_PARTICIPANT: Participant = {
  id: "host-1",
  name: "Dr. Evelyn Vance",
  role: "instructor",
  avatarColor: "#003872",
  isLocal: true,
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  handRaised: false,
  audioLevel: 36,
  attendanceStatus: "present",
  joinedAt: "08:45 AM",
  parentEmail: "e.vance@faculty.21k.school",
  xpPoints: 3450,
};

export const RATIO_TO_STUDENT_COUNT: Record<RoomRatio, number> = {
  "1:1": 1,
  "1:2": 2,
  "1:3": 3,
  "1:4": 4,
  "1:5": 5,
  "1:6": 6,
  "1:8": 8,
  "1:12": 12,
  "1:16": 16,
  "1:24": 24,
};

export function getParticipantsForRatio(ratio: RoomRatio): Participant[] {
  const count = RATIO_TO_STUDENT_COUNT[ratio] || 4;
  return [TEACHER_PARTICIPANT, ...FULL_24_STUDENT_POOL.slice(0, count)];
}
