/**
 * LiveKit access tokens for classroom media.
 *
 * The browser never talks to LiveKit without a token from here, and students only get one
 * after the device-access policy allows their device. Staff roles skip the device check.
 */
import express from "express";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { evaluateJoinRequest } from "./deviceAccessHub";

const STAFF_ROLES = ["instructor", "admin", "sales_rep", "auditor", "ta"];

export function livekitConfig() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

/** A LAN device (phone on the same Wi-Fi) can't reach "localhost": rewrite to the host it used to reach us. */
function publicLivekitUrl(configured: string, req: express.Request): string {
  try {
    const u = new URL(configured);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(u.hostname)) {
      const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
      const hostname = host.split(":")[0];
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") u.hostname = hostname;
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return configured;
  }
}

export function setupLivekitRoutes(app: express.Express) {
  app.get("/api/livekit/status", (_req, res) => {
    res.json({ configured: Boolean(livekitConfig()) });
  });

  app.post("/api/livekit/token", async (req, res) => {
    const cfg = livekitConfig();
    if (!cfg) return res.status(503).json({ configured: false, error: "LiveKit is not configured on this server." });

    const roomSlug = String(req.body?.roomSlug || "").slice(0, 120);
    const user = req.body?.user || {};
    const role = String(user.role || "student");
    if (!roomSlug || !user.id) return res.status(400).json({ error: "roomSlug and user.id are required" });

    if (!STAFF_ROLES.includes(role)) {
      const evaluation = evaluateJoinRequest(req, roomSlug, user, req.body?.device);
      if (evaluation.decision === "block") {
        return res.status(403).json({ error: "This device is not allowed to join this class.", evaluation });
      }
    }

    const isAuditor = role === "auditor";
    const isHost = role === "instructor" || role === "admin";
    const token = new AccessToken(cfg.apiKey, cfg.apiSecret, {
      identity: String(user.id).slice(0, 120),
      name: String(user.name || "Participant").slice(0, 120),
      ttl: "6h",
      metadata: JSON.stringify({
        role,
        avatarColor: user.avatarColor,
        studentCode: user.studentCode,
        gradeLevel: user.gradeLevel,
      }),
    });
    token.addGrant({
      room: roomSlug,
      roomJoin: true,
      canSubscribe: true,
      // Auditors observe silently: no publishing, hidden from the participant list
      canPublish: !isAuditor,
      canPublishData: !isAuditor,
      canPublishSources: isAuditor
        ? []
        : isHost || role === "sales_rep"
        ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
        : [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE],
      hidden: isAuditor,
      roomAdmin: isHost,
    });

    res.json({ token: await token.toJwt(), url: publicLivekitUrl(cfg.url, req) });
  });
}
