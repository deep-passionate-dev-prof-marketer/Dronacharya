/**
 * Dynamic Domain & Production Meeting Link Resolution Engine
 *
 * Guarantees ZERO hardcoded/fixed domains.
 * Auto-detects the host domain from the active runtime environment (window.location.origin)
 * and reads class links (our own rooms only).
 */

export interface NormalizedProductionMeeting {
  rawInput: string;
  normalizedUrl: string;
  roomSlug: string;
  displayTitle: string;
  provider:
    | "internal"
    | "google-meet"
    | "zoom"
    | "teams"
    | "jitsi"
    | "daily"
    | "webrtc-stream"
    | "generic-production";
  isExternal: boolean;
  canEmbed: boolean;
  embedUrl?: string;
  meetingId?: string;
  shortCode?: string;
  isSecure: boolean;
  joinedAt: string;
}

/**
 * Returns the active application origin dynamically.
 * Zero fixed domains: auto-fetches from window.location or environment.
 */
export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  if (typeof process !== "undefined" && process.env) {
    const configured = process.env.PUBLIC_APP_URL || process.env.APP_URL;
    if (configured) return configured.replace(/\/$/, "");
    if (process.env.PORT) return `http://localhost:${process.env.PORT}`;
  }
  return "http://localhost:3000";
}

/**
 * Constructs a dynamic full meeting URL based on the runtime origin.
 */
export function buildMeetingUrl(roomSlug: string, customOrigin?: string): string {
  const base = customOrigin || getAppOrigin();
  const cleanSlug = roomSlug.trim().replace(/^\/+/, "");
  return `${base}/room/${cleanSlug}`;
}

/**
 * Constructs a dynamic Base62 shortlink based on the runtime origin.
 */
export function buildShortMeetingUrl(shortCode: string, customOrigin?: string): string {
  const base = customOrigin || getAppOrigin();
  const cleanCode = shortCode.trim().replace(/^\/+/, "");
  return `${base}/s/${cleanCode}`;
}

/**
 * Reads a class link someone pasted: a full link to one of our rooms (/room/<slug>, ?room=<slug>, or
 * the short form /s/<code>, from this or an older address of the school's site), or just the room
 * name. Classes only run on the school's own server; links to outside meeting services aren't
 * opened.
 */
export function parseProductionMeetingLink(rawInput: string): NormalizedProductionMeeting {
  const trimmed = rawInput.trim();
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const internal = (slug: string, extra: Partial<NormalizedProductionMeeting> = {}): NormalizedProductionMeeting => ({
    rawInput: trimmed,
    normalizedUrl: buildMeetingUrl(slug),
    roomSlug: slug,
    displayTitle: `Classroom (${slug})`,
    provider: "internal",
    isExternal: false,
    canEmbed: true,
    isSecure: true,
    joinedAt: now,
    ...extra,
  });
  const clean = (v: string) => v.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromPath = url.pathname.match(/\/room\/([^/?#]+)/)?.[1];
      const fromQuery = url.searchParams.get("room") || url.searchParams.get("join");
      const slug = clean(decodeURIComponent(fromPath || fromQuery || ""));
      if (slug) return internal(slug, { normalizedUrl: buildMeetingUrl(slug) });
      const code = clean(url.pathname.match(/\/s\/([^/?#]+)/)?.[1] || "");
      if (code) return internal(`short-${code}`, { shortCode: code, normalizedUrl: buildShortMeetingUrl(code), displayTitle: `Room link (${code})` });
    } catch {
      // not a URL after all
    }
  }

  // A room name or short code typed on its own
  const slug = clean(trimmed) || "dronacharya-gr10-phy";
  const isShortCode = slug.length <= 8 && !slug.includes("-");
  return internal(slug, {
    normalizedUrl: isShortCode ? buildShortMeetingUrl(slug) : buildMeetingUrl(slug),
    shortCode: isShortCode ? slug : undefined,
    displayTitle: isShortCode ? `Room link (${slug})` : `Classroom (${slug})`,
  });
}
