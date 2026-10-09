import crypto from "crypto";
/**
 * Device Access Control: room device policies, exception requests and the audit trail.
 *
 * Storage: Postgres. Every evaluation, block, request and decision is appended to audit_events
 * (stream "device_access"); rules, room policies and requests are written through to kv_store.
 */
import express from "express";
import { auditInsert, auditLoad, kvLoad, kvUpsert, persist } from "./db/kv";
import { requireAuth } from "./auth/session";
import {
  ALL_DEVICE_TYPES,
  ApproverRole,
  DEFAULT_DEVICE_POLICY_RULES,
  DevicePolicyRule,
  PolicyDeviceType,
  ResolvedDevicePolicy,
  RoomPolicyContext,
  SessionType,
  classifyUserAgent,
  inferContextFromSlug,
  isDeviceAllowed,
  reconcileDeviceType,
  resolvePolicyFromRules,
} from "../services/devicePolicyEngine";
import type {
  AccessActor,
  ApprovalScope,
  DeviceAccessEvent,
  DeviceAccessEventType,
  DeviceAccessRequest,
  DeviceSnapshot,
  EvaluateResponse,
  RoomDevicePolicy,
} from "../types/deviceAccess";

type BroadcastFn = (message: any, filterFn?: (client: { role: string; roomId: string; userId: string }) => boolean) => void;


const PENDING_TTL_MS = 30 * 60 * 1000;
const SCOPE_TTL_MS: Record<ApprovalScope, number> = {
  this_session: 12 * 60 * 60 * 1000,
  this_device: 180 * 24 * 60 * 60 * 1000,
};
const SESSION_TYPES: SessionType[] = ["demo", "paid", "trial", "free", "internal"];
const STAFF_ROLES = ["instructor", "admin", "sales_rep", "auditor", "ta"];

/** Rooms nobody registered are treated as regular enrolled (paid) classes. */
const DEFAULT_SESSION_TYPE: SessionType = "paid";

interface PersistedState {
  rules: DevicePolicyRule[];
  policies: RoomDevicePolicy[];
  requests: DeviceAccessRequest[];
}

const state: {
  rules: DevicePolicyRule[];
  policies: Map<string, RoomDevicePolicy>;
  requests: Map<string, DeviceAccessRequest>;
  events: DeviceAccessEvent[];
} = {
  rules: DEFAULT_DEVICE_POLICY_RULES.map((r) => ({ ...r })),
  policies: new Map(),
  requests: new Map(),
  events: [],
};

const persistenceAvailable = true;

/** Loads rules, room policies, requests and recent audit events from Postgres. */
async function loadFromDb() {
  const [rules, policies, requests, events] = await Promise.all([
    kvLoad<DevicePolicyRule>("device_rules"),
    kvLoad<RoomDevicePolicy>("device_policies"),
    kvLoad<DeviceAccessRequest>("device_requests"),
    auditLoad<DeviceAccessEvent>("device_access"),
  ]);
  if (rules.length) {
    const savedIds = new Set(rules.map((r) => r.key));
    // Keep new default rules that did not exist when the rules were saved
    state.rules = [...rules.map((r) => r.value), ...DEFAULT_DEVICE_POLICY_RULES.filter((r) => !savedIds.has(r.id))];
  }
  policies.forEach((p) => state.policies.set(p.key, p.value));
  requests.forEach((r) => state.requests.set(r.key, r.value));
  state.events.push(...events);
}

