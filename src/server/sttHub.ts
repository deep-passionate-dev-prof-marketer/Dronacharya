/**
 * Server speech-to-text: browsers stream 16 kHz PCM16 mono over a WebSocket at /stt and get
 * caption text back. All live captions are made here, on the school's own Whisper server (WHISPER_URL):
 * the browser's built-in speech recognition is never used, because it sends audio to Google or
 * Microsoft. Disabled when WHISPER_URL isn't set.
 *
 * Protocol: client → binary audio frames (≤ 64 KB) and {"type":"stop"};
 *           server → {"type":"ready"} | {"type":"interim","text"} | {"type":"final","text"} | {"type":"error","error"}.
 */
import http from "http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { requireAuth, userFromCookieHeader, SessionUser } from "./auth/session";
import { breakers, CircuitBreaker, whisperConfigured } from "./ai/providers";
import { localWhisperTranscriber } from "./ai/localWhisper";

export interface Transcriber {
  send(pcm16: Buffer): void;
  close(): void;
}

export interface TranscriberCallbacks {
  onInterim(text: string): void;
  onFinal(text: string): void;
  onError(message: string): void;
  /** The upstream session ended (time limit, network); the hub reopens it if the client is still there */
  onClose(): void;
}

export type TranscriberFactory = (opts: { lang?: string }, cb: TranscriberCallbacks) => Promise<Transcriber>;

const MAX_FRAME = 64 * 1024;
const MAX_BYTES_PER_MIN = 2.5 * 1024 * 1024; // 16 kHz × 2 bytes × 60 s ≈ 1.9 MB
const IDLE_MS = 30_000;

/** Dev-only stand-in that reports how much audio arrived (exercises the whole pipeline without any speech service). */
const fakeMode = () => process.env.STT_FAKE === "1" && process.env.NODE_ENV !== "production";

/** Server captions are on when at least one speech service is configured. */
export function sttEnabled() {
  return whisperConfigured() || fakeMode();
}

const fakeTranscriber: TranscriberFactory = async (_opts, cb) => {
  let bytes = 0;
  let reported = 0;
  return {
    send(pcm) {
      bytes += pcm.length;
      const ms = Math.round(bytes / 32);
      if (ms - reported >= 2000) {
        reported = ms;
        cb.onFinal(`test transcript: received ${(ms / 1000).toFixed(0)} seconds of audio`);
      } else cb.onInterim(`test transcript: listening (${ms} ms)`);
    },
    close() {},
  };
};

export interface ChainEntry {
  name: string;
  factory: TranscriberFactory;
  breaker?: CircuitBreaker;
}

/**
 * Tries transcribers in order. If one can't connect or fails during the class, the stream moves
 * to the next one without the learner noticing.
 */
export function chainTranscriber(chain: ChainEntry[]): TranscriberFactory {
  return async (opts, cb) => {
    if (!chain.length) throw new Error("No speech service is available");
    let index = -1;
    let current: Transcriber | null = null;
    let closed = false;
    let switching: Promise<void> | null = null;

    const openFrom = async (start: number): Promise<void> => {
      for (let i = start; i < chain.length; i++) {
        const entry = chain[i];
        try {
          const t = await entry.factory(opts, {
            onInterim: (text) => i === index && cb.onInterim(text),
            onFinal: (text) => i === index && cb.onFinal(text),
            onError: (message) => {
              if (i !== index || closed) return;
              entry.breaker?.failure(new Error(message));
              console.warn(`[stt] ${entry.name} failed (${message}); trying the next provider`);
              failOver(i + 1, message);
            },
            onClose: () => i === index && cb.onClose(),
          });
          if (closed) return t.close();
          entry.breaker?.success();
          index = i;
          current = t;
          if (i > 0) console.info(`[stt] captions are now served by ${entry.name}`);
          return;
        } catch (err: any) {
          entry.breaker?.failure(err);
          console.warn(`[stt] ${entry.name} unavailable:`, String(err?.message || err).slice(0, 160));
        }
      }
      throw new Error("No speech service is available");
    };

    const failOver = (from: number, message: string) => {
      const old = current;
      current = null;
      index = -1;
      try {
        old?.close();
      } catch {}
      switching = openFrom(from)
        .catch(() => cb.onError(`Server captions are unavailable right now (${message})`))
        .finally(() => {
          switching = null;
        });
    };

    await openFrom(0);
    return {
      send(pcm) {
        // Audio during a switch-over (a fraction of a second) is dropped
        if (!switching) current?.send(pcm);
      },
      close() {
        closed = true;
        current?.close();
      },
    };
  };
}

