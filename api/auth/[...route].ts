// Serverless Vercel function handling /api/auth/* routes

const DEFAULT_ACCOUNTS = [
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

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.url || "";

  // 1. Providers
  if (url.includes("/providers")) {
    return res.status(200).json({
      google: false,
      emailOtp: true,
      dev: true,
    });
  }

  // 2. Dev accounts list
  if (url.includes("/dev/accounts")) {
    return res.status(200).json({
      accounts: DEFAULT_ACCOUNTS,
    });
  }

  // 3. Dev login
  if (url.includes("/dev/login")) {
    const userId = req.body?.userId;
    const matched = DEFAULT_ACCOUNTS.find((a) => a.id === userId) || DEFAULT_ACCOUNTS[0];
    return res.status(200).json({
      user: matched,
    });
  }

  // 4. Email OTP start
  if (url.includes("/otp/start")) {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return res.status(200).json({
      ok: true,
      message: `Sign-in code dispatched! For quick testing, enter: 123456`,
    });
  }

  // 5. Email OTP verify
  if (url.includes("/otp/verify")) {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    // Find known account or generate scholar/staff profile based on email
    let matched = DEFAULT_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
    if (!matched) {
      const isTeacher = email.includes("teacher") || email.includes("faculty") || email.includes("dr.");
      matched = {
        id: `usr_${Date.now().toString(36)}`,
        email: email || "test@test.com",
        name: email ? email.split("@")[0].replace(/[^a-zA-Z]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Sophia Chen",
        role: isTeacher ? "instructor" : "student",
        studentCode: isTeacher ? undefined : "21SCHOLARX",
        avatarColor: isTeacher ? "#003872" : "#0082FF",
        gradeLevel: 10,
        country: "IND",
        languageTag: "en-IN",
      };
    }

    return res.status(200).json({
      user: matched,
    });
  }

  // 6. Current user / me
  if (url.includes("/me")) {
    return res.status(200).json({
      user: null,
    });
  }

  // 7. Logout
  if (url.includes("/logout")) {
    return res.status(200).json({
      ok: true,
    });
  }

  return res.status(200).json({
    ok: true,
    message: "Auth route active",
  });
}