/** Write-through: persist the current rules/policies/requests (small, so a full upsert is fine). */
function saveState() {
  persist(
    "device_access save",
    Promise.all([
      kvUpsert("device_rules", state.rules.map((r) => ({ key: r.id, value: r }))),
      kvUpsert("device_policies", Array.from(state.policies.values()).map((p) => ({ key: p.roomSlug, value: p }))),
      kvUpsert("device_requests", Array.from(state.requests.values()).map((r) => ({ key: r.id, value: r }))),
    ])
  );
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function recordEvent(e: Omit<DeviceAccessEvent, "id" | "at">): DeviceAccessEvent {
  const event: DeviceAccessEvent = { id: newId("dae"), at: new Date().toISOString(), ...e };
  state.events.push(event);
  if (state.events.length > 20000) state.events.splice(0, state.events.length - 20000);
  persist(
    "device_access event",
    auditInsert("device_access", { id: event.id, at: event.at, type: event.type, roomSlug: event.roomSlug, userId: event.actor?.id, data: event })
  );
  return event;
}

/** The signed-in user as an audit actor. Identity always comes from the session cookie, never the body. */
export function actorFromSession(req: express.Request): AccessActor {
  const u = req.user!;
  return { id: u.id, name: u.name, role: u.role, studentCode: u.studentCode || undefined, email: u.email };
}

const studentKey = (s: AccessActor) => (s.studentCode || s.email || s.id || "").toLowerCase();

function sanitizeActor(raw: any): AccessActor {
  return {
    id: String(raw?.id || "anonymous").slice(0, 120),
    name: String(raw?.name || "Unknown").slice(0, 120),
    role: String(raw?.role || "student").slice(0, 40),
    studentCode: raw?.studentCode ? String(raw.studentCode).slice(0, 40) : undefined,
    email: raw?.email ? String(raw.email).slice(0, 160) : undefined,
  };
}

function clientIp(req: express.Request): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0];
  return (first || req.socket.remoteAddress || "unknown").trim();
}

/** Enriches the client-reported snapshot with what the server can see for itself. */
function enrichDevice(req: express.Request, raw: any): DeviceSnapshot {
  const claimed: PolicyDeviceType = ALL_DEVICE_TYPES.includes(raw?.deviceType) ? raw.deviceType : "phone";
  const ua = String(req.headers["user-agent"] || raw?.userAgent || "");
  const serverSeen = classifyUserAgent(ua, req.headers["sec-ch-ua-mobile"] as string | undefined);
  const { effective, integrity } = reconcileDeviceType(claimed, serverSeen);
  const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const str = (v: any, max = 200) => String(v ?? "").slice(0, max);
  return {
    deviceId: str(raw?.deviceId, 80) || "unknown",
    fingerprint: str(raw?.fingerprint, 80),
    deviceType: claimed,
    deviceModel: str(raw?.deviceModel),
    osName: str(raw?.osName),
    browserName: str(raw?.browserName),
    browserVersion: str(raw?.browserVersion, 40),
    userAgent: ua.slice(0, 400),
    platform: raw?.platform ? str(raw.platform, 60) : undefined,
    uaDataMobile: typeof raw?.uaDataMobile === "boolean" ? raw.uaDataMobile : undefined,
    screenWidth: num(raw?.screenWidth),
    screenHeight: num(raw?.screenHeight),
    viewportWidth: num(raw?.viewportWidth),
    viewportHeight: num(raw?.viewportHeight),
    pixelRatio: num(raw?.pixelRatio, 1),
    aspectRatio: str(raw?.aspectRatio, 12),
    orientation: raw?.orientation === "portrait" ? "portrait" : "landscape",
    touchSupported: Boolean(raw?.touchSupported),
    maxTouchPoints: num(raw?.maxTouchPoints),
    pointer: ["fine", "coarse", "none"].includes(raw?.pointer) ? raw.pointer : "fine",
    hardwareConcurrency: num(raw?.hardwareConcurrency),
    deviceMemoryGb: raw?.deviceMemoryGb != null ? num(raw.deviceMemoryGb) : undefined,
    networkType: raw?.networkType ? str(raw.networkType, 40) : undefined,
    timezone: str(raw?.timezone, 60),
    language: str(raw?.language, 20),
    ipAddress: clientIp(req),
    serverClassifiedType: serverSeen,
    integrity,
    effectiveDeviceType: effective,
  };
}

export function getRoomPolicy(roomSlug: string): RoomDevicePolicy {
  const existing = state.policies.get(roomSlug);
  if (existing) {
    if (existing.mode === "manual") return existing;
    // Auto policies follow rule edits made after the room was registered
    return { ...existing, ...resolvePolicyFromRules(existing.context, state.rules), mode: "auto" };
  }
  const context: RoomPolicyContext = { sessionType: DEFAULT_SESSION_TYPE, ...inferContextFromSlug(roomSlug) };
  const now = new Date().toISOString();
  return { roomSlug, context, ...resolvePolicyFromRules(context, state.rules), createdAt: now, updatedAt: now };
}

