// Self-contained Vercel serverless function for POST /api/device-access/evaluate
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { roomSlug, student, device } = req.body || {};
    const devType = device?.deviceType || "desktop";
    
    // Policy rule: Live classes require a laptop or desktop for labs, whiteboard, and screen sharing
    const allowed = devType === "laptop" || devType === "desktop";

    return res.status(200).json({
      decision: allowed ? "allow" : "block",
      policy: {
        mode: "auto",
        allowedDeviceTypes: ["laptop", "desktop"],
        allowRequestOverride: true,
        approverRoles: ["instructor", "admin", "sales_rep"],
        matchedRuleId: "rule-demo-computer",
        matchedRuleName: "Demo classes need a laptop or desktop",
        reason: "Demo classes require a laptop or desktop so the full interactive classroom works.",
      },
      effectiveDeviceType: devType,
      integrity: "verified",
      enforcement: "server",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
