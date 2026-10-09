export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();

  const isTeacher = email.includes("teacher") || email.includes("faculty") || email.includes("dr.") || email.includes("vance");
  const isSales = email.includes("sales") || email.includes("khanna");
  const isAdmin = email.includes("admin") || email.includes("malhotra");
  const isAuditor = email.includes("audit") || email.includes("aurelius");

  const role = isTeacher
    ? "instructor"
    : isSales
    ? "sales_rep"
    : isAdmin
    ? "admin"
    : isAuditor
    ? "auditor"
    : "student";

  const user = {
    id: role === "instructor" ? "tch-vance" : `stu_${Date.now().toString(36)}`,
    name: isTeacher
      ? "Dr. Evelyn Vance"
      : isSales
      ? "Rajesh Khanna"
      : isAdmin
      ? "Director Vikram Malhotra"
      : email
      ? email.split("@")[0].replace(/[^a-zA-Z]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Sophia Chen",
    email: email || "test@test.com",
    role,
    studentCode: role === "student" ? "21SCHOLARX" : undefined,
    avatarColor: role === "instructor" ? "#003872" : role === "student" ? "#0082FF" : "#059669",
    gradeLevel: 10,
    country: "IND",
    languageTag: "en-IN",
  };

  return res.status(200).json({
    user,
  });
}
