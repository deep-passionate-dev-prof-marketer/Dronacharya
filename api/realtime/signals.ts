// Vercel serverless function for WebRTC signaling relay across devices
// Supports POST /api/realtime/signals (to send signals) and GET /api/realtime/signals (to poll signals)

interface StoredSignal {
  id: string;
  roomId: string;
  senderId: string;
  targetId?: string;
  type: string;
  payload: any;
  timestamp: number;
}

// In-memory message store per serverless execution container with TTL pruning
const signalStore: Map<string, StoredSignal[]> = (globalThis as any).__signalStore || new Map();
(globalThis as any).__signalStore = signalStore;

function cleanOldSignals(roomId: string) {
  const signals = signalStore.get(roomId);
  if (!signals) return;
  const cutoff = Date.now() - 45_000; // 45 seconds TTL
  const filtered = signals.filter((s) => s.timestamp > cutoff);
  if (filtered.length === 0) {
    signalStore.delete(roomId);
  } else {
    signalStore.set(roomId, filtered);
  }
}

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
      const { senderId, targetId, type, payload, message } = req.body || {};
      if (!type && !message) {
        return res.status(400).json({ error: "Missing signal type or message" });
      }

      cleanOldSignals(roomId);

      if (!signalStore.has(roomId)) {
        signalStore.set(roomId, []);
      }

      const signal: StoredSignal = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        roomId,
        senderId: String(senderId || payload?.senderId || "unknown"),
        targetId: targetId ? String(targetId) : payload?.targetId ? String(payload.targetId) : undefined,
        type: type || "MESSAGE",
        payload: payload !== undefined ? payload : message,
        timestamp: Date.now(),
      };

      const roomSignals = signalStore.get(roomId)!;
      roomSignals.push(signal);

      // Keep maximum 200 recent signals per room
      if (roomSignals.length > 200) {
        roomSignals.splice(0, roomSignals.length - 200);
      }

      return res.status(200).json({ ok: true, id: signal.id, timestamp: signal.timestamp });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }

  if (req.method === "GET") {
    try {
      cleanOldSignals(roomId);
      const peerId = req.query?.peerId ? String(req.query.peerId) : undefined;
      const since = req.query?.since ? parseInt(String(req.query.since), 10) : 0;

      const roomSignals = signalStore.get(roomId) || [];

      // Filter signals:
      // 1. Timestamp > since
      // 2. Not sent by this peer
      // 3. Either targeted to this peer or broadcast (no targetId)
      const matching = roomSignals.filter((s) => {
        if (s.timestamp <= since) return false;
        if (peerId && s.senderId === peerId) return false;
        if (s.targetId && peerId && s.targetId !== peerId) return false;
        return true;
      });

      return res.status(200).json({
        ok: true,
        signals: matching,
        serverTime: Date.now(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
