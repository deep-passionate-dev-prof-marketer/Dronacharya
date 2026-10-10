// Self-contained fallback wildcard router for /api/engagement/*
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-actor-role");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";

  if (url.includes("/consent")) {
    return res.status(200).json({
      consent: {
        granted: true,
        at: new Date().toISOString(),
      },
    });
  }

  if (url.includes("/samples")) {
    return res.status(200).json({ success: true, recorded: true });
  }

  if (url.includes("/rooms")) {
    const parts = url.split("?")[0].split("/").filter(Boolean);
    const roomSlug = parts.length > 3 ? decodeURIComponent(parts[3]) : "demo-room-alpha";
    return res.status(200).json({
      roomSlug,
      rooms: [
        { roomSlug: "demo-room-alpha", participants: 2, lastActivity: new Date().toISOString() },
      ],
      participants: [
        {
          participant: { id: "stu-10SOPHIACH", name: "Sophia Chen", role: "student" },
          latest: {
            dominant: "focused",
            states: [{ label: "focused", score: 0.88 }],
            eyeContact: 0.92,
            presence: 1,
            blinkPerMin: 14,
            talkRatio: 0.18,
          },
          lastSeen: new Date().toISOString(),
          presentMinutes: 12,
          avgEyeContact: 0.91,
          avgTalkRatio: 0.2,
          stateDistribution: [{ label: "focused", share: 0.75 }],
          timeline: [{ at: new Date().toISOString(), dominant: "focused", eyeContact: 0.92, presence: 1 }],
          alerts: [],
        },
      ],
    });
  }

  return res.status(200).json({ success: true, message: "Engagement service active" });
}
