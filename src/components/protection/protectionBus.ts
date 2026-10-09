/** Tiny event bus: any detector can make the watermark flash, the watermark listens. */
type Listener = (reason: string) => void;
const listeners = new Set<Listener>();

export const protectionBus = {
  flash(reason: string) {
    listeners.forEach((l) => l(reason));
  },
  onFlash(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** Report a content-protection event to the server audit log (best effort, never blocks UI). */
export function reportSecurityEvent(type: string, extra: { roomSlug?: string; view?: string; detail?: string } = {}) {
  fetch("/api/security/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ type, ...extra }),
  }).catch(() => {});
}