export interface UpsertPolicyInput {
  roomSlug: string;
  context?: RoomPolicyContext;
  mode?: "auto" | "manual";
  allowedDeviceTypes?: PolicyDeviceType[];
  allowRequestOverride?: boolean;
  approverRoles?: ApproverRole[];
  linkShortCode?: string;
  actor?: AccessActor;
  eventType?: DeviceAccessEventType;
}

/** Registers (or updates) the device policy for a room. Called on link generation and demo scheduling. */
export function upsertRoomPolicy(input: UpsertPolicyInput): RoomDevicePolicy {
  const prev = state.policies.get(input.roomSlug);
  const context: RoomPolicyContext = {
    ...inferContextFromSlug(input.roomSlug),
    ...(prev?.context || {}),
    ...(input.context || {}),
  };
  if (context.sessionType && !SESSION_TYPES.includes(context.sessionType)) delete context.sessionType;
  if (!context.sessionType) context.sessionType = DEFAULT_SESSION_TYPE;

  const auto = resolvePolicyFromRules(context, state.rules);
  const mode = input.mode === "manual" ? "manual" : "auto";
  const allowed = (input.allowedDeviceTypes || []).filter((t) => ALL_DEVICE_TYPES.includes(t));
  const resolved: ResolvedDevicePolicy =
    mode === "manual" && allowed.length
      ? {
          mode: "manual",
          allowedDeviceTypes: allowed,
          allowRequestOverride: input.allowRequestOverride ?? true,
          approverRoles: input.approverRoles?.length ? input.approverRoles : auto.approverRoles,
          matchedRuleId: null,
          matchedRuleName: "Manual override",
          reason: `Set manually by ${input.actor?.name || "staff"} for this room.`,
        }
      : auto;

  const now = new Date().toISOString();
  const policy: RoomDevicePolicy = {
    roomSlug: input.roomSlug,
    context,
    ...resolved,
    linkShortCode: input.linkShortCode || prev?.linkShortCode,
    createdBy: prev?.createdBy || input.actor,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };
  state.policies.set(input.roomSlug, policy);
  saveState();
  recordEvent({
    type: input.eventType || "policy_set",
    roomSlug: input.roomSlug,
    actor: input.actor,
    policy: pickPolicy(policy),
    details: `${policy.mode === "manual" ? "Manual" : `Auto (${policy.matchedRuleName})`}: ${policy.allowedDeviceTypes.join(", ")}; session=${context.sessionType}${context.courseCode ? `; course=${context.courseCode}` : ""}${input.linkShortCode ? `; link=${input.linkShortCode}` : ""}`,
  });
  return policy;
}

const pickPolicy = (p: ResolvedDevicePolicy) => ({
  allowedDeviceTypes: p.allowedDeviceTypes,
  matchedRuleId: p.matchedRuleId,
  matchedRuleName: p.matchedRuleName,
  mode: p.mode,
});

function expireStaleRequests() {
  const now = Date.now();
  for (const r of state.requests.values()) {
    if (r.status === "pending" && now - Date.parse(r.requestedAt) > PENDING_TTL_MS) {
      r.status = "expired";
      r.decidedAt = new Date().toISOString();
      recordEvent({ type: "request_expired", roomSlug: r.roomSlug, subject: r.student, requestId: r.id, device: r.device });
      saveState();
    }
  }
}

function findActiveApproval(roomSlug: string, student: AccessActor, deviceId: string): DeviceAccessRequest | undefined {
  const key = studentKey(student);
  const now = Date.now();
  return Array.from(state.requests.values()).find(
    (r) =>
      r.status === "approved" &&
      r.roomSlug === roomSlug &&
      studentKey(r.student) === key &&
      r.device.deviceId === deviceId &&
      (!r.expiresAt || Date.parse(r.expiresAt) > now)
  );
}

function findOpenRequest(roomSlug: string, student: AccessActor, deviceId: string) {
  const key = studentKey(student);
  return Array.from(state.requests.values()).find(
    (r) => r.status === "pending" && r.roomSlug === roomSlug && studentKey(r.student) === key && r.device.deviceId === deviceId
  );
}

