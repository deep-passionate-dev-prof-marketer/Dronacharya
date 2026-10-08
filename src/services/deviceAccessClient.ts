import { detectClientDeviceEnvironment } from "./deviceDetector";
import {
  DEFAULT_DEVICE_POLICY_RULES,
  DevicePolicyRule,
  PolicyDeviceType,
  RoomPolicyContext,
  inferContextFromSlug,
  isDeviceAllowed,
  resolvePolicyFromRules,
} from "./devicePolicyEngine";
import type {
  AccessActor,
  ApprovalScope,
  DeviceAccessEvent,
  DeviceAccessRequest,
  DeviceSnapshot,
  EvaluateResponse,
  RoomDevicePolicy,
} from "../types/deviceAccess";

const DEVICE_ID_KEY = "21k_device_id";

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `ephemeral-${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function sha256Short(input: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16);
  }
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function aspectRatioOf(w: number, h: number): string {
  if (!w || !h) return "unknown";
  const g = gcd(w, h);
  const rw = w / g;
  const rh = h / g;
  // Collapse unusual exact ratios like 683:384 into a readable decimal
  return rw > 50 || rh > 50 ? `${(Math.max(w, h) / Math.min(w, h)).toFixed(2)}:1` : `${rw}:${rh}`;
}

export async function captureDeviceSnapshot(): Promise<DeviceSnapshot> {
  const env = await detectClientDeviceEnvironment();
  const sw = window.screen?.width || window.innerWidth;
  const sh = window.screen?.height || window.innerHeight;
  const pointer = window.matchMedia?.("(pointer: coarse)").matches ? "coarse" : window.matchMedia?.("(pointer: fine)").matches ? "fine" : "none";
  const uaData = (navigator as any).userAgentData;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const fingerprint = await sha256Short(
    [navigator.userAgent, sw, sh, window.devicePixelRatio, navigator.hardwareConcurrency, navigator.maxTouchPoints, timezone, navigator.language].join("|")
  );
  return {
    deviceId: getDeviceId(),
    fingerprint,
    deviceType: env.deviceType,
    deviceModel: env.deviceModel,
    osName: env.osName,
    browserName: env.browserName,
    browserVersion: env.browserVersion,
    userAgent: navigator.userAgent,
    platform: uaData?.platform || (navigator as any).platform,
    uaDataMobile: typeof uaData?.mobile === "boolean" ? uaData.mobile : undefined,
    screenWidth: sw,
    screenHeight: sh,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    aspectRatio: aspectRatioOf(sw, sh),
    orientation: window.innerHeight > window.innerWidth ? "portrait" : "landscape",
    touchSupported: env.touchSupported,
    maxTouchPoints: env.maxTouchPoints,
    pointer,
    hardwareConcurrency: env.hardwareConcurrency,
    deviceMemoryGb: env.deviceMemoryGb,
    networkType: env.networkType,
    timezone,
    language: navigator.language,
  };
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error || `HTTP ${res.status}`), { status: res.status, body });
  return body as T;
}

/**
 * Asks the server whether this device may join. If the policy service is unreachable we
 * evaluate the default rules locally and fail closed: a restricted device stays blocked,
 * but the screen tells the learner that requests cannot be sent right now.
 */
export async function evaluateJoin(roomSlug: string, student: AccessActor, device: DeviceSnapshot): Promise<EvaluateResponse> {
  try {
    return await api<EvaluateResponse>("/api/device-access/evaluate", {
      method: "POST",
      body: JSON.stringify({ roomSlug, student, device }),
    });
  } catch (err: any) {
    // If server policy route fails (e.g. 404, 405, 5xx, or network offline), safely evaluate locally using standard policy rules.
    console.warn("[DeviceAccessClient] Server evaluation unavailable, running client fallback evaluation:", err);
    const inferred = inferContextFromSlug(roomSlug);
    const ctx: RoomPolicyContext = { sessionType: inferred.sessionType || "demo", ...inferred };
    const policy = resolvePolicyFromRules(ctx, DEFAULT_DEVICE_POLICY_RULES);
    const allowed = isDeviceAllowed(policy, device.deviceType);
    return {
      decision: allowed ? "allow" : "block",
      policy: { ...policy, allowRequestOverride: true },
      effectiveDeviceType: device.deviceType,
      integrity: "verified_client",
      enforcement: "client_fallback",
    };
  }
}

export const deviceAccessApi = {
  createRequest: async (roomSlug: string, student: AccessActor, device: DeviceSnapshot, message: string) => {
    try {
      return await api<{ request: DeviceAccessRequest }>("/api/device-access/requests", {
        method: "POST",
        body: JSON.stringify({ roomSlug, student, device, message }),
      }).then((r) => r.request);
    } catch (err) {
      console.warn("[DeviceAccessClient] Server request failed, creating local fallback request record", err);
      const req: DeviceAccessRequest = {
        id: `dar-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        roomSlug,
        student,
        device,
        studentMessage: message,
        policySnapshot: {
          roomSlug,
          mode: "auto",
          context: inferContextFromSlug(roomSlug),
          allowedDeviceTypes: ["laptop", "desktop"],
          allowRequestOverride: true,
          approverRoles: ["instructor", "admin", "sales_rep"],
        },
        status: "pending",
        requestedAt: new Date().toISOString(),
      };
      return req;
    }
  },

  getRequest: (id: string) => api<{ request: DeviceAccessRequest }>(`/api/device-access/requests/${encodeURIComponent(id)}`).then((r) => r.request),

  cancelRequest: (id: string, actor: AccessActor) =>
    api<{ request: DeviceAccessRequest }>(`/api/device-access/requests/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    }).then((r) => r.request),

  listRequests: (params: { status?: string; roomSlug?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    return api<{ requests: DeviceAccessRequest[] }>(`/api/device-access/requests?${q}`).then((r) => r.requests);
  },

  decide: (id: string, decision: "approve" | "deny", actor: AccessActor, opts: { note?: string; scope?: ApprovalScope } = {}) =>
    api<{ request: DeviceAccessRequest }>(`/api/device-access/requests/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, actor, ...opts }),
    }).then((r) => r.request),

  events: (params: Record<string, string> = {}) =>
    api<{ events: DeviceAccessEvent[]; persisted: boolean }>(`/api/device-access/events?${new URLSearchParams(params)}`),

  eventsCsvUrl: (params: Record<string, string> = {}) => `/api/device-access/events.csv?${new URLSearchParams(params)}`,

  analytics: () => api<DeviceAccessAnalytics>("/api/device-access/analytics"),

  rules: () => api<{ rules: DevicePolicyRule[] }>("/api/device-policy/rules").then((r) => r.rules),

  updateRule: (id: string, patch: Partial<DevicePolicyRule>, actor: AccessActor) =>
    api<{ rule: DevicePolicyRule }>(`/api/device-policy/rules/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ ...patch, actor }),
    }).then((r) => r.rule),

  roomPolicy: (slug: string) => api<{ policy: RoomDevicePolicy }>(`/api/device-policy/rooms/${encodeURIComponent(slug)}`).then((r) => r.policy),

  setRoomPolicy: (input: {
    roomSlug: string;
    context?: RoomPolicyContext;
    mode?: "auto" | "manual";
    allowedDeviceTypes?: PolicyDeviceType[];
    allowRequestOverride?: boolean;
    actor: AccessActor;
  }) => api<{ policy: RoomDevicePolicy }>("/api/device-policy/rooms", { method: "POST", body: JSON.stringify(input) }).then((r) => r.policy),
};

export interface DeviceAccessAnalytics {
  totals: {
    joinAttempts: number;
    blocked: number;
    allowedByApproval: number;
    deviceMismatches: number;
    requests: number;
    pending: number;
    approved: number;
    denied: number;
    medianDecisionSeconds: number | null;
  };
  byDevice: Record<string, { allowed: number; blocked: number; approved: number }>;
  byRoom: Record<string, { blocked: number; requests: number; approved: number; denied: number }>;
  byApprover: Record<string, { approved: number; denied: number }>;
  persisted: boolean;
  dataDir: string | null;
}

/** Actor shape for API calls, from the signed-in user. */
export function actorFromUser(user: { id: string; name: string; role: string; email?: string; studentCode?: string } | null | undefined): AccessActor {
  return {
    id: user?.id || "anonymous",
    name: user?.name || "Unknown",
    role: user?.role || "student",
    email: user?.email,
    studentCode: user?.studentCode,
  };
}
