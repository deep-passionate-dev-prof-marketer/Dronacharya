#!/usr/bin/env node
/**
 * Button crawl: for each role, open every page in the navigation and click every enabled button
 * that isn't destructive, recording anything that goes wrong.
 *
 *   node scripts/ui-crawl.mjs [baseUrl] [--roles=student,instructor] [--no-click] [--expect-no-demos]
 *
 * Recorded per page: uncaught exceptions, console errors, failed API calls (4xx/5xx, except the
 * expected 401/403/404 listed below), browser dialogs (alert/confirm/prompt), and pages wider than
 * the screen at 375 px and 1366 px. With --expect-no-demos (a production-like server), no demo page
 * may appear in any menu. Destructive actions (sign out, end, delete, remove, leave, switch off…)
 * are never clicked; the class test covers them.
 */
import { launch, sleep } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith("--")) || "http://localhost:3000").replace(/\/$/, "");
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const ACCOUNTS = {
  student: "stu-10SOPHIACH",
  instructor: "tch-vance",
  sales_rep: "sales-1",
  auditor: "audit-1",
  admin: "admin-1",
  parent: "par-lchen",
};
const roles = (opt("roles") || Object.keys(ACCOUNTS).join(",")).split(",");
const DEMO_PAGES = ["Pitch rooms", "CRM sync", "Remote devices", "Automation", "Self-hosting", "Certificates"];
// Never clicked: they end, remove or sign out, or leave the page
const DESTRUCTIVE = /sign ?out|log ?out|sign in as someone|end class|end the class|delete|remove|leave|switch (account )?off|unlink|deny|decline|reject|close all|stop presenting|close room|clear the board|clear board|disable|reset|download|save as image|export|copy|print|install|open in new|share a file|upload/i;
// Responses that are part of normal operation (permission checks a page makes on purpose)
const EXPECTED = [
  { status: 404, url: /\/api\/classes\/by-room\// }, // ad-hoc rooms have no scheduled class
  { status: 401, url: /\/api\/auth\/me/ },
];

let problems = 0;
const report = [];
const note = (role, page, kind, detail) => {
  problems++;
  report.push(`  [${role}] ${page}: ${kind}${detail ? ` — ${String(detail).slice(0, 220)}` : ""}`);
};

async function signIn(page, userId) {
  await page.goto(`${BASE}/api/health`);
  const pass = JSON.stringify(process.env.DEV_LOGIN_PASSCODE || "");
  const status = await page.eval(
    `fetch("/api/auth/dev/login", { method: "POST", headers: { "content-type": "application/json", "x-dev-passcode": ${pass} }, body: JSON.stringify({ userId: ${JSON.stringify(userId)} }) }).then(r => r.status)`
  );
  if (status !== 200) throw new Error(`dev login as ${userId} failed (${status})`);
}

/** Problems since the last call, then forget them */
function drain(page) {
  const errs = page.errors.splice(0).filter((e) => !/ResizeObserver loop|@vite\/client/.test(e || ""));
  const net = page.net.splice(0).filter((r) => !EXPECTED.some((x) => x.status === r.status && x.url.test(r.url)));
  const cons = page.consoleErrors.splice(0).filter((m) => !/Failed to load resource|getUserMedia|NotAllowedError|Permission|WebSocket|ICE|webgl|GL_|DevTools|React DevTools|TensorFlow|XNNPACK|gl_context/i.test(m));
  return { errs, net, cons };
}

async function navButtons(page) {
  return page.eval(
    `[...document.querySelectorAll('[aria-label="Primary navigation"] button[aria-label]')].map(b => b.getAttribute("aria-label")).filter(l => !/menu|sidebar|Class links/i.test(l))`
  );
}

async function crawlRole(role) {
  const page = await launch(`crawl-${role}`);
  page.net = [];
  page.consoleErrors = [];
  page.cdp.on("Network.responseReceived", (p) => {
    if (/\/api\//.test(p.response.url) && p.response.status >= 400) page.net.push({ status: p.response.status, url: p.response.url.replace(/^https?:\/\/[^/]+/, "") });
  });
  page.cdp.on("Runtime.consoleAPICalled", (p) => {
    if (p.type === "error") page.consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? "").join(" "));
  });
  await page.cdp.send("Network.enable");
  try {
    await signIn(page, ACCOUNTS[role]);
    await page.goto(`${BASE}/api/health`);
    // A page other than the live class first, so nobody is put into a class by the crawl
    await page.goto(`${BASE}/`);
    await sleep(2500);
    const pages = await navButtons(page);
    if (flag("expect-no-demos")) {
      const shown = pages.filter((p) => DEMO_PAGES.some((d) => p.startsWith(d)));
      if (shown.length) note(role, "navigation", "demo pages visible", shown.join(", "));
    }
    console.log(`${role}: ${pages.length} pages`);
    for (const label of pages) {
      const name = label.split(",")[0];
      for (const width of [1366, 375]) {
        await page.viewport(width, width < 768 ? 812 : 900);
        await sleep(200);
        // On phones the sidebar is a drawer: open it first
        if (width < 768) await page.eval(`document.querySelector('[aria-label="Open menu"]')?.click()`);
        await sleep(300);
        const ok = await page.eval(`(() => { const b = [...document.querySelectorAll('[aria-label="Primary navigation"] button[aria-label]')].find(b => b.getAttribute("aria-label") === ${JSON.stringify(label)}); if (!b) return false; b.click(); return true; })()`);
        if (!ok) {
          if (width === 1366) note(role, name, "couldn't open from the menu");
          continue;
        }
        await sleep(2200);
        const overflow = await page.eval(`(() => { const w = document.documentElement.clientWidth; const wide = [...document.querySelectorAll("main *")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 2 && getComputedStyle(e).position !== "fixed"; }); return wide.length ? wide.slice(0, 2).map(e => e.tagName + "." + String(e.className).slice(0, 60)).join(" | ") : ""; })()`);
        const scrollX = await page.eval(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);
        if (scrollX) note(role, `${name} @${width}`, "page scrolls sideways", overflow);
        if (width === 1366 && !flag("no-click")) await clickAll(page, role, name);
        const { errs, net, cons } = drain(page);
        errs.forEach((e) => note(role, `${name} @${width}`, "uncaught error", e));
        net.forEach((r) => note(role, `${name} @${width}`, `HTTP ${r.status}`, r.url));
        cons.forEach((m) => note(role, `${name} @${width}`, "console error", m));
      }
    }
  } catch (err) {
    note(role, "-", "crawl failed", err?.message || err);
  } finally {
    await page.close();
  }
}

