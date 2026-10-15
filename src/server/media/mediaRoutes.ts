/**
 * Media endpoints next to the media server: whether it's running (the app falls back to direct
 * peer-to-peer video when it isn't), and relay servers for that fallback.
 */
import type express from "express";
import { requireAuth } from "../auth/session";
import { mediaEnabled } from "./mediaServer";

export function setupMediaRoutes(app: express.Express) {
  app.get("/api/media/status", (_req, res) => {
    res.json({ sfu: mediaEnabled() });
  });

  // Direct (peer-to-peer) mode only: the school's own TURN relay (e.g. coturn on this server), if
  // configured. No public STUN servers are used: a relay you run is the only way through strict networks.
  app.get("/api/media/ice", requireAuth(), (_req, res) => {
    const iceServers: Array<{ urls: string[]; username?: string; credential?: string }> = [];
    const turn = String(process.env.TURN_URLS || "")
      .split(",")
      .map((u) => u.trim())
      .filter((u) => /^(turns?|stun):/.test(u));
    if (turn.length) {
      iceServers.push(
        process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL
          ? { urls: turn, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }
          : { urls: turn }
      );
    }
    res.set("Cache-Control", "no-store").json({ iceServers });
  });
}
