import { DEFAULT_ACCOUNTS } from "./accounts";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = req.body?.userId;
  const matched = DEFAULT_ACCOUNTS.find((a) => a.id === userId) || DEFAULT_ACCOUNTS[0];

  return res.status(200).json({
    user: matched,
  });
}
