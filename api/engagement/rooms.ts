// Self-contained Vercel serverless function for GET /api/engagement/rooms and /api/engagement/rooms/:room
function getSampleRollup(roomSlug: string) {
  const now = new Date().toISOString();
  return [
    {
      participant: { id: "stu-10SOPHIACH", name: "Sophia Chen", role: "student" },
      latest: {
        dominant: "focused",
        states: [
          { label: "focused", score: 0.88 },
          { label: "engaged", score: 0.82 },
          { label: "curious", score: 0.45 },
        ],
        eyeContact: 0.92,
        presence: 1,
        blinkPerMin: 14,
        talkRatio: 0.18,
      },
      lastSeen: now,
      presentMinutes: 12,
      avgEyeContact: 0.91,
      avgTalkRatio: 0.2,
      stateDistribution: [
        { label: "focused", share: 0.7 },
        { label: "curious", share: 0.2 },
        { label: "listening", share: 0.1 },
      ],
      timeline: [
        { at: now, dominant: "focused", eyeContact: 0.92, presence: 1 },
      ],
      alerts: [],
    },
    {
      participant: { id: "tch-vance", name: "Dr. Evelyn Vance", role: "instructor" },
      latest: {
        dominant: "energetic",
        states: [
          { label: "energetic", score: 0.92 },
          { label: "enthusiastic", score: 0.88 },
          { label: "confident", score: 0.85 },
        ],
        eyeContact: 0.95,
        presence: 1,
        blinkPerMin: 16,
        talkRatio: 0.72,
      },
      lastSeen: now,
      presentMinutes: 14,
      avgEyeContact: 0.94,
      avgTalkRatio: 0.75,
      stateDistribution: [
        { label: "energetic", share: 0.65 },
        { label: "confident", share: 0.35 },
      ],
      timeline: [
        { at: now, dominant: "energetic", eyeContact: 0.95, presence: 1 },
      ],
      alerts: [],
    },
  ];
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-actor-role");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";
  const parts = url.split("?")[0].split("/").filter(Boolean);
  const roomSlug = parts.length > 3 ? decodeURIComponent(parts[3]) : (req.query?.room as string);

  if (roomSlug && roomSlug !== "rooms") {
    return res.status(200).json({
      roomSlug,
      participants: getSampleRollup(roomSlug),
    });
  }

  const roomsList = [
    { roomSlug: "demo-room-alpha", participants: 2, lastActivity: new Date().toISOString() },
    { roomSlug: "grade-7-stem-demo", participants: 2, lastActivity: new Date().toISOString() },
  ];

  return res.status(200).json({ rooms: roomsList });
}
