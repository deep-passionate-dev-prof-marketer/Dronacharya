// Self-contained Vercel serverless function for GET /api/device-policy/rules
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  return res.status(200).json({
    rules: [
      {
        id: "rule-demo-computer",
        name: "Demo classes need a laptop or desktop",
        description: "Demo sessions require a laptop or desktop so the full classroom works.",
        priority: 10,
        enabled: true,
        allowedDeviceTypes: ["laptop", "desktop"],
        allowRequestOverride: true,
        approverRoles: ["instructor", "admin", "sales_rep"],
      },
    ],
  });
}
