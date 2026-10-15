#!/usr/bin/env node
/**
 * Two-person class test: a teacher and a learner in two separate headless Chromes (fake camera and
 * microphone), driven over the DevTools protocol. No extra dependencies.
 *
 *   node scripts/e2e-class.mjs [baseUrl]
 *
 * Checks: the learner waits in the lobby → the teacher sees them and admits them → the teacher
 * starts the class → the learner's screen goes live within a few seconds → each sees the other's
 * video and gets the other's audio → the teacher ends the class → both see it ended.
 * Plus: a teacher who doesn't host this class sees "Hosted by …" (no Start button), and a learner
 * who isn't on the class list is told so at the door.
 *
 * Env: CHROME (browser path), E2E_ROOM (default dronacharya-gr10-phy), E2E_TEACHER, E2E_LEARNER,
 * E2E_OTHER_TEACHER, E2E_OUTSIDER, DEV_LOGIN_PASSCODE (staging), E2E_HEADFUL=1 to watch,
 * E2E_CRASH_MEDIA=1 (local server only: kills the media workers mid-class and checks everyone reconnects).
 */
import { CHROME, launch, sleep } from "./lib/browser.mjs";

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const ROOM = process.env.E2E_ROOM || "dronacharya-gr10-phy";
const TEACHER = process.env.E2E_TEACHER || "tch-vance";
const LEARNER = process.env.E2E_LEARNER || "stu-10SOPHIACH";
const OTHER_TEACHER = process.env.E2E_OTHER_TEACHER || "tch-iyer";
const OUTSIDER = process.env.E2E_OUTSIDER || "stu-08LAYLAHAS";
let failures = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function signIn(page, userId) {
  // A plain API page on the same site: signing in from the app would open the home page (for
  // teachers and admins, the live class) before the test sends them where it wants
  await page.goto(`${BASE}/api/health`);
  const pass = JSON.stringify(process.env.DEV_LOGIN_PASSCODE || "");
  const status = await page.eval(`fetch("/api/auth/dev/login", { method: "POST", headers: { "content-type": "application/json", "x-dev-passcode": ${pass} }, body: JSON.stringify({ userId: ${JSON.stringify(userId)} }) }).then(r => r.status)`);
  if (status !== 200) throw new Error(`${page.name}: dev login as ${userId} failed (${status}); is AUTH_DEV_LOGIN=1 (and DEV_LOGIN_PASSCODE set)?`);
}

/** Calls the API from inside the page (with its session cookie) */
const api = (page, method, url, body) =>
  page.eval(
    `fetch(${JSON.stringify(url)}, { method: ${JSON.stringify(method)}, headers: { "content-type": "application/json" }, ${body ? `body: ${JSON.stringify(JSON.stringify(body))}` : ""} }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }))`
  );

