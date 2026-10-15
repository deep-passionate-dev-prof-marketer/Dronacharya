/**
 * Baseline security headers on every response (no extra dependency).
 *
 * - nosniff: files are only ever treated as the type we send.
 * - no-referrer: sign-in links carry a token in the address; it never leaks to other sites.
 * - frame-ancestors 'none' / X-Frame-Options: the app can't be framed (clickjacking).
 * - Permissions-Policy: camera, microphone and screen sharing only for this site itself.
 * - HSTS in production (HTTPS only from then on).
 * - Content-Security-Policy in report-only mode for now: violations show in the browser console
 *   without breaking anything; switch CSP_ENFORCE=1 once a full click-through shows none.
 */
import type express from "express";

function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // The engagement analyser (MediaPipe, served from this site) compiles WebAssembly
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: data:",
    // Everything (API, room socket, media signalling) is this server
    "connect-src 'self' ws: wss:",
    "worker-src 'self' blob:",
  ].join("; ");
}

export function securityHeaders(): express.RequestHandler {
  const production = process.env.NODE_ENV === "production";
  const csp = contentSecurityPolicy();
  const enforce = process.env.CSP_ENFORCE === "1";
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()");
    if (production) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader(enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", csp);
    }
    next();
  };
}
