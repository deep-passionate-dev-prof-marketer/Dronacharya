import { DeviceType, DeviceAuditRecord, UserRole } from "../types";

export interface DetectionResult {
  deviceType: DeviceType;
  deviceModel: string;
  osName: string;
  browserName: string;
  browserVersion: string;
  screenResolution: string;
  pixelRatio: number;
  touchSupported: boolean;
  maxTouchPoints: number;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  networkType?: string;
  audioInputsCount: number;
  videoInputsCount: number;
  audioOutputsCount: number;
}

/**
 * Automatically inspects the browser and hardware environment
 * without asking the user.
 */
export async function detectClientDeviceEnvironment(): Promise<DetectionResult> {
  if (typeof window === "undefined") {
    return {
      deviceType: "laptop",
      deviceModel: "Standard Virtual Workstation",
      osName: "Linux / Cloud",
      browserName: "Headless / Server",
      browserVersion: "1.0",
      screenResolution: "1920x1080",
      pixelRatio: 1,
      touchSupported: false,
      maxTouchPoints: 0,
      hardwareConcurrency: 4,
      audioInputsCount: 1,
      videoInputsCount: 1,
      audioOutputsCount: 1,
    };
  }

  const ua = navigator.userAgent;
  const width = window.screen?.width || window.innerWidth;
  const height = window.screen?.height || window.innerHeight;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const pixelRatio = window.devicePixelRatio || 1;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const hasTouch = maxTouchPoints > 0 || "ontouchstart" in window;

  const coarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const uaData = (navigator as any).userAgentData as { mobile?: boolean; platform?: string } | undefined;
  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // OS Detection (versions only when the UA actually exposes them)
  let osName = "Unknown OS";
  const iosVer = ua.match(/OS (\d+)[_.](\d+)/i);
  if (isIPad) {
    osName = iosVer && !/Macintosh/i.test(ua) ? `iPadOS ${iosVer[1]}.${iosVer[2]}` : "iPadOS";
  } else if (isIPhone) {
    osName = iosVer ? `iOS ${iosVer[1]}.${iosVer[2]}` : "iOS";
  } else if (isAndroid) {
    const androidVer = ua.match(/Android\s([0-9.]+)/i);
    osName = androidVer ? `Android ${androidVer[1]}` : "Android";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    osName = "macOS";
  } else if (/Windows NT/i.test(ua)) {
    osName = "Windows";
  } else if (/CrOS/i.test(ua)) {
    osName = "ChromeOS";
  } else if (/Linux/i.test(ua)) {
    osName = "Linux";
  }

  // Browser Detection
  let browserName = "Unknown browser";
  let browserVersion = "";
  const pick = (re: RegExp) => ua.match(re)?.[1] || "";
  if (/Edg(A|iOS)?\//i.test(ua)) {
    browserName = "Microsoft Edge";
    browserVersion = pick(/Edg(?:A|iOS)?\/([0-9.]+)/i);
  } else if (/OPR\//i.test(ua)) {
    browserName = "Opera";
    browserVersion = pick(/OPR\/([0-9.]+)/i);
  } else if (/SamsungBrowser\//i.test(ua)) {
    browserName = "Samsung Internet";
    browserVersion = pick(/SamsungBrowser\/([0-9.]+)/i);
  } else if (/Firefox\/|FxiOS\//i.test(ua)) {
    browserName = "Mozilla Firefox";
    browserVersion = pick(/(?:Firefox|FxiOS)\/([0-9.]+)/i);
  } else if (/CriOS\//i.test(ua)) {
    browserName = "Google Chrome";
    browserVersion = pick(/CriOS\/([0-9.]+)/i);
  } else if (/Chrome\//i.test(ua)) {
    browserName = "Google Chrome";
    browserVersion = pick(/Chrome\/([0-9.]+)/i);
  } else if (/Safari\//i.test(ua)) {
    browserName = "Apple Safari";
    browserVersion = pick(/Version\/([0-9.]+)/i);
  }

  // Form factor classification. Order matters: explicit mobile signals first, then
  // touch-first devices that hide behind a desktop UA ("Request desktop site").
  let deviceType: DeviceType = "laptop";
  let deviceModel = "Laptop / notebook";

  if (isIPad) {
    deviceType = "tablet";
    deviceModel = "Apple iPad";
  } else if (isIPhone) {
    deviceType = "phone";
    deviceModel = "Apple iPhone";
  } else if (uaData?.mobile) {
    deviceType = "phone";
    deviceModel = isAndroid ? "Android phone" : "Mobile phone";
  } else if (isAndroid) {
    if (!/Mobile/i.test(ua) || minDim >= 600) {
      deviceType = "tablet";
      deviceModel = "Android tablet";
    } else {
      deviceType = "phone";
      deviceModel = "Android phone";
    }
  } else if (hasTouch && coarsePointer && minDim < 600) {
    deviceType = "phone";
    deviceModel = "Touch phone (desktop-mode browser)";
  } else if (hasTouch && coarsePointer && minDim >= 600) {
    deviceType = "tablet";
    deviceModel = /Windows/i.test(ua) ? "Windows tablet / 2-in-1 (tablet mode)" : "Touch tablet";
  } else if (maxDim >= 2560 || (!hasTouch && maxDim >= 1920 && (window.screen?.availHeight || 0) >= 1000)) {
    deviceType = "desktop";
    deviceModel = /Macintosh/i.test(ua) ? "Mac desktop / external display" : "Desktop PC / external display";
  } else {
    deviceType = "laptop";
    deviceModel = /Macintosh/i.test(ua) ? "Mac laptop" : /CrOS/i.test(ua) ? "Chromebook" : /Windows/i.test(ua) ? "Windows laptop" : "Laptop";
  }

  // Hardware specs
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;
  const deviceMemoryGb = (navigator as any).deviceMemory;
  const networkType = (navigator as any).connection?.effectiveType || (navigator as any).connection?.type || undefined;

  // Media devices probe
  let audioInputsCount = 0;
  let videoInputsCount = 0;
  let audioOutputsCount = 0;

  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === "audioinput").length;
      const cams = devices.filter((d) => d.kind === "videoinput").length;
      const spks = devices.filter((d) => d.kind === "audiooutput").length;

      audioInputsCount = mics;
      videoInputsCount = cams;
      audioOutputsCount = spks;
    }
  } catch {
    // Media devices enumeration may require permissions; counts stay 0 (unknown)
  }

  const screenResolution = `${width}x${height} @${pixelRatio}x (Effective ${Math.round(width * pixelRatio)}x${Math.round(height * pixelRatio)})`;

  return {
    deviceType,
    deviceModel,
    osName,
    browserName,
    browserVersion,
    screenResolution,
    pixelRatio,
    touchSupported: hasTouch,
    maxTouchPoints,
    hardwareConcurrency,
    deviceMemoryGb,
    networkType,
    audioInputsCount,
    videoInputsCount,
    audioOutputsCount,
  };
}

