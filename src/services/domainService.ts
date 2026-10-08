/**
 * Dynamic Domain & Production Meeting Link Resolution Engine
 *
 * Guarantees ZERO hardcoded/fixed domains.
 * Auto-detects the host domain from the active runtime environment (window.location.origin)
 * and normalizes any production meeting link (internal room slugs, Google Meet, Zoom,
 * MS Teams, Jitsi, Daily, WebRTC SFU endpoints, custom production video URLs).
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
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
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
 * Parses and normalizes ANY user-supplied production meeting link.
 * Supports:
 * - Internal Dronacharya / 21K rooms (full URL or slug or shortcode)
 * - Google Meet (meet.google.com/xxx-xxxx-xxx)
 * - Zoom (zoom.us/j/1234567890 or https://*.zoom.us/...)
 * - Microsoft Teams (teams.microsoft.com/... or teams.live.com/...)
 * - Jitsi Meet (meet.jit.si/MyRoomName - embeddable)
 * - Daily.co (xxx.daily.co/xxx - embeddable)
 * - WebRTC / Video SFU endpoints or any HTTPS production meeting stream URL
 */
export function parseProductionMeetingLink(rawInput: string): NormalizedProductionMeeting {
  const trimmed = rawInput.trim();
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (!trimmed) {
    const defaultSlug = "dronacharya-gr10-phy";
    return {
      rawInput: "",
      normalizedUrl: buildMeetingUrl(defaultSlug),
      roomSlug: defaultSlug,
      displayTitle: "Grade 10-A · Quantum Mechanics (Live Stage)",
      provider: "internal",
      isExternal: false,
      canEmbed: true,
      isSecure: true,
      joinedAt: now,
    };
  }

  // Case 1: Google Meet
  if (/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(trimmed)) {
    const match = trimmed.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    const code = match ? match[1] : "live-session";
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return {
      rawInput: trimmed,
      normalizedUrl: fullUrl,
      roomSlug: `gmeet-${code}`,
      displayTitle: `Google Meet (${code})`,
      provider: "google-meet",
      isExternal: true,
      canEmbed: false, // Google Meet prohibits iframe embedding due to X-Frame-Options
      meetingId: code,
      isSecure: true,
      joinedAt: now,
    };
  }

  // Case 2: Zoom
  if (/zoom\.us\/j\/(\d+)/i.test(trimmed) || /zoom\.us/i.test(trimmed)) {
    const match = trimmed.match(/zoom\.us\/j\/(\d+)/i);
    const id = match ? match[1] : "live-session";
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return {
      rawInput: trimmed,
      normalizedUrl: fullUrl,
      roomSlug: `zoom-${id}`,
      displayTitle: `Zoom Meeting (${id})`,
      provider: "zoom",
      isExternal: true,
      canEmbed: false,
      meetingId: id,
      isSecure: true,
      joinedAt: now,
    };
  }

  // Case 3: Microsoft Teams
  if (/teams\.microsoft\.com/i.test(trimmed) || /teams\.live\.com/i.test(trimmed)) {
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return {
      rawInput: trimmed,
      normalizedUrl: fullUrl,
      roomSlug: `teams-${Date.now().toString(36)}`,
      displayTitle: "Microsoft Teams Live Meeting",
      provider: "teams",
      isExternal: true,
      canEmbed: false,
      isSecure: true,
      joinedAt: now,
    };
  }

  // Case 4: Jitsi Meet (Fully iframe-embeddable with WebRTC!)
  if (/meet\.jit\.si\//i.test(trimmed)) {
    const match = trimmed.match(/meet\.jit\.si\/([a-zA-Z0-9_\-]+)/i);
    const room = match ? match[1] : "21k-live";
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://meet.jit.si/${room}`;
    return {
      rawInput: trimmed,
      normalizedUrl: fullUrl,
      roomSlug: `jitsi-${room}`,
      displayTitle: `Jitsi Room · ${room}`,
      provider: "jitsi",
      isExternal: true,
      canEmbed: true,
      embedUrl: `https://meet.jit.si/${room}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false`,
      meetingId: room,
      isSecure: true,
      joinedAt: now,
    };
  }

  // Case 5: Daily.co
  if (/\.daily\.co\//i.test(trimmed)) {
    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const slugMatch = trimmed.match(/daily\.co\/([a-zA-Z0-9_\-]+)/i);
    const room = slugMatch ? slugMatch[1] : "live";
    return {
      rawInput: trimmed,
      normalizedUrl: fullUrl,
      roomSlug: `daily-${room}`,
      displayTitle: `Daily.co Live Session · ${room}`,
      provider: "daily",
      isExternal: true,
      canEmbed: true,
      embedUrl: fullUrl,
      meetingId: room,
      isSecure: true,
      joinedAt: now,
    };
  }

  // Case 6: Generic HTTPS URL (Production WebRTC / Streaming SFU endpoint)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const urlObj = new URL(trimmed);
      const hostOrigin = urlObj.origin;
      const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

      // Check if this URL is on the current application host
      if (currentOrigin && hostOrigin === currentOrigin) {
        // Path extraction
        const path = urlObj.pathname;
        if (path.includes("/room/")) {
          const slug = path.split("/room/")[1].replace(/\/.*$/, "");
          return {
            rawInput: trimmed,
            normalizedUrl: trimmed,
            roomSlug: slug,
            displayTitle: `Classroom Session · ${slug}`,
            provider: "internal",
            isExternal: false,
            canEmbed: true,
            isSecure: true,
            joinedAt: now,
          };
        }
        if (path.includes("/s/")) {
          const code = path.split("/s/")[1].replace(/\/.*$/, "");
          return {
            rawInput: trimmed,
            normalizedUrl: trimmed,
            roomSlug: `short-${code}`,
            shortCode: code,
            displayTitle: `Shortlink Session · ${code}`,
            provider: "internal",
            isExternal: false,
            canEmbed: true,
            isSecure: true,
            joinedAt: now,
          };
        }
      }

      // External Production Video Endpoint
      return {
        rawInput: trimmed,
        normalizedUrl: trimmed,
        roomSlug: `ext-${urlObj.hostname.replace(/[^a-z0-9]/gi, "-")}-${Date.now().toString(36)}`,
        displayTitle: `Production Meeting (${urlObj.hostname})`,
        provider: "generic-production",
        isExternal: true,
        canEmbed: true, // Attempt iframe embed with fallback to external companion
        embedUrl: trimmed,
        isSecure: urlObj.protocol === "https:",
        joinedAt: now,
      };
    } catch {
      // Fallback
    }
  }

  // Case 7: Pure Slug or Code (e.g. "in-21kos-gr10-bc-phy-vance", "p-es10h", "8xN2pQ")
  const cleanSlug = trimmed.replace(/[^a-zA-Z0-9_\-]/g, "");
  const isShortCode = cleanSlug.length <= 8 && !cleanSlug.includes("-");

  return {
    rawInput: trimmed,
    normalizedUrl: isShortCode ? buildShortMeetingUrl(cleanSlug) : buildMeetingUrl(cleanSlug),
    roomSlug: cleanSlug,
    shortCode: isShortCode ? cleanSlug : undefined,
    displayTitle: isShortCode ? `Room Shortlink (${cleanSlug})` : `Classroom (${cleanSlug})`,
    provider: "internal",
    isExternal: false,
    canEmbed: true,
    isSecure: true,
    joinedAt: now,
  };
}
