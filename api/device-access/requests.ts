// Self-contained Vercel serverless function for GET / POST /api/device-access/requests
const requestsStore: any[] = [];

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const { roomSlug, student, device, message } = req.body || {};
      const newReq = {
        id: `dar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        roomSlug: String(roomSlug || ""),
        student: student || { id: "anon", name: "Student", role: "student" },
        device: device || { deviceType: "phone" },
        studentMessage: String(message || "").slice(0, 500),
        status: "pending",
        requestedAt: new Date().toISOString(),
      };
      requestsStore.push(newReq);
      return res.status(200).json({ success: true, request: newReq });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to create request" });
    }
  }

  if (req.method === "GET") {
    return res.status(200).json({ requests: requestsStore });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
