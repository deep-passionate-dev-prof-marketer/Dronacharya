export const DEFAULT_ACCOUNTS = [
  {
    id: "tch-vance",
    email: "vance@21k.school",
    name: "Dr. Evelyn Vance",
    role: "instructor",
    avatarColor: "#003872",
    country: "USA",
    languageTag: "en-US",
    gradeLevel: 10,
  },
  {
    id: "stu-10SOPHIACH",
    email: "sophia.chen@student.21k.school",
    name: "Sophia Chen",
    role: "student",
    studentCode: "21SCHOLARX",
    avatarColor: "#0082FF",
    gradeLevel: 10,
    country: "SGP",
    languageTag: "en-SG",
  },
  {
    id: "sales-1",
    email: "r.khanna@21k.school",
    name: "Rajesh Khanna",
    role: "sales_rep",
    avatarColor: "#059669",
    country: "ARE",
    languageTag: "en-AE",
  },
  {
    id: "audit-1",
    email: "m.aurelius@21k.school",
    name: "Inspector Marcus Aurelius",
    role: "auditor",
    avatarColor: "#7C3AED",
    country: "GBR",
    languageTag: "en-GB",
  },
  {
    id: "admin-1",
    email: "v.malhotra@21k.school",
    name: "Director Vikram Malhotra",
    role: "admin",
    avatarColor: "#DC2626",
    country: "IND",
    languageTag: "en-IN",
  },
  {
    id: "par-lchen",
    email: "linda.chen@family.example",
    name: "Linda Chen",
    role: "parent",
    avatarColor: "#F59E0B",
    country: "IND",
    languageTag: "en-IN",
  },
];

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  return res.status(200).json({
    accounts: DEFAULT_ACCOUNTS,
  });
}