const clickButton = (page, re) =>
  page.eval(`(() => { const b = [...document.querySelectorAll("button")].find(b => ${re}.test((b.getAttribute("aria-label") || "") + " " + b.textContent) && !b.disabled && b.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);

const bodyText = (page) => page.eval("document.body.innerText");

/** A remote tile's <video> is playing frames */
const remoteVideoPlaying = (page, id) =>
  page.eval(`(() => { const v = document.querySelector('[data-participant="${id}"] video'); return Boolean(v && v.readyState >= 2 && v.videoWidth > 0); })()`);

/** The other person's audio is attached and playing */
const remoteAudioPlaying = (page, id) =>
  page.eval(`(() => { const a = document.querySelector('audio[data-participant="${id}"]'); return Boolean(a && (a.srcObject || a.src) && !a.paused); })()`);

async function main() {
  console.log(`Class test against ${BASE}, room ${ROOM}\n`);
  const teacher = await launch("teacher");
  const learner = await launch("learner");
  const pages = [teacher, learner];
  try {
    await signIn(teacher, TEACHER);
    await signIn(learner, LEARNER);

    // A clean start: end any class left running in this room
    const before = await api(teacher, "GET", `/api/rooms/${ROOM}/session`);
    check("teacher reads the class session (JSON from the class server)", before.status === 200 && Boolean(before.body?.session), `status ${before.status}`);
    check("server says the teacher hosts this class", before.body?.me?.isHost === true);
    if (before.body?.session?.status === "in_progress") await api(teacher, "POST", `/api/rooms/${ROOM}/session/end`);
    // …and make sure the learner starts in the lobby (another test may have admitted them already)
    await api(teacher, "POST", `/api/rooms/${ROOM}/remove`, { identity: LEARNER, reason: "test reset" });
    const mode = (await api(teacher, "GET", "/api/media/status")).body?.sfu ? "sfu" : "mesh";
    console.log(`Video path: ${mode === "sfu" ? "the school's media server" : "direct (peer-to-peer)"}\n`);

    await teacher.goto(`${BASE}/room/${ROOM}`);
    await learner.goto(`${BASE}/room/${ROOM}`);

    // Learner: lobby first, then into the class (waiting to be admitted)
    const enter = await learner.waitFor(`[...document.querySelectorAll("button")].some(b => /Enter Live Classroom/.test(b.textContent))`, 20000);
    if (enter) await clickButton(learner, "/Enter Live Classroom/");
    const waitingShown = await learner.waitFor(`/Waiting for your teacher to let you in/.test(document.body.innerText)`, 20000);
    check("learner waits in the lobby until admitted", Boolean(waitingShown), waitingShown ? "" : (await bodyText(learner)).slice(0, 300).replace(/\s+/g, " "));

    // Teacher: sees them waiting and admits them
    const waitingBtn = await teacher.waitFor(`Boolean(document.querySelector('[aria-label$="waiting to join"]'))`, 20000);
    check("teacher sees the learner waiting", Boolean(waitingBtn), waitingBtn ? "" : (await bodyText(teacher)).slice(0, 300).replace(/\s+/g, " "));
    await teacher.eval(`document.querySelector('[aria-label$="waiting to join"]')?.click()`);
    const admitted = await teacher.waitFor(`(() => { const b = document.querySelector('[aria-label^="Admit "]'); if (!b) return false; b.click(); return true; })()`, 5000);
    check("teacher admits the learner", Boolean(admitted));
    const inClass = await learner.waitFor(`!/Waiting for your teacher to let you in/.test(document.body.innerText)`, 15000);
    check("learner is let in", Boolean(inClass));

    // Teacher starts; learner goes live within a few seconds
    const startClicked = await teacher.waitFor(`(() => { const b = [...document.querySelectorAll("button")].find(b => /Start (a new )?class/.test(b.textContent) && !b.disabled && b.offsetParent !== null); if (!b) return false; b.click(); return true; })()`, 10000);
    check("teacher has a Start button", Boolean(startClicked));
    const t0 = Date.now();
    const teacherLive = await teacher.waitFor(`/\\bLive\\b/.test(document.body.innerText) && !/Not started/.test(document.body.innerText)`, 10000, 100);
    check("teacher's class is live", Boolean(teacherLive));
    const learnerLive = await learner.waitFor(`/\\bLive\\b/.test(document.body.innerText) && !/Not started/.test(document.body.innerText)`, 10000, 100);
    const liveMs = Date.now() - t0;
    check("learner sees the class start within 3 s", Boolean(learnerLive) && liveMs <= 3000, `${liveMs} ms`);

    // Each sees and hears the other
    check("teacher sees the learner's video", await waitTrue(() => remoteVideoPlaying(teacher, LEARNER), 20000));
    check("learner sees the teacher's video", await waitTrue(() => remoteVideoPlaying(learner, TEACHER), 20000));
    check("teacher gets the learner's audio", await waitTrue(() => remoteAudioPlaying(teacher, LEARNER), 15000));
    check("learner gets the teacher's audio", await waitTrue(() => remoteAudioPlaying(learner, TEACHER), 15000));

    // Opt-in, local server only (E2E_CRASH_MEDIA=1): the media workers crash mid-class. A new worker
    // takes over and both browsers reconnect on their own.
    if (process.env.E2E_CRASH_MEDIA === "1" && mode === "sfu") {
      const { execSync } = await import("node:child_process");
      const pids = execSync("pgrep -f mediasoup-worker || true").toString().trim().split(/\s+/).filter(Boolean);
      for (const pid of pids) process.kill(Number(pid), "SIGKILL");
      console.log(`(killed ${pids.length} media worker(s))`);
      await sleep(1500);
      check("after a media server crash, the teacher sees the learner again", await waitTrue(() => remoteVideoPlaying(teacher, LEARNER), 45000));
      check("…and the learner sees the teacher again", await waitTrue(() => remoteVideoPlaying(learner, TEACHER), 45000));
      check("…and hears them", await waitTrue(() => remoteAudioPlaying(learner, TEACHER), 20000));
      check("…and the class is still live", /\bLive\b/.test(await bodyText(learner)));
    }

    // During a live class, a learner who opens another page stays in the class (like a call)
    await learner.eval(`document.querySelector('[aria-label="Primary navigation"] button[aria-label^="Campus feed"]')?.click()`);
    const bar = await learner.waitFor(`/still in a live class/.test(document.body.innerText)`, 8000);
    check("learner on another page mid-class sees “still in a live class”", Boolean(bar));
    await sleep(2000);
    check("…and the teacher still has them in class", await remoteVideoPlaying(teacher, LEARNER));
    await clickButton(learner, "/Back to class/");
    check("…and “Back to class” returns them", Boolean(await learner.waitFor(`Boolean(document.querySelector('[data-participant="${TEACHER}"]:not(audio)'))`, 8000)));

    // ---- Slides: upload a PDF deck, present it on stage, turn pages ----
    const pdf = tinyPdf(2);
    const up = await teacher.eval(`fetch("/api/materials?roomSlug=${ROOM}&kind=slides&title=E2E%20deck", { method: "POST", headers: { "x-file-name": "e2e-deck.pdf", "content-type": "application/octet-stream" }, body: Uint8Array.from(atob("${pdf.toString("base64")}"), c => c.charCodeAt(0)) }).then(async r => ({ status: r.status, body: await r.json() }))`);
    check("slides: teacher uploads a PDF deck", up.status === 200 && up.body?.material?.kind === "slides", JSON.stringify(up.body));
    const deckId = up.body?.material?.id;
    const shown = await api(teacher, "PUT", `/api/rooms/${ROOM}/slides`, { materialId: deckId });
    check("slides: teacher presents it", shown.status === 200 && shown.body?.slides?.onStage === true);
    check("slides: the learner's stage shows slide 1", Boolean(await learner.waitFor(`Boolean(document.querySelector('canvas[aria-label$="slide 1"]'))`, 15000)));
    await api(teacher, "PUT", `/api/rooms/${ROOM}/slides`, { page: 2, pageCount: 2 });
    check("slides: the learner follows to slide 2", Boolean(await learner.waitFor(`Boolean(document.querySelector('canvas[aria-label$="slide 2"]'))`, 8000)));
    check("slides: learners can't turn the page", (await api(learner, "PUT", `/api/rooms/${ROOM}/slides`, { page: 1 })).status === 403);
    check("slides: the learner can open the presented deck", (await learner.eval(`fetch("/api/materials/${deckId}/download").then(r => r.status)`)) === 200);
    await api(teacher, "DELETE", `/api/rooms/${ROOM}/slides`);
    check("slides: learners can't delete the deck", (await api(learner, "DELETE", `/api/materials/${deckId}`)).status === 403);
    check("slides: the teacher removes the test deck", (await api(teacher, "DELETE", `/api/materials/${deckId}`)).status === 200);

    // ---- Notes pad: the teacher writes, learners read ----
    const padText = `Homework: page ${Date.now() % 1000}`;
    check("notes pad: teacher saves", (await api(teacher, "PUT", `/api/rooms/${ROOM}/pad`, { content: padText })).status === 200);
    check("notes pad: the learner reads it", (await api(learner, "GET", `/api/rooms/${ROOM}/pad`)).body?.pad?.content === padText);
    check("notes pad: learners can't write", (await api(learner, "PUT", `/api/rooms/${ROOM}/pad`, { content: "hacked" })).status === 403);

    // ---- Help buttons ----
    const ask = await api(learner, "POST", "/api/help/ask-parent", { roomSlug: ROOM, message: "I can't hear" });
    // 429 = this learner already asked 3 times today for this class (the limit working; it resets on restart)
    check("help: “ask parent” reaches the linked parent", (ask.status === 200 && (ask.body?.sentTo || []).length > 0) || ask.status === 429, JSON.stringify(ask.body));
    const tkt = await api(learner, "POST", "/api/help/tickets", { roomSlug: ROOM, category: "audio", message: "E2E: no sound" });
    check("help: tech help opens a request", (tkt.status === 200 && Boolean(tkt.body?.id)) || tkt.status === 429, JSON.stringify(tkt.body));

    // ---- Breakouts: the learner moves to a group's video room and comes back ----
    const bo = await api(teacher, "POST", `/api/rooms/${ROOM}/breakouts`, { groups: [{ name: "Group 1", members: [LEARNER] }], minutes: 5 });
    if (mode === "mesh") {
      check("breakouts: refused with a clear reason in direct mode (they need the media server)", bo.status === 503 && /media server/.test(bo.body?.error || ""), JSON.stringify(bo.body));
    } else {
      check("breakouts: teacher opens a group", bo.status === 200 && bo.body?.breakouts?.active === true, JSON.stringify(bo.body));
      const left = await waitTrue(async () => !(await teacher.eval(`Boolean(document.querySelector('[data-participant="${LEARNER}"]:not(audio)'))`)), 15000);
      check("breakouts: the learner leaves the main room", left, left ? "" : learner.logs.filter((l) => /TOKEN|HTTP|error/.test(l)).slice(-8).join(" || "));
      const mine = await api(learner, "GET", `/api/rooms/${ROOM}/breakouts`);
      check("breakouts: the learner sees only their own group", mine.body?.breakouts?.groups?.length === 1);
      check("breakouts: learners can't open or close groups", (await api(learner, "POST", `/api/rooms/${ROOM}/breakouts/close`)).status === 403);
      check("breakouts: the class keeps running", (await api(teacher, "GET", `/api/rooms/${ROOM}/session`)).body?.session?.status === "in_progress");
      await api(teacher, "POST", `/api/rooms/${ROOM}/breakouts/close`);
      const back = await waitTrue(() => remoteVideoPlaying(teacher, LEARNER), 20000);
      check("breakouts: closing brings the learner back (video)", back, back ? "" : learner.logs.filter((l) => /TOKEN|HTTP|error|warn/.test(l)).slice(-8).join(" || ") + " ## learner store: " + (await learner.eval(`JSON.stringify(window.__classroomTransport?.state)`)));
    }

    // Someone signed in on another page (here: an admin on People) is not in the class: no tile, no camera
    const admin = await launch("admin-elsewhere");
    pages.push(admin);
    await signIn(admin, "admin-1");
    await admin.goto(`${BASE}/admin/IND/en-IN/admin-1/x/people`);
    await sleep(6000);
    const adminTile = await teacher.eval(`Boolean(document.querySelector('[data-participant="admin-1"]:not(audio)'))`);
    check("an admin on another page isn't in the class", !adminTile, adminTile ? `admin url ${await admin.eval("location.pathname")} · transport ${await admin.eval("JSON.stringify(window.__classroomTransport?.state)")}` : "");
    check("…and their camera isn't on", (await admin.eval(`document.querySelectorAll("video").length`)) === 0);

    // A teacher who doesn't host this class sees who does, not a Start button that fails
    const other = await launch("other-teacher");
    pages.push(other);
    await signIn(other, OTHER_TEACHER);
    const otherSession = await api(other, "GET", `/api/rooms/${ROOM}/session`);
    check("another teacher isn't the host", otherSession.body?.me?.isHost === false);
    const otherStart = await api(other, "POST", `/api/rooms/${ROOM}/session/start`);
    check("another teacher can't start or end it", otherStart.status === 403);

    // A learner who isn't on the class list is told so at the door
    const outsider = await launch("outsider");
    pages.push(outsider);
    await signIn(outsider, OUTSIDER);
    const tok = await api(outsider, "GET", `/api/rooms/${ROOM}/session`);
    check("outsider can't open the class session", tok.status === 403 && tok.body?.reason === "not_enrolled", `status ${tok.status}`);
    await outsider.goto(`${BASE}/room/${ROOM}`);
    const told = await outsider.waitFor(`/not on this class's list/i.test(document.body.innerText)`, 15000);
    check("outsider sees “You're not on this class's list”", Boolean(told), told ? "" : `${(await bodyText(outsider)).slice(0, 300).replace(/\s+/g, " ")} ## ${outsider.logs.filter((l) => /HTTP|error|warn/.test(l)).slice(-6).join(" || ")} ## ${await outsider.eval("JSON.stringify(window.__classroomTransport?.state)")}`);

    // Teacher ends the class; the learner sees it ended
    const ended = await api(teacher, "POST", `/api/rooms/${ROOM}/session/end`);
    check("teacher ends the class", ended.status === 200 && ended.body?.session?.status === "ended");
    const learnerEnded = await learner.waitFor(`/Class ended/.test(document.body.innerText)`, 10000, 100);
    check("learner sees the class ended", Boolean(learnerEnded));

    for (const p of pages) {
      // Vite's dev hot-reload socket isn't part of the app (and fails when two dev servers run)
      const errs = p.errors.filter((e) => !/ResizeObserver loop|@vite\/client/.test(e || ""));
      check(`${p.name}: no uncaught errors or dialogs`, errs.length === 0, errs.slice(0, 3).join(" | "));
    }
  } finally {
    for (const p of pages) await p.close();
  }
  console.log(`\n${results.length - failures} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

/** A small valid PDF with `pages` blank pages, each labelled */
function tinyPdf(pages) {
  const objs = [];
  const kids = Array.from({ length: pages }, (_, i) => `${3 + i * 2} 0 R`).join(" ");
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`);
  for (let i = 0; i < pages; i++) {
    const text = `BT /F1 48 Tf 100 400 Td (Slide ${i + 1}) Tj ET`;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`);
    objs.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function waitTrue(fn, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn().catch(() => false)) return true;
    await sleep(250);
  }
  return false;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
