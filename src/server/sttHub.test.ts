import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "http";
import { WebSocket } from "ws";
import { createSttServer, Transcriber, TranscriberCallbacks } from "./sttHub";

const users: Record<string, any> = {
  "t-student": { id: "stu-1", role: "student", name: "S" },
  "t-parent": { id: "par-1", role: "parent", name: "P" },
};
let received: Buffer[] = [];
let callbacks: TranscriberCallbacks | null = null;
let opened = 0;
let closedUpstream = 0;

const server = http.createServer();
const stt = createSttServer(
  async (_opts, cb): Promise<Transcriber> => {
    opened++;
    callbacks = cb;
    return { send: (pcm) => received.push(pcm), close: () => closedUpstream++ };
  },
  { enabled: () => true, authenticate: async (req) => users[String(req.headers.cookie || "").replace("dr_session=", "")] || null }
);
server.on("upgrade", async (req, socket, head) => {
  if (!(await stt.handleUpgrade(req, socket, head))) socket.destroy();
});
let port = 0;
beforeAll(() => new Promise<void>((r) => server.listen(0, () => ((port = (server.address() as any).port), r()))));
afterAll(() => new Promise<void>((r) => server.close(() => r())));

function connect(cookie: string, origin?: string) {
  return new WebSocket(`ws://127.0.0.1:${port}/stt?lang=en-IN`, { headers: { cookie: `dr_session=${cookie}`, ...(origin ? { origin } : {}) } });
}
const nextMessage = (ws: WebSocket) => new Promise<any>((r) => ws.once("message", (d) => r(JSON.parse(String(d)))));
const rejection = (ws: WebSocket) => new Promise<number>((r) => ws.once("unexpected-response", (_req, res) => r(res.statusCode!)));

describe("/stt WebSocket", () => {
  it("rejects people who aren't signed in, parents, and other sites", async () => {
    expect(await rejection(connect("nobody"))).toBe(401);
    expect(await rejection(connect("t-parent"))).toBe(403);
    expect(await rejection(connect("t-student", "https://evil.example"))).toBe(403);
  });

  it("streams PCM to the transcriber and relays interim and final text", async () => {
    received = [];
    const ws = connect("t-student", `http://127.0.0.1:${port}`);
    expect(await nextMessage(ws)).toEqual({ type: "ready" });
    ws.send(Buffer.alloc(3200)); // 100 ms of silence
    ws.send(Buffer.alloc(3201)); // odd length: not PCM16, dropped
    await new Promise((r) => setTimeout(r, 100));
    expect(opened).toBe(1);
    expect(received.map((b) => b.length)).toEqual([3200]);
    callbacks!.onInterim("hello");
    expect(await nextMessage(ws)).toEqual({ type: "interim", text: "hello" });
    callbacks!.onFinal("hello class");
    expect(await nextMessage(ws)).toEqual({ type: "final", text: "hello class" });
    ws.close();
    await new Promise((r) => setTimeout(r, 100));
    expect(closedUpstream).toBe(1);
  });

  it("reopens the upstream session after it ends (e.g. time limit)", async () => {
    const ws = connect("t-student");
    await nextMessage(ws);
    ws.send(Buffer.alloc(320));
    await new Promise((r) => setTimeout(r, 50));
    const before = opened;
    callbacks!.onClose();
    ws.send(Buffer.alloc(320));
    await new Promise((r) => setTimeout(r, 50));
    expect(opened).toBe(before + 1);
    ws.close();
  });
});
