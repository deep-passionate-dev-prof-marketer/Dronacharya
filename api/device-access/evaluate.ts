import {
  DEFAULT_DEVICE_POLICY_RULES,
  inferContextFromSlug,
  isDeviceAllowed,
  resolvePolicyFromRules,
  RoomPolicyContext,
} from "../../src/services/devicePolicyEngine";

export default async function handler(req: any, res: any) {
  // Global CORS headers
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
    const slug = String(roomSlug || "");
    const inferred = inferContextFromSlug(slug);
    const ctx: RoomPolicyContext = { sessionType: inferred.sessionType || "demo", ...inferred };
    const policy = resolvePolicyFromRules(ctx, DEFAULT_DEVICE_POLICY_RULES);
    const devType = device?.deviceType || "desktop";
    const allowed = isDeviceAllowed(policy, devType);

    return res.status(200).json({
      decision: allowed ? "allow" : "block",
      policy: { ...policy, allowRequestOverride: true },
      effectiveDeviceType: devType,
      integrity: "verified",
      enforcement: "server",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
