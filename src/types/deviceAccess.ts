import type {
  ApproverRole,
  DevicePolicyRule,
  PolicyDeviceType,
  ResolvedDevicePolicy,
  RoomPolicyContext,
} from "../services/devicePolicyEngine";

/** Everything we know about the joining device. Captured client-side, enriched server-side. */
export interface DeviceSnapshot {
  deviceId: string; // stable per-browser id (localStorage)
  fingerprint: string; // hash of stable hardware/browser traits
  deviceType: PolicyDeviceType;
  deviceModel: string;
  osName: string;
  browserName: string;
  browserVersion: string;
  userAgent: string;
  platform?: string;
  uaDataMobile?: boolean;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  aspectRatio: string; // e.g. "16:9"
  orientation: "portrait" | "landscape";
  touchSupported: boolean;
  maxTouchPoints: number;
  pointer: "fine" | "coarse" | "none";
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  networkType?: string;
  timezone: string;
  language: string;
  // Added by the server
  ipAddress?: string;
  serverClassifiedType?: PolicyDeviceType | "unknown";
  integrity?: "consistent" | "mismatch" | "unverifiable";
  effectiveDeviceType?: PolicyDeviceType;
}

export interface AccessActor {
  id: string;
  name: string;
  role: string;
  studentCode?: string;
  email?: string;
}

export interface RoomDevicePolicy extends ResolvedDevicePolicy {
  roomSlug: string;
  context: RoomPolicyContext;
  linkShortCode?: string;
  createdBy?: AccessActor;
  createdAt: string;
  updatedAt: string;
}

export type AccessRequestStatus = "pending" | "approved" | "denied" | "cancelled" | "expired";
export type ApprovalScope = "this_session" | "this_device";

export interface DeviceAccessRequest {
  id: string;
  roomSlug: string;
  student: AccessActor;
  device: DeviceSnapshot;
  studentMessage: string;
  policySnapshot: ResolvedDevicePolicy;
  status: AccessRequestStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: AccessActor;
  decisionNote?: string;
  scope?: ApprovalScope;
  expiresAt?: string;
}

export type DeviceAccessEventType =
  | "policy_set"
  | "link_generated"
  | "join_evaluated"
  | "join_allowed"
  | "join_blocked"
  | "join_allowed_by_approval"
  | "request_created"
  | "request_approved"
  | "request_denied"
  | "request_cancelled"
  | "request_expired"
  | "rule_updated";

export interface DeviceAccessEvent {
  id: string;
  at: string; // ISO timestamp
  type: DeviceAccessEventType;
  roomSlug?: string;
  actor?: AccessActor;
  subject?: AccessActor; // the student affected, when the actor is staff
  requestId?: string;
  device?: DeviceSnapshot;
  policy?: Pick<ResolvedDevicePolicy, "allowedDeviceTypes" | "matchedRuleId" | "matchedRuleName" | "mode">;
  decision?: "allow" | "block" | "approved_override";
  details?: string;
}

export interface EvaluateResponse {
  decision: "allow" | "block" | "approved_override";
  /** Why a join was blocked: wrong device type, or the class requires the desktop app */
  blockReason?: "device_type" | "desktop_app_required";
  policy: ResolvedDevicePolicy;
  effectiveDeviceType: PolicyDeviceType;
  integrity: DeviceSnapshot["integrity"];
  activeRequest?: DeviceAccessRequest;
  enforcement: "server" | "client_fallback";
}

export type { ApproverRole, DevicePolicyRule, PolicyDeviceType, ResolvedDevicePolicy, RoomPolicyContext };
