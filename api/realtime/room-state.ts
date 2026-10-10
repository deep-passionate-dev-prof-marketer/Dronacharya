// Vercel serverless function for live classroom state synchronization
// Supports GET /api/realtime/room-state (check class status) and POST /api/realtime/room-state (update class status)

interface RoomState {
  roomId: string;
  classStatus: "waiting" | "in_progress" | "paused" | "ended";
  hostId?: string;
  hostName?: string;
  startedAt?: number;
  updatedAt: number;
  participantsCount?: number;
}

const roomStateStore: Map<string, RoomState> = (globalThis as any).__roomStateStore || new Map();
(globalThis as any).__roomStateStore = roomStateStore;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const roomId = String(req.query?.roomId || req.body?.roomId || "default-room");

  if (req.method === "POST") {
    try {
      const { classStatus, hostId, hostName, startedAt, participantsCount } = req.body || {};
      const current = roomStateStore.get(roomId) || {
        roomId,
        classStatus: "waiting",
        updatedAt: Date.now(),
      };

      const updated: RoomState = {
        ...current,
        roomId,
        classStatus: classStatus || current.classStatus,
        hostId: hostId || current.hostId,
        hostName: hostName || current.hostName,
        startedAt: startedAt !== undefined ? startedAt : (classStatus === "in_progress" && !current.startedAt ? Date.now() : current.startedAt),
        participantsCount: participantsCount !== undefined ? participantsCount : current.participantsCount,
        updatedAt: Date.now(),
      };

      roomStateStore.set(roomId, updated);

      return res.status(200).json({ ok: true, state: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }

  if (req.method === "GET") {
    try {
      const state = roomStateStore.get(roomId) || {
        roomId,
        classStatus: "waiting",
        updatedAt: Date.now(),
      };

      return res.status(200).json({ ok: true, state });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
