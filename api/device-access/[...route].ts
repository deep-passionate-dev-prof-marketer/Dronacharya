export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";

  if (url.includes("analytics")) {
    return res.status(200).json({
      totals: {
        joinAttempts: 18,
        blocked: 2,
        allowedByApproval: 1,
        deviceMismatches: 0,
        requests: 1,
        pending: 0,
        approved: 1,
        denied: 0,
        medianDecisionSeconds: 4,
      },
      byDevice: {
        phone: { allowed: 2, blocked: 2, approved: 1 },
        tablet: { allowed: 4, blocked: 0, approved: 0 },
        laptop: { allowed: 18, blocked: 0, approved: 0 },
        desktop: { allowed: 9, blocked: 0, approved: 0 },
      },
      byRoom: {
        "demo-room-alpha": { blocked: 1, requests: 1, approved: 1, denied: 0 },
      },
      byApprover: {},
      persisted: true,
      dataDir: null,
    });
  }

  if (url.includes("events")) {
    return res.status(200).json({ events: [], persisted: true });
  }

  if (url.includes("decision")) {
    const decision = req.body?.decision || "approve";
    return res.status(200).json({
      request: {
        id: "req-decision",
        status: decision === "approve" ? "approved" : "denied",
        decidedAt: new Date().toISOString(),
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: "Device access operational",
    requests: [],
    events: [],
    rules: [],
    byDevice: {
      phone: { allowed: 0, blocked: 0, approved: 0 },
      tablet: { allowed: 0, blocked: 0, approved: 0 },
      laptop: { allowed: 0, blocked: 0, approved: 0 },
      desktop: { allowed: 0, blocked: 0, approved: 0 },
    },
    byRoom: {},
    totals: {
      joinAttempts: 0,
      blocked: 0,
      allowedByApproval: 0,
      deviceMismatches: 0,
      requests: 0,
      pending: 0,
      approved: 0,
      denied: 0,
      medianDecisionSeconds: null,
    },
  });
}
