// Fallback wildcard router for /api/engagement/*
import consentHandler from "./consent";
import samplesHandler from "./samples";
import roomsHandler from "./rooms";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-actor-role");

  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "";

  if (url.includes("/consent")) {
    return consentHandler(req, res);
  }
  if (url.includes("/samples")) {
    return samplesHandler(req, res);
  }
  if (url.includes("/rooms")) {
    return roomsHandler(req, res);
  }

  return res.status(200).json({ success: true, message: "Engagement service active" });
}
