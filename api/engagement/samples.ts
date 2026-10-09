// Self-contained Vercel serverless function for Engagement Samples
export const globalSamplesStore: Array<{
  roomSlug: string;
  participant: { id: string; name: string; role: string };
  at: string;
  summary: any;
}> = [];

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-actor-role");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const { roomSlug, participant, at, summary } = req.body || {};
      if (participant && summary) {
        globalSamplesStore.push({
          roomSlug: roomSlug || "demo-room-alpha",
          participant,
          at: at || new Date().toISOString(),
          summary,
        });
        if (globalSamplesStore.length > 200) {
          globalSamplesStore.shift();
        }
      }
      return res.status(200).json({ success: true, count: globalSamplesStore.length });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to record sample" });
    }
  }

  return res.status(200).json({ samples: globalSamplesStore.slice(-50) });
}
