export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // If no persistent session cookie on serverless, return 401 so frontend knows user is not pre-authenticated
  return res.status(401).json({ error: "Not authenticated" });
}
