/**
 * Express 4 doesn't catch promises rejected by async route handlers: the rejection goes unhandled and
 * the request hangs (or, on recent Node, the process dies). Every handler registered on the app is
 * wrapped so a rejection reaches the error middleware instead.
 */
import crypto from "crypto";
import type express from "express";

type Fn = (...args: any[]) => any;

const wrap = (fn: Fn): Fn =>
  function wrapped(this: unknown, req: any, res: any, next: any) {
    try {
      const out = fn.call(this, req, res, next);
      if (out && typeof out.then === "function") out.catch(next);
      return out;
    } catch (err) {
      next(err);
    }
  };

/** Wraps handlers passed to app.get/post/put/patch/delete/all/use. Error middleware (4 args) and mounted apps are left alone. */
export function catchAsyncErrors(app: express.Express) {
  for (const method of ["get", "post", "put", "patch", "delete", "all", "use"] as const) {
    const original = (app as any)[method].bind(app);
    (app as any)[method] = (...args: any[]) =>
      original(...args.map((a) => (typeof a === "function" && a.length < 4 && !(a as any).handle ? wrap(a) : a)));
  }
}

/** Unknown /api paths answer JSON 404 (never the web page), and errors answer JSON 500 with an id to find them in the logs. */
export function apiNotFound(): express.RequestHandler {
  return (_req, res) => res.status(404).json({ error: "Not found" });
}

export function errorHandler(): express.ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = Number(err?.status || err?.statusCode) || 500;
    if (status < 500) return res.status(status).json({ error: err?.expose === false ? "Bad request" : err?.message || "Bad request" });
    const id = crypto.randomBytes(4).toString("hex");
    console.error(`[error ${id}] ${req.method} ${req.originalUrl}:`, err?.stack || err);
    res.status(500).json({ error: "Something went wrong on our side. Please try again.", id });
  };
}

/** A rejected promise or a thrown error outside a request is logged; the server keeps serving the other classes. */
export function logProcessErrors() {
  process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));
  process.on("uncaughtException", (err) => console.error("[uncaughtException]", err));
}
