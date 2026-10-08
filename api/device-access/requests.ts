import {
  DEFAULT_DEVICE_POLICY_RULES,
  inferContextFromSlug,
  resolvePolicyFromRules,
  RoomPolicyContext,
} from "../../src/services/devicePolicyEngine";

// In-memory store for serverless instance lifetime
const inMemoryRequests = new Map<string, any>();

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { roomSlug, student, device, message } = req.body || {};
      const slug = String(roomSlug || "");
      const inferred = inferContextFromSlug(slug);
      const ctx: RoomPolicyContext = { sessionType: inferred.sessionType || "demo", ...inferred };
      const policy = resolvePolicyFromRules(ctx, DEFAULT_DEVICE_POLICY_RULES);

      const newRequest = {
        id: `dar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        roomSlug: slug,
        student: student || { id: "anonymous", name: "Student", role: "student" },
        device: device || { deviceType: "phone" },
        studentMessage: String(message || "").slice(0, 500),
        policySnapshot: policy,
        status: "pending",
        requestedAt: new Date().toISOString(),
      };

      inMemoryRequests.set(newRequest.id, newRequest);
      return res.status(200).json({ success: true, request: newRequest });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to create request" });
    }
  }

  if (req.method === "GET") {
    const list = Array.from(inMemoryRequests.values());
    return res.status(200).json({ requests: list });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