function toCsvValue(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Decides whether this user/device may join the room and records the outcome in the audit log.
 * Used by the evaluate endpoint and by the LiveKit token endpoint, so a blocked device never
 * receives media credentials.
 */
/**
 * True when the request comes from the Dronacharya desktop app. The app signs a timestamp with
 * DESKTOP_APP_KEY (shipped inside the app). This is a strong deterrent, not a cryptographic
 * guarantee: a determined person could extract the key from the binary.
 */
export function isDesktopClient(req: express.Request): boolean {
  const key = process.env.DESKTOP_APP_KEY;
  const header = String(req.headers["x-dronacharya-attest"] || "");
  if (!key || !header) return false;
  const [ts, sig] = header.split(".");
  const age = Math.abs(Date.now() - Number(ts));
  if (!ts || !sig || !(age < 5 * 60_000)) return false;
  const want = crypto.createHmac("sha256", key).update(ts).digest("hex");
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

export function evaluateJoinRequest(req: express.Request, roomSlug: string, student: AccessActor, rawDevice: any): EvaluateResponse {
  const device = enrichDevice(req, rawDevice);
  const policy = getRoomPolicy(roomSlug);
  const effective = device.effectiveDeviceType || device.deviceType;

  let decision: EvaluateResponse["decision"];
  let activeRequest: DeviceAccessRequest | undefined;
  let blockReason: EvaluateResponse["blockReason"];
  if (!STAFF_ROLES.includes(student.role) && policy.requireDesktopApp && !isDesktopClient(req)) {
    // No exceptions: the point of this rule is that only the capture-blocking app can show the class
    decision = "block";
    blockReason = "desktop_app_required";
  } else if (!STAFF_ROLES.includes(student.role) && !isDeviceAllowed(policy, effective)) {
    blockReason = "device_type";
    const approval = findActiveApproval(roomSlug, student, device.deviceId);
    decision = approval ? "approved_override" : "block";
    activeRequest = approval || findOpenRequest(roomSlug, student, device.deviceId);
  } else {
    decision = "allow";
  }

  recordEvent({
    type: decision === "allow" ? "join_allowed" : decision === "approved_override" ? "join_allowed_by_approval" : "join_blocked",
    roomSlug,
    actor: student,
    device,
    policy: pickPolicy(policy),
    decision,
    requestId: activeRequest?.id,
    details:
      device.integrity === "mismatch"
        ? `Device claim mismatch: browser reported ${device.deviceType}, server saw ${device.serverClassifiedType}. Enforced as ${effective}.`
        : undefined,
  });

  return { decision, blockReason, policy, effectiveDeviceType: effective, integrity: device.integrity, activeRequest, enforcement: "server" };
}

export function setupDeviceAccessRoutes(app: express.Express, broadcast: BroadcastFn) {
  // Requests wait until the store is loaded from Postgres (first ~ms after boot)
  const ready = loadFromDb().catch((err) => console.error("[DeviceAccess] load failed:", err));
  app.use(["/api/device-access", "/api/device-policy", "/api/livekit/token", "/api/links"], (_req, _res, next) => {
    ready.then(() => next());
  });
  setInterval(expireStaleRequests, 60 * 1000).unref?.();

  const notifyApprovers = (request: DeviceAccessRequest, type: string) => {
    const roles = request.policySnapshot.approverRoles as string[];
    broadcast({ type, request }, (c) => c.role === "admin" || (roles.includes(c.role) && c.roomId === request.roomSlug));
  };

  // ---------- Rules (auto workflow) ----------
  app.get("/api/device-policy/rules", requireAuth(), (_req, res) => {
    res.json({ rules: [...state.rules].sort((a, b) => a.priority - b.priority) });
  });

  app.put("/api/device-policy/rules/:id", requireAuth("admin"), (req, res) => {
    const actor = actorFromSession(req);
    const rule = state.rules.find((r) => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: "Rule not found" });
    const { enabled, allowedDeviceTypes, allowRequestOverride, approverRoles, priority, requireDesktopApp } = req.body || {};
    const before = JSON.stringify(rule);
    if (typeof enabled === "boolean") rule.enabled = enabled;
    if (Array.isArray(allowedDeviceTypes)) {
      const valid = allowedDeviceTypes.filter((t: any) => ALL_DEVICE_TYPES.includes(t));
      if (valid.length) rule.allowedDeviceTypes = valid;
    }
    if (typeof allowRequestOverride === "boolean") rule.allowRequestOverride = allowRequestOverride;
    if (typeof requireDesktopApp === "boolean") rule.requireDesktopApp = requireDesktopApp;
    if (Array.isArray(approverRoles) && approverRoles.length) rule.approverRoles = approverRoles;
    if (Number.isFinite(priority)) rule.priority = priority;
    saveState();
    recordEvent({ type: "rule_updated", actor, details: `Rule ${rule.id} changed. Before: ${before} After: ${JSON.stringify(rule)}` });
    res.json({ success: true, rule });
  });

  // ---------- Room policies ----------
  app.get("/api/device-policy/rooms", requireAuth("admin", "instructor", "sales_rep", "auditor"), (_req, res) => {
    res.json({ policies: Array.from(state.policies.keys()).map(getRoomPolicy) });
  });

  app.get("/api/device-policy/rooms/:slug", requireAuth(), (req, res) => {
    res.json({ policy: getRoomPolicy(req.params.slug) });
  });

  app.post("/api/device-policy/rooms", requireAuth("admin", "instructor", "sales_rep"), (req, res) => {
    const { roomSlug, context, mode, allowedDeviceTypes, allowRequestOverride, approverRoles, linkShortCode } = req.body || {};
    const actor = actorFromSession(req);
    if (!roomSlug) return res.status(400).json({ error: "roomSlug is required" });
    const policy = upsertRoomPolicy({ roomSlug: String(roomSlug), context, mode, allowedDeviceTypes, allowRequestOverride, approverRoles, linkShortCode, actor });
    res.json({ success: true, policy });
  });

  // ---------- Join evaluation ----------
  app.post("/api/device-access/evaluate", requireAuth(), (req, res) => {
    const roomSlug = String(req.body?.roomSlug || "");
    if (!roomSlug) return res.status(400).json({ error: "roomSlug is required" });
    res.json(evaluateJoinRequest(req, roomSlug, actorFromSession(req), req.body?.device));
  });

  // ---------- Exception requests ----------
  app.post("/api/device-access/requests", requireAuth(), (req, res) => {
    const roomSlug = String(req.body?.roomSlug || "");
    if (!roomSlug) return res.status(400).json({ error: "roomSlug is required" });
    const student = actorFromSession(req);
    const device = enrichDevice(req, req.body?.device);
    const policy = getRoomPolicy(roomSlug);
    if (!policy.allowRequestOverride) {
      return res.status(409).json({ error: "This class does not accept device exception requests." });
    }
    const existing = findOpenRequest(roomSlug, student, device.deviceId);
    if (existing) return res.json({ success: true, request: existing, deduplicated: true });

    const request: DeviceAccessRequest = {
      id: newId("dar"),
      roomSlug,
      student,
      device,
      studentMessage: String(req.body?.message || "").slice(0, 500),
      policySnapshot: { ...policy },
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    state.requests.set(request.id, request);
    saveState();
    recordEvent({ type: "request_created", roomSlug, actor: student, requestId: request.id, device, policy: pickPolicy(policy), details: request.studentMessage || undefined });
    notifyApprovers(request, "DEVICE_ACCESS_REQUEST_CREATED");
    res.json({ success: true, request });
  });

  app.get("/api/device-access/requests", requireAuth("admin", "instructor", "sales_rep", "auditor"), (req, res) => {
    expireStaleRequests();
    const { status, roomSlug } = req.query as Record<string, string | undefined>;
    const list = Array.from(state.requests.values())
      .filter((r) => (!status || r.status === status) && (!roomSlug || r.roomSlug === roomSlug))
      .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
    res.json({ requests: list });
  });

  app.get("/api/device-access/requests/:id", requireAuth(), (req, res) => {
    expireStaleRequests();
    const r = state.requests.get(req.params.id);
    if (!r) return res.status(404).json({ error: "Request not found" });
    // Learners may only read their own requests
    if (req.user!.role === "student" && studentKey(r.student) !== studentKey(actorFromSession(req))) return res.status(404).json({ error: "Request not found" });
    res.json({ request: r });
  });

  app.post("/api/device-access/requests/:id/decision", requireAuth("admin", "instructor", "sales_rep", "auditor"), (req, res) => {
    const r = state.requests.get(req.params.id);
    if (!r) return res.status(404).json({ error: "Request not found" });
    if (r.status !== "pending") return res.status(409).json({ error: `Request already ${r.status}.`, request: r });
    const actor = actorFromSession(req);
    const allowedRoles = r.policySnapshot.approverRoles as string[];
    if (actor.role !== "admin" && !allowedRoles.includes(actor.role)) {
      return res.status(403).json({ error: `Only ${allowedRoles.join(", ")} can decide this request.` });
    }
    const decision = req.body?.decision === "approve" ? "approve" : "deny";
    const scope: ApprovalScope = req.body?.scope === "this_device" ? "this_device" : "this_session";
    r.status = decision === "approve" ? "approved" : "denied";
    r.decidedAt = new Date().toISOString();
    r.decidedBy = actor;
    r.decisionNote = String(req.body?.note || "").slice(0, 500) || undefined;
    if (decision === "approve") {
      r.scope = scope;
      r.expiresAt = new Date(Date.now() + SCOPE_TTL_MS[scope]).toISOString();
    }
    saveState();
    const waitedSec = Math.round((Date.parse(r.decidedAt) - Date.parse(r.requestedAt)) / 1000);
    recordEvent({
      type: decision === "approve" ? "request_approved" : "request_denied",
      roomSlug: r.roomSlug,
      actor,
      subject: r.student,
      requestId: r.id,
      device: r.device,
      details: `${decision === "approve" ? `Approved (${scope}, until ${r.expiresAt})` : "Denied"} after ${waitedSec}s.${r.decisionNote ? ` Note: ${r.decisionNote}` : ""}`,
    });
    broadcast({ type: "DEVICE_ACCESS_REQUEST_DECIDED", request: r });
    res.json({ success: true, request: r });
  });

  app.post("/api/device-access/requests/:id/cancel", requireAuth(), (req, res) => {
    const r = state.requests.get(req.params.id);
    if (!r) return res.status(404).json({ error: "Request not found" });
    const actor = actorFromSession(req);
    if (studentKey(actor) !== studentKey(r.student)) return res.status(403).json({ error: "Only the requester can cancel." });
    if (r.status === "pending") {
      r.status = "cancelled";
      r.decidedAt = new Date().toISOString();
      saveState();
      recordEvent({ type: "request_cancelled", roomSlug: r.roomSlug, actor, requestId: r.id, device: r.device });
      broadcast({ type: "DEVICE_ACCESS_REQUEST_DECIDED", request: r });
    }
    res.json({ success: true, request: r });
  });

  // ---------- Audit & analytics ----------
  const filterEvents = (q: Record<string, string | undefined>) => {
    const since = q.since ? Date.parse(q.since) : 0;
    const until = q.until ? Date.parse(q.until) : Infinity;
    const types = q.type ? q.type.split(",") : null;
    return state.events.filter((e) => {
      const t = Date.parse(e.at);
      return (
        t >= since &&
        t <= until &&
        (!types || types.includes(e.type)) &&
        (!q.roomSlug || e.roomSlug === q.roomSlug) &&
        (!q.student || [e.actor, e.subject].some((a) => a && studentKey(a).includes(q.student!.toLowerCase())))
      );
    });
  };

  app.get("/api/device-access/events", requireAuth("admin", "auditor", "instructor"), (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const limit = Math.min(parseInt(q.limit || "500", 10) || 500, 5000);
    const list = filterEvents(q).slice(-limit).reverse();
    res.json({ events: list, total: list.length, persisted: persistenceAvailable });
  });

  app.get("/api/device-access/events.csv", requireAuth("admin", "auditor", "instructor"), (req, res) => {
    const rows = filterEvents(req.query as Record<string, string | undefined>).reverse();
    const header = [
      "timestamp", "event", "room", "actor_name", "actor_role", "actor_id", "subject_name", "request_id", "decision",
      "device_type_claimed", "device_type_server", "device_type_effective", "integrity", "device_model", "os", "browser",
      "screen", "viewport", "aspect_ratio", "orientation", "touch_points", "pointer", "ip", "timezone", "language",
      "device_id", "fingerprint", "policy_rule", "allowed_devices", "details",
    ];
    const lines = rows.map((e) =>
      [
        e.at, e.type, e.roomSlug, e.actor?.name, e.actor?.role, e.actor?.studentCode || e.actor?.id, e.subject?.name, e.requestId, e.decision,
        e.device?.deviceType, e.device?.serverClassifiedType, e.device?.effectiveDeviceType, e.device?.integrity, e.device?.deviceModel,
        e.device?.osName, e.device ? `${e.device.browserName} ${e.device.browserVersion}` : "",
        e.device ? `${e.device.screenWidth}x${e.device.screenHeight}@${e.device.pixelRatio}x` : "",
        e.device ? `${e.device.viewportWidth}x${e.device.viewportHeight}` : "",
        e.device?.aspectRatio, e.device?.orientation, e.device?.maxTouchPoints, e.device?.pointer, e.device?.ipAddress,
        e.device?.timezone, e.device?.language, e.device?.deviceId, e.device?.fingerprint, e.policy?.matchedRuleName,
        e.policy?.allowedDeviceTypes?.join("|"), e.details,
      ].map(toCsvValue).join(",")
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="device-access-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([header.join(","), ...lines].join("\n"));
  });

  app.get("/api/device-access/analytics", requireAuth("admin", "auditor", "instructor"), (req, res) => {
    const events = filterEvents(req.query as Record<string, string | undefined>);
    const joins = events.filter((e) => e.type === "join_allowed" || e.type === "join_blocked" || e.type === "join_allowed_by_approval");
    const byDevice: Record<string, { allowed: number; blocked: number; approved: number }> = {};
    const byRoom: Record<string, { blocked: number; requests: number; approved: number; denied: number }> = {};
    let mismatches = 0;
    for (const e of joins) {
      const d = e.device?.effectiveDeviceType || e.device?.deviceType || "unknown";
      byDevice[d] ||= { allowed: 0, blocked: 0, approved: 0 };
      if (e.type === "join_allowed") byDevice[d].allowed++;
      else if (e.type === "join_blocked") byDevice[d].blocked++;
      else byDevice[d].approved++;
      if (e.device?.integrity === "mismatch") mismatches++;
      if (e.type === "join_blocked" && e.roomSlug) {
        byRoom[e.roomSlug] ||= { blocked: 0, requests: 0, approved: 0, denied: 0 };
        byRoom[e.roomSlug].blocked++;
      }
    }
    const requests = Array.from(state.requests.values());
    for (const r of requests) {
      byRoom[r.roomSlug] ||= { blocked: 0, requests: 0, approved: 0, denied: 0 };
      byRoom[r.roomSlug].requests++;
      if (r.status === "approved") byRoom[r.roomSlug].approved++;
      if (r.status === "denied") byRoom[r.roomSlug].denied++;
    }
    const decided = requests.filter((r) => r.decidedAt && (r.status === "approved" || r.status === "denied"));
    const waits = decided.map((r) => (Date.parse(r.decidedAt!) - Date.parse(r.requestedAt)) / 1000).sort((a, b) => a - b);
    const byApprover: Record<string, { approved: number; denied: number }> = {};
    for (const r of decided) {
      const k = r.decidedBy?.name || "Unknown";
      byApprover[k] ||= { approved: 0, denied: 0 };
      byApprover[k][r.status === "approved" ? "approved" : "denied"]++;
    }
    res.json({
      totals: {
        joinAttempts: joins.length,
        blocked: joins.filter((e) => e.type === "join_blocked").length,
        allowedByApproval: joins.filter((e) => e.type === "join_allowed_by_approval").length,
        deviceMismatches: mismatches,
        requests: requests.length,
        pending: requests.filter((r) => r.status === "pending").length,
        approved: requests.filter((r) => r.status === "approved").length,
        denied: requests.filter((r) => r.status === "denied").length,
        medianDecisionSeconds: waits.length ? Math.round(waits[Math.floor(waits.length / 2)]) : null,
      },
      byDevice,
      byRoom,
      byApprover,
      persisted: persistenceAvailable,
      dataDir: "postgres",
    });
  });
}
