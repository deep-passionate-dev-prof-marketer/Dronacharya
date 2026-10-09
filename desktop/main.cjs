/**
 * 21K School Classroom: desktop shell that blocks screen recording and screenshots of the class.
 *
 * - setContentProtection(true):
 *     Windows → SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE): screenshots, Snipping Tool, OBS,
 *               Teams/Zoom screen share all see a black/absent window.
 *     macOS   → NSWindow.sharingType = none: screenshots and capture tools get a blank window.
 * - Every request to the school server carries a signed attestation so classes can require the app.
 * - Devtools, view-source, printing and new windows are disabled in packaged builds.
 */
const { app, BrowserWindow, session, shell, desktopCapturer, systemPreferences, Menu } = require("electron");
const crypto = require("crypto");

const APP_URL = process.env.DRONACHARYA_URL || "http://localhost:3000";
// Shared with the server (DESKTOP_APP_KEY). Bundled at build time; rotate with each release.
const ATTEST_KEY = process.env.DRONACHARYA_APP_KEY || "dev-desktop-app-key-change-me";
const SELF_TEST = process.env.DRONACHARYA_SELF_TEST === "1";
const isDev = !app.isPackaged;

if (!app.requestSingleInstanceLock()) app.quit();

function attestation() {
  const ts = String(Date.now());
  return `${ts}.${crypto.createHmac("sha256", ATTEST_KEY).update(ts).digest("hex")}`;
}

function createWindow({ protect = true, url = APP_URL, title = "21K School Classroom", x, y } = {}) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    x,
    y,
    minWidth: 960,
    minHeight: 640,
    title,
    backgroundColor: "#070b14",
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      devTools: isDev,
      spellcheck: false,
      preload: require("path").join(__dirname, "preload.cjs"),
    },
  });
  win.setContentProtection(protect);
  win.once("ready-to-show", () => win.show());

  // Block devtools / reload-to-bypass / print shortcuts in packaged builds
  win.webContents.on("before-input-event", (event, input) => {
    if (isDev) return;
    const k = String(input.key || "").toLowerCase();
    const mod = input.control || input.meta;
    if (k === "f12" || (mod && input.shift && ["i", "j", "c"].includes(k)) || (mod && input.alt && k === "i") || (mod && ["p", "s", "u"].includes(k))) {
      event.preventDefault();
    }
  });
  win.webContents.on("devtools-opened", () => {
    if (!isDev) win.webContents.closeDevTools();
  });
  // Links to other sites open in the normal browser; no extra app windows
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/.test(target)) shell.openExternal(target);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, target) => {
    if (!target.startsWith(APP_URL) && !target.startsWith("https://accounts.google.com")) {
      e.preventDefault();
      shell.openExternal(target);
    }
  });

  win.loadURL(url);
  return win;
}

function hardenSession() {
  const s = session.defaultSession;
  s.setUserAgent(`${s.getUserAgent()} Dronacharya-Desktop/${app.getVersion()}`);
  s.webRequest.onBeforeSendHeaders({ urls: [`${APP_URL}/*`] }, (details, cb) => {
    details.requestHeaders["X-Dronacharya-Client"] = `desktop/${app.getVersion()}/${process.platform}`;
    details.requestHeaders["X-Dronacharya-Attest"] = attestation();
    cb({ requestHeaders: details.requestHeaders });
  });
  // Camera/mic for class; screen sharing goes through the OS picker
  s.setPermissionRequestHandler((_wc, permission, cb) => cb(["media", "display-capture", "fullscreen", "clipboard-sanitized-write"].includes(permission)));
  s.setDisplayMediaRequestHandler((_req, cb) => {
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => cb({ video: sources[0] }));
  }, { useSystemPicker: true });
}

/** Mean brightness 0..255 of a capture thumbnail (black ≈ 0). */
function brightness(image) {
  const bmp = image.toBitmap();
  if (!bmp.length) return -1;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < bmp.length; i += 4 * 97) {
    sum += (bmp[i] + bmp[i + 1] + bmp[i + 2]) / 3;
    n++;
  }
  return Math.round(sum / n);
}

/**
 * Self-test: opens a protected window and an unprotected control window with the same bright page,
 * captures both through the OS capture API (the one screen recorders use) and compares.
 */
async function runSelfTest() {
  const page = "data:text/html," + encodeURIComponent("<body style='margin:0;background:#fff;font:bold 60px sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>CAPTURE TEST</body>");
  const protectedWin = createWindow({ protect: true, url: page, title: "DR-TEST-PROTECTED", x: 40, y: 40 });
  const controlWin = createWindow({ protect: false, url: page, title: "DR-TEST-CONTROL", x: 700, y: 120 });
  await new Promise((r) => setTimeout(r, 2500));
  const permission = process.platform === "darwin" ? systemPreferences.getMediaAccessStatus("screen") : "n/a";
  console.log("DRONACHARYA_SELF_TEST_PERMISSION " + permission);
  // Without Screen Recording permission macOS would show a prompt and capture nothing useful
  const sources =
    process.platform === "darwin" && permission !== "granted"
      ? { error: "Screen Recording permission not granted to the test runner" }
      : await desktopCapturer.getSources({ types: ["window"], thumbnailSize: { width: 640, height: 400 } }).catch((e) => ({ error: String(e) }));
  const pick = (title) => (Array.isArray(sources) ? sources.find((s) => s.name === title) : null);
  const p = pick("DR-TEST-PROTECTED");
  const c = pick("DR-TEST-CONTROL");
  const result = {
    platform: `${process.platform} ${process.getSystemVersion?.() || ""}`,
    electron: process.versions.electron,
    screenRecordingPermission: permission,
    protectedListed: Boolean(p),
    controlListed: Boolean(c),
    protectedBrightness: p ? brightness(p.thumbnail) : null,
    controlBrightness: c ? brightness(c.thumbnail) : null,
    error: sources && sources.error,
  };
  console.log("DRONACHARYA_SELF_TEST_CONTENT_PROTECTED " + protectedWin.isContentProtected?.());
  result.verdict =
    result.controlBrightness > 150 && (result.protectedBrightness === null || result.protectedBrightness < 40)
      ? "PROTECTED: capture of the protected window is blank while the control is visible"
      : result.controlBrightness > 150
      ? "NOT PROTECTED on this OS version: the protected window was captured"
      : "INCONCLUSIVE: the control window couldn't be captured either (grant Screen Recording permission)";
  console.log("DRONACHARYA_SELF_TEST " + JSON.stringify(result));
  protectedWin.destroy();
  controlWin.destroy();
  app.quit();
}

app.whenReady().then(() => {
  if (!isDev) Menu.setApplicationMenu(null);
  hardenSession();
  if (SELF_TEST) return runSelfTest();
  createWindow();
});

app.on("second-instance", () => {
  const [win] = BrowserWindow.getAllWindows();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.on("window-all-closed", () => app.quit());
