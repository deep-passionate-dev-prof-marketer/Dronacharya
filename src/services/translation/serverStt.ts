/**
 * Server speech-to-text for browsers without a usable speech engine (Firefox, some Safari versions)
 * or when the browser's captions keep failing. The class microphone is resampled to 16 kHz PCM in
 * an AudioWorklet and streamed to /stt; the server transcribes it (Gemini Live) and sends text back.
 * Reuses the class mic stream: no second microphone capture.
 */

export const WORKLET = `
class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;          // fractional read position into the incoming stream
    this.prev = 0;         // last sample of the previous block (for interpolation across blocks)
    this.out = new Int16Array(1600); // 100 ms at 16 kHz
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    // Linear interpolation; positions are relative to this block, -1 means the previous sample
    while (this.pos < ch.length) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const a = i === 0 ? this.prev : ch[i - 1];
      const b = ch[i];
      const s = Math.max(-1, Math.min(1, a + (b - a) * f));
      this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.out.length) {
        this.port.postMessage(this.out.buffer.slice(0));
        this.n = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    this.prev = ch[ch.length - 1];
    return true;
  }
}
registerProcessor("pcm-downsampler", PcmDownsampler);
`;

export interface ServerSttHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onReady?: () => void;
}

export interface ServerSttStatus {
  enabled: boolean;
  /** The school wants everyone transcribed on its servers (no browser speech service) */
  preferServer: boolean;
}

let status: Promise<ServerSttStatus> | null = null;

/** Whether the server can transcribe, and whether it should be used even where the browser could. Cached per page. */
export function serverSttStatus(): Promise<ServerSttStatus> {
  if (!status) {
    status = fetch("/api/stt/status")
      .then((r) => (r.ok ? r.json() : {}))
      .then((b: any) => ({ enabled: Boolean(b.enabled), preferServer: Boolean(b.preferServer) }))
      .catch(() => ({ enabled: false, preferServer: false }));
    // Signed-out pages get 401: ask again after sign-in
    status.then((st) => {
      if (!st.enabled) status = null;
    });
  }
  return status;
}

export function serverSttAvailable(): Promise<boolean> {
  return serverSttStatus().then((s) => s.enabled);
}

export class ServerStt {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private ws: WebSocket | null = null;
  private stopped = false;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private stream: MediaStream, private lang: string, private handlers: ServerSttHandlers) {}

  async start() {
    this.stopped = false;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    try {
      await this.ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    this.source = this.ctx.createMediaStreamSource(new MediaStream(this.stream.getAudioTracks()));
    this.node = new AudioWorkletNode(this.ctx, "pcm-downsampler");
    this.node.port.onmessage = (e) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 256_000) this.ws.send(e.data);
    };
    this.source.connect(this.node);
    // The worklet must be pulled by the graph; route it to a muted gain so nothing is heard
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    this.node.connect(sink).connect(this.ctx.destination);
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
    this.connect();
  }

  private connect() {
    if (this.stopped) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/stt?lang=${encodeURIComponent(this.lang)}`);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onmessage = (e) => {
      let msg: any;
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (msg.type === "ready") {
        this.retry = 0;
        this.handlers.onReady?.();
      } else if (msg.type === "interim" && msg.text) this.handlers.onInterim(msg.text);
      else if (msg.type === "final" && msg.text) this.handlers.onFinal(msg.text);
      else if (msg.type === "error") this.handlers.onError(msg.error || "Server captions unavailable");
    };
    ws.onclose = (e) => {
      if (this.stopped) return;
      if (e.code === 4401 || e.code === 4403 || e.code === 4503) {
        this.handlers.onError(e.reason || "Server captions unavailable");
        return;
      }
      // Network blip or the speech session rolled over: reconnect with backoff
      const delay = Math.min(1000 * 2 ** this.retry++, 15000);
      this.retryTimer = setTimeout(() => this.connect(), delay);
    };
  }

  stop() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    try {
      this.ws?.close(1000);
    } catch {}
    this.ws = null;
    try {
      this.source?.disconnect();
      this.node?.disconnect();
    } catch {}
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.node = null;
    this.source = null;
  }
}
