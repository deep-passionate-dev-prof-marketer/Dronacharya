// Self-contained Vercel serverless function for Engagement Consent
const consentCache: Record<string, any> = {
  "tch-vance": { granted: true, at: new Date().toISOString() },
  "stu-10SOPHIACH": { granted: true, at: new Date().toISOString() },
  "sales-1": { granted: true, at: new Date().toISOString() },
  "admin-1": { granted: true, at: new Date().toISOString() },
  "audit-1": { granted: true, at: new Date().toISOString() },
};

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-actor-role");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";

  if (req.method === "POST") {
    try {
      const { participant, granted, guardianName, guardianAttested, country } = req.body || {};
      const id = participant?.id || "anon";
      consentCache[id] = {
        granted: Boolean(granted),
        guardianName,
        guardianAttested,
        country,
        at: new Date().toISOString(),
      };
      return res.status(200).json({ success: true, consent: consentCache[id] });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to save consent" });
    }
  }

  // GET /api/engagement/consent or /api/engagement/consent/:id
  const urlParts = url.split("?")[0].split("/").filter(Boolean);
  const idFromUrl = urlParts[urlParts.length - 1];
  const targetId = (idFromUrl && idFromUrl !== "consent") ? idFromUrl : (req.query?.id as string);

  if (targetId && consentCache[targetId]) {
    return res.status(200).json({ consent: consentCache[targetId] });
  }

  // Default to pre-granted for frictionless dev testing
  return res.status(200).json({
    consent: {
      granted: true,
      at: new Date().toISOString(),
    },
  });
}
