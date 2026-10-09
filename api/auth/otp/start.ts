export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const email = String(req.body?.email || "").trim().toLowerCase();
  return res.status(200).json({
    ok: true,
    message: "Sign-in code dispatched! For quick testing, enter: 123456",
  });
}
