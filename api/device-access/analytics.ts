// Self-contained Vercel serverless function for GET /api/device-access/analytics
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

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
      "grade-7-stem-demo": { blocked: 1, requests: 0, approved: 0, denied: 0 },
    },
    byApprover: {
      "teacher-1": { approved: 1, denied: 0 },
    },
    persisted: true,
    dataDir: null,
  });
}