/** Clicks each safe, enabled button in the page body once (then Escape to close what opened) */
async function clickAll(page, role, name) {
  const total = await page.eval(`window.__crawl = [...document.querySelectorAll("main button:not([disabled]), main [role=tab]")].filter(b => b.offsetParent !== null); window.__crawl.length`);
  const limit = Math.min(total, 40);
  for (let i = 0; i < limit; i++) {
    const label = await page.eval(`(() => { const b = window.__crawl[${i}]; return b && document.contains(b) ? ((b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 60)) : null; })()`);
    if (!label || DESTRUCTIVE.test(label)) continue;
    const before = await page.eval("location.pathname");
    await page.eval(`window.__crawl[${i}]?.click()`);
    await sleep(350);
    await page.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    await sleep(150);
    if (page.errors.length) note(role, name, `clicking “${label}”`, page.errors.slice(-1)[0]);
    // Some buttons change page; come back so the rest of the list stays valid
    if ((await page.eval("location.pathname")) !== before) break;
  }
}

console.log(`UI crawl against ${BASE} (${roles.join(", ")})\n`);
for (const role of roles) await crawlRole(role);
console.log(report.length ? `\nProblems:\n${report.join("\n")}` : "\nNo problems found.");
console.log(`\n${problems} problem${problems === 1 ? "" : "s"}`);
process.exit(problems ? 1 : 0);
