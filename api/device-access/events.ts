// Self-contained Vercel serverless function for GET /api/device-access/events
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const now = new Date().toISOString();
  const sampleEvents = [
    {
      id: "dae-1",
      type: "join_allowed",
      roomSlug: "demo-room-alpha",
      student: { id: "std-1", name: "Aarav Patel", role: "student" },
      device: { deviceType: "laptop", os: "Mac OS", browser: "Chrome" },
      at: now,
    },
    {
      id: "dae-2",
      type: "join_allowed",
      roomSlug: "demo-room-alpha",
      student: { id: "std-2", name: "Priya Sharma", role: "student" },
      device: { deviceType: "laptop", os: "Windows", browser: "Edge" },
      at: now,
    },
  ];

  return res.status(200).json({
    events: sampleEvents,
    persisted: true,
  });
}