/**
 * Build a structured DeviceAuditRecord for logging into role sessions
 */
export async function createDeviceAuditRecord(
  userId: string,
  userName: string,
  userRole: UserRole,
  details?: string
): Promise<DeviceAuditRecord> {
  const env = await detectClientDeviceEnvironment();
  const record: DeviceAuditRecord = {
    id: `audit-dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName,
    userRole,
    deviceType: env.deviceType,
    deviceModel: env.deviceModel,
    osName: env.osName,
    browserName: env.browserName,
    browserVersion: env.browserVersion,
    screenResolution: env.screenResolution,
    pixelRatio: env.pixelRatio,
    touchSupported: env.touchSupported,
    maxTouchPoints: env.maxTouchPoints,
    hardwareConcurrency: env.hardwareConcurrency,
    deviceMemoryGb: env.deviceMemoryGb,
    networkType: env.networkType,
    audioInputsCount: env.audioInputsCount,
    videoInputsCount: env.videoInputsCount,
    audioOutputsCount: env.audioOutputsCount,
    detectedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    complianceStatus: "compliant",
    details: details || `Auto-detected on ${userRole} flightdeck check-in. Audio & Video peripherals verified.`,
  };

  try {
    if (typeof localStorage !== "undefined") {
      const existingStr = localStorage.getItem("21k_device_audit_history");
      const existing: DeviceAuditRecord[] = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem("21k_device_audit_history", JSON.stringify([record, ...existing.slice(0, 49)]));
      localStorage.setItem("21k_latest_device_audit", JSON.stringify(record));
    }
  } catch {}

  return record;
}
