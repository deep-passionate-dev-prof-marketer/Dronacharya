/**
 * Headless Chrome driven over the DevTools protocol, for the class test and the button crawl.
 * No dependencies: Node's built-in WebSocket and fetch.
 */
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export const CHROME =
  process.env.CHROME ||
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error("Chrome not found; set CHROME=/path/to/chrome");
  process.exit(2);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- minimal CDP client
export class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        (this.handlers.get(msg.method) || []).forEach((h) => h(msg.params));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
}

let nextPort = 9400 + Math.floor(Math.random() * 400);
export async function launch(name, opts = {}) {
  const port = nextPort++;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `e2e-${name}-`));
  const args = [
    process.env.E2E_HEADFUL ? "" : "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${dir}`,
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    `--window-size=${opts.width || 1366},${opts.height || 900}`,
    "about:blank",
  ].filter(Boolean);
  const proc = spawn(CHROME, args, { stdio: "ignore" });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error(`${name}: Chrome didn't start`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  const cdp = new Cdp(ws);
  const errors = [];
  cdp.on("Runtime.exceptionThrown", (p) => {
    const msg = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text;
    // Vite's dev-only hot-reload socket (e.g. two dev servers sharing its port) isn't the app
    if (!/\/@vite\/client/.test(msg || "")) errors.push(msg);
  });
  const logs = [];
  cdp.on("Runtime.consoleAPICalled", (p) => logs.push(`${p.type}: ${p.args.map((a) => a.value ?? a.description ?? "").join(" ")}`.slice(0, 300)));
  cdp.on("Network.requestWillBeSent", (p) => {
    if (/api\/media\//.test(p.request.url)) logs.push(`MEDIA ${p.request.postData?.slice(0, 80)}`);
  });
  cdp.on("Network.responseReceived", (p) => {
    if (/\/api\//.test(p.response.url) && p.response.status >= 400) logs.push(`HTTP ${p.response.status} ${p.response.url.replace(/^https?:\/\/[^/]+/, "")}`);
  });
  cdp.on("Page.javascriptDialogOpening", (p) => {
    errors.push(`dialog: ${p.message}`);
    cdp.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
  });
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  const page = {
    name,
    cdp,
    errors,
    logs,
    async eval(expr) {
      const r = await cdp.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`${name}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
      return r.result.value;
    },
    /** Emulate a screen size (phones get mobile emulation) */
    async viewport(width, height) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    },
    async goto(url) {
      await cdp.send("Page.navigate", { url });
      for (let i = 0; i < 100; i++) {
        await sleep(100);
        if ((await page.eval("document.readyState").catch(() => "")) === "complete") break;
      }
    },
    /** Polls an expression until it's truthy; returns its value (or null after the timeout) */
    async waitFor(expr, timeoutMs = 15000, every = 150) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        const v = await page.eval(expr).catch(() => null);
        if (v) return v;
        await sleep(every);
      }
      return null;
    },
    async close() {
      try {
        ws.close();
      } catch {}
      proc.kill("SIGKILL");
      await sleep(200);
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
  return page;
}
