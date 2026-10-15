// API regression suite for a running server with dummy sign-in on (AUTH_DEV_LOGIN=1).
//   node scripts/api-smoke.mjs [baseUrl]        (default http://localhost:3000)
// Creates a throwaway ad-hoc class each run. Exits non-zero if anything fails.
import WebSocket from "ws";

const BASE = process.argv[2] || "http://localhost:3000";
let pass = 0;
let fail = 0;
const check = (name, ok, info = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${info}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(userId) {
  const r = await fetch(`${BASE}/api/auth/dev/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
  if (!r.ok) throw new Error(`dev login for ${userId} failed (${r.status}); is AUTH_DEV_LOGIN=1?`);
  return (r.headers.get("set-cookie") || "").split(";")[0];
}
async function call(cookie, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try {
    json = await r.json();
  } catch {}
  return { status: r.status, json };
}
const wsStatus = (url, headers) =>
  new Promise((res) => {
    const ws = new WebSocket(url, { headers });
    ws.on("open", () => (ws.close(), res(101)));
    ws.on("unexpected-response", (_q, r) => res(r.statusCode));
    ws.on("error", () => res(0));
  });

/** One request to the media server's socket (/media), as a signed-in user */
const mediaCall = (cookie, method, data) =>
  new Promise((res) => {
    const ws = new WebSocket(`${BASE.replace(/^http/, "ws")}/media`, { headers: { origin: BASE, ...(cookie ? { cookie } : {}) } });
    const done = (v) => {
      try {
        ws.close();
      } catch {}
      res(v);
    };
    ws.on("open", () => ws.send(JSON.stringify({ id: 1, method, data })));
    ws.on("message", (d) => {
      const m = JSON.parse(d.toString());
      if (m.id === 1) done(m);
    });
    ws.on("unexpected-response", (_q, r) => done({ ok: false, status: r.statusCode }));
    ws.on("error", () => done({ ok: false, error: "socket error" }));
    setTimeout(() => done({ ok: false, error: "timeout" }), 8000);
  });
const DESKTOP = { deviceId: "smoke", deviceType: "laptop", osName: "macOS", browserName: "Chrome", screenWidth: 1440, screenHeight: 900, timezone: "Asia/Kolkata" };

const U = {};
for (const [k, id] of Object.entries({ t: "tch-vance", stu: "stu-10SOPHIACH", par: "par-lchen", aud: "audit-1", sales: "sales-1" })) U[k] = await login(id);

// ---------- auth ----------
check("signed-out /api/auth/me is 401", (await call(null, "GET", "/api/auth/me")).status === 401);
check("dev login gives a session", (await call(U.t, "GET", "/api/auth/me")).json?.user?.id === "tch-vance");
{
  const r = await mediaCall(U.t, "join", { roomSlug: "dronacharya-gr10-phy", user: { id: "admin-1", role: "admin" } });
  check("media server: identity comes from the session, not the request", r.ok && r.data?.you?.id === "tch-vance" && r.data?.you?.isHost === true, JSON.stringify(r).slice(0, 200));
}
check("media server: signed-out is refused", (await mediaCall(null, "join", { roomSlug: "dronacharya-gr10-phy" })).reason === "signed_out");
check("media server: learners with no device info are refused (fail closed)", (await mediaCall(U.stu, "join", { roomSlug: "dronacharya-gr10-phy" })).reason === "device");
check("media server: parents can't join", (await mediaCall(U.par, "join", { roomSlug: "dronacharya-gr10-phy", device: DESKTOP })).reason === "parent");
check("media server: nothing works before joining", (await mediaCall(U.t, "createTransport", { direction: "send" })).ok === false);

// ---------- class session, transcript, notes ----------
const room = `smoke-${Date.now().toString(36)}`;
check("student can't start a class", (await call(U.stu, "POST", `/api/rooms/${room}/session/start`)).status === 403);
check("signed-out can't start a class", (await call(null, "POST", `/api/rooms/${room}/session/start`)).status === 401);
const starts = await Promise.all(Array.from({ length: 5 }, () => call(U.t, "POST", `/api/rooms/${room}/session/start`)));
check("5 concurrent starts make exactly one recording", starts.every((s) => s.status === 200) && new Set(starts.map((s) => s.json?.session?.recording?.id)).size === 1);
for (const text of [
  "Today we revise Newton's second law of motion and acceleration",
  "Force equals mass times acceleration for a constant mass",
  "Why does a heavier trolley need more force?",
  "For homework do the acceleration worksheet",
])
  await call(U.t, "POST", `/api/rooms/${room}/transcript`, { text });
check("transcript: parent refused", (await call(U.par, "POST", `/api/rooms/${room}/transcript`, { text: "x" })).status === 403);
check("transcript: auditor refused", (await call(U.aud, "POST", `/api/rooms/${room}/transcript`, { text: "x" })).status === 403);
check("transcript: empty refused", (await call(U.t, "POST", `/api/rooms/${room}/transcript`, { text: "   " })).status === 400);
check("student can't end the class", (await call(U.stu, "POST", `/api/rooms/${room}/session/end`)).status === 403);
check("host ends the class", (await call(U.t, "POST", `/api/rooms/${room}/session/end`)).json?.session?.status === "ended");
check("ending twice is harmless", (await call(U.t, "POST", `/api/rooms/${room}/session/end`)).json?.session?.status === "ended");

check("students can't list recordings", (await call(U.stu, "GET", "/api/recordings")).status === 403);
check("parents can't list recordings", (await call(U.par, "GET", "/api/recordings")).status === 403);
const recs = (await call(U.t, "GET", "/api/recordings")).json?.recordings || [];
const rec = recs.find((r) => r.roomSlug === room);
check("teacher sees the recording they ran", Boolean(rec));
check("counsellor doesn't see another teacher's classes", !((await call(U.sales, "GET", "/api/recordings")).json?.recordings || []).some((r) => r.roomSlug === room));
check("transcript-only recording has no video", (await call(U.aud, "GET", `/api/recordings/${rec?.id}/media`)).status === 404);
check("teacher playback hides engagement data", (await call(U.t, "GET", `/api/recordings/${rec?.id}`)).json?.engagement === null);
check("auditor playback includes engagement data", Array.isArray((await call(U.aud, "GET", `/api/recordings/${rec?.id}`)).json?.engagement));
check("student can't open a recording", (await call(U.stu, "GET", `/api/recordings/${rec?.id}`)).status === 404);

// Notes: Gemini, else the local model (can take a minute or two), else extractive
let n = null;
for (let i = 0; i < 60 && !n; i++) {
  await sleep(4000);
  n = ((await call(U.t, "GET", "/api/notes")).json?.notes || []).find((x) => x.roomSlug === room) || null;
}
check("notes generated after the class", Boolean(n), "no notes after 4 minutes");
console.log(`      notes written by: ${n?.generator}`);
check("homework found, and teaching talk ('we revise') isn't homework", n?.notes.homework.length === 1 && /worksheet/i.test(n?.notes.homework[0] || ""), JSON.stringify(n?.notes.homework));
check("a learner not in the class can't read its notes", !((await call(U.stu, "GET", "/api/notes")).json?.notes || []).some((x) => x.roomSlug === room));
const ask = await call(U.t, "POST", `/api/notes/${n?.id}/ask`, { question: "What does force equal?" });
check("ask about the class answers from the transcript", ask.status === 200 && ask.json?.quotes?.length > 0, JSON.stringify(ask.json));
console.log(`      answered by: ${ask.json?.generator}`);
check("ask: learners outside the class get 404", (await call(U.stu, "POST", `/api/notes/${n?.id}/ask`, { question: "What does force equal?" })).status === 404);

// ---------- parent portal ----------
check("parent sees only their child", JSON.stringify(((await call(U.par, "GET", "/api/parent/children")).json?.children || []).map((c) => c.id)) === '["stu-10SOPHIACH"]');
check("parent can't open another family's child", (await call(U.par, "GET", "/api/parent/children/stu-10AARAVMEH")).status === 404);
check("teacher can't use the parent portal", (await call(U.t, "GET", "/api/parent/children/stu-10SOPHIACH")).status === 403);
check("learner can view their own progress", (await call(U.stu, "GET", "/api/parent/children/stu-10SOPHIACH")).status === 200);
check("learner can't change consent", (await call(U.stu, "POST", "/api/parent/children/stu-10SOPHIACH/consent", { kind: "recording", granted: false })).status === 403);
check("consent: unknown kind refused", (await call(U.par, "POST", "/api/parent/children/stu-10SOPHIACH/consent", { kind: "x", granted: true })).status === 400);
{
  const before = (await call(U.par, "GET", "/api/parent/children/stu-10SOPHIACH")).json?.consents?.recording;
  const off = await call(U.par, "POST", "/api/parent/children/stu-10SOPHIACH/consent", { kind: "recording", granted: false, guardianName: "Linda Chen" });
  const me = await call(U.stu, "GET", "/api/rooms/dronacharya-gr10-phy/session");
  const on = await call(U.par, "POST", "/api/parent/children/stu-10SOPHIACH/consent", { kind: "recording", granted: before ? before.granted : true, guardianName: "Linda Chen" });
  check("recording consent change reaches the learner", off.json?.consents?.recording?.granted === false && me.json?.me?.recordingExcluded === true && on.status === 200);
}

// ---------- remarks, room control, security ----------
check("counsellor can't remark on a learner they don't teach", (await call(U.sales, "POST", "/api/remarks", { studentId: "stu-10SOPHIACH", note: "x" })).status === 403);
check("learners can't write remarks", (await call(U.stu, "POST", "/api/remarks", { studentId: "stu-10SOPHIACH", note: "x" })).status === 403);
check("student can't admit", (await call(U.stu, "POST", "/api/rooms/dronacharya-gr10-phy/admit", { identities: ["stu-10SOPHIACH"] })).status === 403);
check("student can't start a poll", (await call(U.stu, "POST", "/api/rooms/dronacharya-gr10-phy/polls", { question: "q", options: ["a", "b"] })).status === 403);
check("teacher can't read security events", (await call(U.t, "GET", "/api/security/events")).status === 403);
check("auditor reads security events", (await call(U.aud, "GET", "/api/security/events")).status === 200);
check("no outside webhook can end a class", (await fetch(`${BASE}/api/livekit/webhook`, { method: "POST", body: "{}" })).status === 404);
const wsBase = BASE.replace(/^http/, "ws");
check("room socket refuses other sites", (await wsStatus(`${wsBase}/`, { origin: "https://evil.example", cookie: U.stu })) === 403);
check("room socket accepts our own pages", (await wsStatus(`${wsBase}/`, { origin: BASE, cookie: U.stu })) === 101);
const stt = (await call(U.stu, "GET", "/api/stt/status")).json;
check("/api/stt/status lists the configured speech providers", typeof stt?.enabled === "boolean" && Array.isArray(stt?.providers));
console.log(`      speech providers: ${JSON.stringify(stt?.providers)}`);
check("/stt refuses parents", (await wsStatus(`${wsBase}/stt`, { origin: BASE, cookie: U.par })) === (stt?.enabled ? 403 : 503));
check("desktop downloads endpoint is public", (await call(null, "GET", "/api/desktop/downloads")).status === 200);
check("signed-out notes are 401", (await call(null, "GET", "/api/notes")).status === 401);
check("docs: a listed document loads for staff", (await call(U.t, "GET", "/api/docs/PRD")).json?.content?.includes("Product Requirements"));
check("docs: learners can't read platform docs", (await call(U.stu, "GET", "/api/docs/PRD")).status === 403);
check("docs: paths outside docs/ are refused", (await call(U.t, "GET", `/api/docs/${encodeURIComponent("../README")}`)).status === 404);

// ---------- class analytics (auditors and admins only) ----------
{
  U.adm = await login("admin-1");
  const q = `from=${encodeURIComponent(new Date(Date.now() - 90 * 864e5).toISOString())}&to=${encodeURIComponent(new Date(Date.now() + 864e5).toISOString())}&tz=Asia/Kolkata`;
  check("analytics: signed-out is 401", (await call(null, "GET", `/api/analytics/summary?${q}`)).status === 401);
  for (const [who, c] of [["teacher", U.t], ["student", U.stu], ["parent", U.par], ["counsellor", U.sales]])
    check(`analytics: ${who} is refused`, (await call(c, "GET", `/api/analytics/summary?${q}`)).status === 403);
  const sum = await call(U.aud, "GET", `/api/analytics/summary?${q}`);
  check("analytics: auditor gets KPIs, trend, mix and needs-attention", sum.status === 200 && typeof sum.json?.kpis?.current?.sessions === "number" && Array.isArray(sum.json?.trend?.points) && Array.isArray(sum.json?.attention));
  check("analytics: admin can read too", (await call(U.adm, "GET", `/api/analytics/summary?${q}`)).status === 200);
  const all = sum.json?.kpis?.current?.sessions || 0;
  const classesOnly = (await call(U.aud, "GET", `/api/analytics/summary?${q}&kind=enrolled`)).json?.kpis?.current;
  check("analytics: a filter narrows the numbers", classesOnly && classesOnly.sessions <= all && classesOnly.counsellingSessions === 0, JSON.stringify({ all, enrolled: classesOnly?.sessions }));
  const meta = (await call(U.aud, "GET", `/api/analytics/meta?tz=UTC`)).json;
  const dims = [...(meta?.dimensions?.session || []), ...(meta?.dimensions?.learner || [])];
  let dimOk = dims.length >= 19;
  let privacyOk = true;
  for (const d of dims) {
    const r = await call(U.aud, "GET", `/api/analytics/breakdown?${q}&dim=${d}`);
    if (r.status !== 200) dimOk = false;
    if (r.json?.learnerLevel && r.json.rows.some((row) => row.n < 3)) privacyOk = false;
  }
  check(`analytics: every breakdown works (${dims.length} dimensions)`, dimOk);
  check("analytics: learner groups under 3 are never shown", privacyOk);
  check("analytics: unknown dimension refused", (await call(U.aud, "GET", `/api/analytics/breakdown?${q}&dim=password`)).status === 400);
  const t1 = meta?.filters?.teacher?.[0]?.value;
  const byTeacher = (await call(U.aud, "GET", `/api/analytics/sessions?${q}&teacher=${t1}&pageSize=5`)).json;
  check("analytics: session list pages and filters by teacher", byTeacher?.sessions?.length <= 5 && byTeacher.sessions.every((x) => x.teacherId === t1), JSON.stringify(byTeacher?.sessions?.map((x) => x.teacherId)));
  check("analytics: unknown session is 404", (await call(U.aud, "GET", "/api/analytics/sessions/nope")).status === 404);
  const csv = await fetch(`${BASE}/api/analytics/export.csv?${q}`, { headers: { cookie: U.aud } });
  const csvText = await csv.text();
  check("analytics: CSV export works for auditors", csv.status === 200 && /text\/csv/.test(csv.headers.get("content-type") || "") && csvText.startsWith("started_at,"));
  check("analytics: CSV export refused for teachers", (await fetch(`${BASE}/api/analytics/export.csv?${q}`, { headers: { cookie: U.t } })).status === 403);

  // The smoke class above becomes an analytics session (facts are computed ~20 s after it ends)
  let s = null;
  for (let i = 0; i < 20 && !s; i++) {
    const r = await call(U.aud, "GET", `/api/analytics/sessions/${rec?.id}`);
    if (r.status === 200) s = r.json;
    else await sleep(3000);
  }
  check("analytics: a finished class gets its facts", s?.facts?.transcriptLines === 4 && s?.facts?.kind === "adhoc" && s?.facts?.teacherTalkShare === 1, JSON.stringify(s?.facts && { lines: s.facts.transcriptLines, kind: s.facts.kind, talk: s.facts.teacherTalkShare }));

  // Auditor reviews
  check("reviews: teachers can't review", (await call(U.t, "POST", "/api/reviews", { recordingId: rec?.id, scores: { clarity: 4 } })).status === 403);
  check("reviews: teachers can't read reviews", (await call(U.t, "GET", `/api/reviews?recordingId=${rec?.id}`)).status === 403);
  check("reviews: submitting needs every line scored", (await call(U.aud, "POST", "/api/reviews", { recordingId: rec?.id, scores: { clarity: 3 }, submit: true })).status === 400);
  check("reviews: a draft saves", (await call(U.aud, "POST", "/api/reviews", { recordingId: rec?.id, scores: { clarity: 3, pacing: 9 } })).json?.review?.status === "draft");
  const full = { clarity: 3, pacing: 4, interaction: 2, accuracy: 4, management: 3 };
  check("reviews: submitted", (await call(U.aud, "POST", "/api/reviews", { recordingId: rec?.id, scores: full, submit: true })).json?.review?.status === "submitted");
  check("reviews: submitted reviews can't be changed", (await call(U.aud, "POST", "/api/reviews", { recordingId: rec?.id, scores: full, submit: true })).status === 409);
  const after = await call(U.aud, "GET", `/api/analytics/sessions/${rec?.id}`);
  check("reviews: the review counts toward the class score", after.json?.facts?.reviewScore === 3.2, JSON.stringify(after.json?.facts?.reviewScore));

  // Targets and weights (admins only, sanitised), then put them back
  const before = (await call(U.adm, "GET", "/api/analytics/meta")).json;
  check("analytics settings: auditors can't change them", (await call(U.aud, "PUT", "/api/analytics/settings", { targets: { quality: 10 } })).status === 403);
  const put = await call(U.adm, "PUT", "/api/analytics/settings", { weights: { teaching: { ...before.weights.teaching, engagement: 80 } }, targets: { quality: 500 } });
  check("analytics settings: engagement capped at 25, out-of-range targets ignored", put.json?.weights?.teaching?.engagement === 25 && put.json?.targets?.quality === before.targets.quality, JSON.stringify(put.json));
  await call(U.adm, "PUT", "/api/analytics/settings", { weights: before.weights, targets: before.targets });

  // Attendance by session
  check("attendance: teacher lists their classes", Array.isArray((await call(U.t, "GET", "/api/attendance/sessions?days=7")).json?.sessions));
  check("attendance: teacher opens their own class", (await call(U.t, "GET", `/api/attendance/sessions/${rec?.id}`)).status === 200);
  check("attendance: another teacher can't open it", (await call(await login("tch-sharma"), "GET", `/api/attendance/sessions/${rec?.id}`)).status === 404);
  check("attendance: learners are refused", (await call(U.stu, "GET", "/api/attendance/sessions")).status === 403);
  check("attendance: auditor opens a class", (await call(U.aud, "GET", `/api/attendance/sessions/${rec?.id}`)).status === 200);

  // Demo history never leaks into real views
  const anyDemo = (list) => (list || []).some((x) => String(x.roomSlug || "").startsWith("demo-"));
  check("demo history stays out of recordings", !anyDemo((await call(U.adm, "GET", "/api/recordings")).json?.recordings));
  check("demo history stays out of notes", !anyDemo((await call(U.adm, "GET", "/api/notes")).json?.notes));
  check("demo history stays out of class lists", !anyDemo((await call(U.adm, "GET", "/api/classes/mine")).json?.classes));
  check("demo history stays out of attendance", !anyDemo((await call(U.adm, "GET", "/api/attendance/sessions?days=90")).json?.sessions));
  check("demo history stays out of the security log", !anyDemo((await call(U.aud, "GET", "/api/security/events?days=30")).json?.events));
}

// ---------- security (production hardening) ----------
{
  const wsBase = BASE.replace(/^http/, "ws");
  U.adm ||= await login("admin-1");
  const outsider = await login("stu-08LAYLAHAS");

  /** Opens a room socket and collects messages for `ms` after sending `msgs` */
  const wsTalk = (headers, msgs, ms = 1500) =>
    new Promise((res) => {
      const got = [];
      const ws = new WebSocket(`${wsBase}/`, { headers });
      ws.on("message", (d) => {
        try {
          got.push(JSON.parse(d.toString()));
        } catch {}
      });
      ws.on("open", async () => {
        for (const m of msgs) {
          ws.send(JSON.stringify(m));
          await sleep(150);
        }
        setTimeout(() => (ws.close(), res(got)), ms);
      });
      ws.on("error", () => res(got));
    });
  const types = (list) => list.map((m) => m.type);

  // Room socket: nothing but joining before sign-in; class lists are enforced at the door
  const anon = await wsTalk({ origin: BASE }, [{ type: "CHAT_MESSAGE", payload: { text: "hi" } }, { type: "ROOM_BOMBER_TRIGGER", payload: {} }, { type: "AUTH_JOIN", payload: { roomId: "dronacharya-gr10-phy" } }]);
  check("socket: messages before sign-in are ignored; joining asks for sign-in", !types(anon).some((t) => /CHAT_BROADCAST|BOMB/.test(t)) && types(anon).includes("AUTH_REQUIRED"), types(anon).join(","));
  const denied = await wsTalk({ origin: BASE, cookie: outsider }, [{ type: "AUTH_JOIN", payload: { roomId: "dronacharya-gr10-phy" } }]);
  check("socket: a learner not on the class list can't join its room", types(denied).includes("ROOM_ACCESS_DENIED") && !types(denied).includes("ROOM_STATE_SYNC"), types(denied).join(","));
  const parentWs = await wsTalk({ origin: BASE, cookie: U.par }, [{ type: "AUTH_JOIN", payload: { roomId: "dronacharya-gr10-phy" } }]);
  check("socket: parents can't join a live room", types(parentWs).includes("ROOM_ACCESS_DENIED"), types(parentWs).join(","));
  const teacherWs = await wsTalk({ origin: BASE, cookie: U.t }, [{ type: "AUTH_JOIN", payload: { roomId: "dronacharya-gr10-phy" } }]);
  const sync = teacherWs.find((m) => m.type === "ROOM_STATE_SYNC");
  check("socket: the host joins and is told they host", sync?.you?.isHost === true, JSON.stringify(sync?.you));
  check("socket: no pitch-room (parent contact) data for teachers", Array.isArray(sync?.pitchRooms) && sync.pitchRooms.length === 0);

  // Media tokens: the class list and parent rule apply
  const outJoin = await mediaCall(outsider, "join", { roomSlug: "dronacharya-gr10-phy", device: DESKTOP });
  check("media server: learner not on the class list is refused (not_enrolled)", outJoin.reason === "not_enrolled", JSON.stringify(outJoin).slice(0, 200));
  const wait = await mediaCall(U.stu, "join", { roomSlug: `smoke-adhoc-${Date.now()}`, device: DESKTOP });
  check("media server: a learner in a new room waits to be admitted", wait.ok && wait.data?.you?.waiting === true, JSON.stringify(wait).slice(0, 200));
  const sess = await call(outsider, "GET", "/api/rooms/dronacharya-gr10-phy/session");
  check("class session: not on the list says so (403 not_enrolled)", sess.status === 403 && sess.json?.reason === "not_enrolled", JSON.stringify(sess));
  const host = await call(await login("tch-iyer"), "GET", "/api/rooms/dronacharya-gr10-phy/session");
  check("class session: another teacher sees who hosts", host.json?.me?.isHost === false && Boolean(host.json?.host?.name), JSON.stringify(host.json?.host));

  // Invite links: only for learners/parents, and only for classes the caller hosts
  check("invite: nobody can mint a link for an admin", (await call(U.t, "POST", "/api/auth/invite", { userId: "admin-1", roomSlug: "dronacharya-gr10-phy" })).status === 403);
  check("invite: a teacher can't invite a learner who isn't in their class", (await call(U.t, "POST", "/api/auth/invite", { userId: "stu-08LAYLAHAS", roomSlug: "dronacharya-gr10-phy" })).status === 403);
  const inv = await call(U.t, "POST", "/api/auth/invite", { userId: "stu-10SOPHIACH", roomSlug: "dronacharya-gr10-phy" });
  check("invite: the host can invite their own learner", inv.status === 200 && /invite=/.test(inv.json?.url || ""), JSON.stringify(inv.json));
  check("invite: learners can't mint links", (await call(U.stu, "POST", "/api/auth/invite", { userId: "stu-10SOPHIACH", roomSlug: "dronacharya-gr10-phy" })).status === 403);

  // People (admin only)
  check("people: teachers can't list accounts", (await call(U.t, "GET", "/api/admin/users")).status === 403);
  check("people: admins can", Array.isArray((await call(U.adm, "GET", "/api/admin/users")).json?.users));
  check("people: an admin can't remove their own admin role", (await call(U.adm, "PATCH", "/api/admin/users/admin-1", { role: "instructor" })).status === 400);
  check("people: bad email refused", (await call(U.adm, "POST", "/api/admin/users", { name: "X Y", email: "nope", role: "student" })).status === 400);

  // Passwords: the admin adds a person with a temporary password; they choose their own at first sign-in
  const pwLogin = async (email, password) => {
    const r = await fetch(`${BASE}/api/auth/password/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    let json = null;
    try {
      json = await r.json();
    } catch {}
    return { status: r.status, json, cookie: (r.headers.get("set-cookie") || "").split(";")[0] };
  };
  const pwEmail = `smoke-${Date.now()}@test.21k.school`;
  check("passwords: teachers can't add people", (await call(U.t, "POST", "/api/admin/users", { name: "Smoke Learner", email: pwEmail, role: "student" })).status === 403);
  const added = await call(U.adm, "POST", "/api/admin/users", { name: "Smoke Learner", email: pwEmail, role: "student" });
  const temp1 = added.json?.temporaryPassword;
  const pid = added.json?.user?.id;
  check("passwords: a new person gets a temporary password", added.status === 200 && /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(temp1 || ""), JSON.stringify(added.json));
  const listed = (await call(U.adm, "GET", "/api/admin/users")).json?.users?.find((u) => u.id === pid);
  check("passwords: hashes never leave the server", listed && !("passwordHash" in listed) && listed.mustChangePassword === true && !JSON.stringify(listed).includes("scrypt"), JSON.stringify(listed));
  const wrong = await pwLogin(pwEmail, "not-the-password");
  const nobody = await pwLogin(`nobody-${Date.now()}@test.21k.school`, "whatever-password");
  check("passwords: a wrong password and an unknown email get the same answer", wrong.status === 401 && nobody.status === 401 && wrong.json?.error === nobody.json?.error && !wrong.cookie);
  const first = await pwLogin(pwEmail, temp1);
  check("passwords: the temporary password signs in and asks for a new one", first.status === 200 && first.json?.mustChangePassword === true && Boolean(first.cookie));
  check("passwords: /me says a new password is needed", (await call(first.cookie, "GET", "/api/auth/me")).json?.user?.mustChangePassword === true);
  check("passwords: signed-out can't change a password", (await call(null, "POST", "/api/auth/password/change", { current: temp1, next: "river-lamp-orbit-42" })).status === 401);
  check("passwords: the current password must be right", (await call(first.cookie, "POST", "/api/auth/password/change", { current: "nope-nope-nope", next: "river-lamp-orbit-42" })).status === 400);
  check("passwords: short or common passwords are refused", (await call(first.cookie, "POST", "/api/auth/password/change", { current: temp1, next: "password123" })).status === 400);
  check("passwords: a password with your name in it is refused", (await call(first.cookie, "POST", "/api/auth/password/change", { current: temp1, next: "smokelearner2026" })).status === 400);
  const chosen = `river-lamp-orbit-${Date.now() % 1000}`;
  const changed = await fetch(`${BASE}/api/auth/password/change`, { method: "POST", headers: { "content-type": "application/json", cookie: first.cookie }, body: JSON.stringify({ current: temp1, next: chosen }) });
  const afterCookie = (changed.headers.get("set-cookie") || "").split(";")[0];
  check("passwords: choosing a good password works", changed.status === 200 && Boolean(afterCookie));
  check("passwords: changing signs out the old session", (await call(first.cookie, "GET", "/api/auth/me")).status === 401);
  check("passwords: ...and keeps this device signed in", (await call(afterCookie, "GET", "/api/auth/me")).json?.user?.mustChangePassword === false);
  check("passwords: the temporary password no longer works", (await pwLogin(pwEmail, temp1)).status === 401);
  const own = await pwLogin(pwEmail, chosen);
  check("passwords: the new one does", own.status === 200 && own.json?.mustChangePassword === false);
  check("passwords: teachers can't reset passwords", (await call(U.t, "POST", `/api/admin/users/${pid}/password`)).status === 403);
  const reset = await call(U.adm, "POST", `/api/admin/users/${pid}/password`);
  check("passwords: an admin reset gives a new temporary password", reset.status === 200 && reset.json?.temporaryPassword && reset.json.temporaryPassword !== temp1);
  check("passwords: a reset signs the person out everywhere", (await call(own.cookie, "GET", "/api/auth/me")).status === 401 && (await call(afterCookie, "GET", "/api/auth/me")).status === 401);
  check("passwords: after a reset, the new temporary password asks for a new one", (await pwLogin(pwEmail, reset.json?.temporaryPassword)).json?.mustChangePassword === true);
  await call(U.adm, "PATCH", `/api/admin/users/${pid}`, { disabled: true });
  check("passwords: disabled accounts can't sign in", (await pwLogin(pwEmail, reset.json?.temporaryPassword)).status === 401);
  const providers = (await call(null, "GET", "/api/auth/providers")).json;
  check("sign-in: passwords on, no outside sign-in providers", providers?.password === true && !("google" in providers), JSON.stringify(providers));
  check("sign-in: no Google route", (await call(null, "GET", "/api/auth/google/start")).status === 404);

  // Campus feed: the author is the signed-in person; announcements are staff-only; moderation
  const spoof = await call(U.stu, "POST", "/api/social/posts", { body: `Smoke test question ${Date.now()}`, category: "question", authorId: "admin-1", authorName: "Director" });
  const feed = await call(U.stu, "GET", "/api/social/posts");
  const mine = feed.json?.posts?.find((p) => p.id === spoof.json?.id);
  check("feed: the author can't be faked", mine?.author?.id === "stu-10SOPHIACH", JSON.stringify(mine?.author));
  check("feed: learners can't post announcements", (await call(U.stu, "POST", "/api/social/posts", { body: "School closed!", category: "announcement" })).status === 403);
  check("feed: contact details are refused", (await call(U.stu, "POST", "/api/social/posts", { body: "call me on +91 98765 43210", category: "question" })).status === 400);
  check("feed: parents and auditors can't use it", (await call(U.par, "GET", "/api/social/posts")).status === 403 && (await call(U.aud, "GET", "/api/social/posts")).status === 403);
  const like1 = await call(U.t, "POST", `/api/social/posts/${spoof.json?.id}/like`);
  const like2 = await call(U.t, "POST", `/api/social/posts/${spoof.json?.id}/like`);
  check("feed: one like per person (liking again un-likes)", like1.json?.likedByMe === true && like2.json?.likedByMe === false && like2.json?.likes === like1.json?.likes - 1);
  check("feed: someone else can't delete a learner's post", (await call(outsider, "DELETE", `/api/social/posts/${spoof.json?.id}`)).status === 403);
  check("feed: the author can delete their post", (await call(U.stu, "DELETE", `/api/social/posts/${spoof.json?.id}`)).status === 200);

  // AI helpers: signed-in, size-capped, validated, never a pretend answer
  check("ai translate: signed-out is 401", (await call(null, "POST", "/api/ai/live-translate-stream", { text: "hello", targetLanguage: "hi" })).status === 401);
  check("ai translate: too long is refused", (await call(U.stu, "POST", "/api/ai/live-translate-stream", { text: "a".repeat(1001), targetLanguage: "hi" })).status === 413);
  check("ai translate: bad language refused", (await call(U.stu, "POST", "/api/ai/live-translate-stream", { text: "hello", targetLanguage: "<script>" })).status === 400);
  const tr = await call(U.stu, "POST", "/api/ai/live-translate-stream", { text: "Good morning class", targetLanguage: "es" });
  check("ai translate: a real translation or an honest 503", (tr.status === 200 && tr.json?.translatedText && !/^\[|Traducción|Traducido/.test(tr.json.translatedText)) || (tr.status === 503 && tr.json?.unavailable), JSON.stringify(tr));
  check("removed AI endpoints are gone", (await call(U.stu, "POST", "/api/ai/notebook-chat", { message: "x" })).status === 404);

  // Platform basics
  const health = await call(null, "GET", "/api/health");
  check("health: JSON with database status", health.status === 200 && health.json?.database === "ok", JSON.stringify(health.json));
  const unknown = await call(U.t, "GET", "/api/definitely-not-a-route");
  check("unknown API paths are JSON 404s (not the web page)", unknown.status === 404 && unknown.json?.error, JSON.stringify(unknown));
  const r = await fetch(`${BASE}/`);
  check("security headers are set", r.headers.get("x-content-type-options") === "nosniff" && r.headers.get("referrer-policy") === "no-referrer" && r.headers.get("x-frame-options") === "DENY");
  check("ICE servers: signed-in only, no public relay credentials", (await call(null, "GET", "/api/media/ice")).status === 401 && !JSON.stringify((await call(U.stu, "GET", "/api/media/ice")).json).includes("openrelay"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