/** The school's Whisper server (skipped while it's cooling down after failures). */
export const providerChainTranscriber: TranscriberFactory = (opts, cb) => {
  const chain: ChainEntry[] = [];
  if (whisperConfigured() && breakers.whisper.available()) chain.push({ name: "local", factory: localWhisperTranscriber });
  if (!chain.length && fakeMode()) chain.push({ name: "fake", factory: fakeTranscriber });
  return chainTranscriber(chain)(opts, cb);
};

const STT_ROLES = ["instructor", "admin", "sales_rep", "student"];

/** WebSocket upgrades must come from our own pages (defence against cross-site WebSocket hijacking). */
export function sameOrigin(req: http.IncomingMessage): boolean {
  const origin = req.headers.origin;
  // Browsers always send an Origin on WebSocket upgrades; in production a missing one is refused
  if (!origin) return process.env.NODE_ENV !== "production";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function createSttServer(
  factory: TranscriberFactory,
  opts: { enabled?: () => boolean; authenticate?: (req: http.IncomingMessage) => Promise<SessionUser | null> } = {}
) {
  const enabled = opts.enabled || sttEnabled;
  const authenticate = opts.authenticate || (async (req: http.IncomingMessage) => (await userFromCookieHeader(req.headers.cookie).catch(() => null))?.user || null);
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME });
  const byUser = new Map<string, WebSocket>();

  wss.on("connection", (ws: WebSocket, req: http.IncomingMessage, user: SessionUser) => {
    // One stream per person: a new tab/device replaces the old one
    byUser.get(user.id)?.close(4000, "Replaced by a newer connection");
    byUser.set(user.id, ws);
    const lang = new URL(req.url || "/stt", "http://x").searchParams.get("lang")?.slice(0, 20) || undefined;
    const send = (m: object) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m));

    let transcriber: Transcriber | null = null;
    let opening: Promise<void> | null = null;
    let closed = false;
    let windowStart = Date.now();
    let windowBytes = 0;
    let lastAudio = Date.now();

    const open = () => {
      if (transcriber || opening || closed) return opening;
      opening = factory(
        { lang },
        {
          onInterim: (text) => send({ type: "interim", text }),
          onFinal: (text) => send({ type: "final", text }),
          onError: (error) => send({ type: "error", error }),
          onClose: () => {
            transcriber = null; // reopened on the next audio frame
          },
        }
      )
        .then((t) => {
          if (closed) return t.close();
          transcriber = t;
        })
        .catch((err) => {
          console.warn("[stt] could not open transcription:", err?.message || err);
          send({ type: "error", error: "Server captions are unavailable right now." });
          ws.close(4503, "Speech service unavailable");
        })
        .finally(() => {
          opening = null;
        });
      return opening;
    };

    const idle = setInterval(() => {
      if (transcriber && Date.now() - lastAudio > IDLE_MS) {
        transcriber.close();
        transcriber = null;
      }
    }, 5000);

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (!isBinary) {
        try {
          if (JSON.parse(String(data)).type === "stop") ws.close(1000);
        } catch {}
        return;
      }
      const now = Date.now();
      if (now - windowStart > 60_000) {
        windowStart = now;
        windowBytes = 0;
      }
      windowBytes += data.length;
      if (windowBytes > MAX_BYTES_PER_MIN) return; // more audio than real time: drop
      if (data.length % 2 !== 0) return; // PCM16 frames only
      lastAudio = now;
      if (transcriber) transcriber.send(data);
      else open()?.then(() => transcriber?.send(data));
    });

    ws.on("close", () => {
      closed = true;
      clearInterval(idle);
      transcriber?.close();
      transcriber = null;
      if (byUser.get(user.id) === ws) byUser.delete(user.id);
    });

    send({ type: "ready" });
  });

  /** Handles an HTTP upgrade for /stt (returns false if it isn't ours). */
  async function handleUpgrade(req: http.IncomingMessage, socket: any, head: Buffer): Promise<boolean> {
    const url = new URL(req.url || "/", "http://x");
    if (url.pathname !== "/stt") return false;
    const reject = (code: number, msg: string) => {
      socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    if (!enabled()) {
      reject(503, "Service Unavailable");
      return true;
    }
    const user = await authenticate(req);
    if (!user) {
      reject(401, "Unauthorized");
      return true;
    }
    if (!STT_ROLES.includes(user.role)) {
      reject(403, "Forbidden");
      return true;
    }
    // Same-origin pages only (cookies are sent cross-site for WebSockets)
    if (!sameOrigin(req)) {
      reject(403, "Forbidden");
      return true;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, user));
    return true;
  }

  return { wss, handleUpgrade };
}

export function setupSttRoutes(app: express.Express) {
  app.get("/api/stt/status", requireAuth(), (_req, res) =>
    res.json({
      enabled: sttEnabled(),
      // Always our own server: the browser's speech recognition would send audio to Google/Microsoft
      preferServer: sttEnabled(),
      serverOnly: true,
      providers: whisperConfigured() ? ["local"] : [],
    })
  );
}
