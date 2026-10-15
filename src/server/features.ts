/**
 * Demo features (pitch rooms, remote device control, certificates, automation, CRM simulator,
 * self-hosting page, peer notes) run on illustrative data. They're on in development and off in
 * production unless SHOW_DEMO_FEATURES=1.
 */
import type express from "express";

export const demoFeatures = () => (process.env.SHOW_DEMO_FEATURES ? process.env.SHOW_DEMO_FEATURES === "1" : process.env.NODE_ENV !== "production");

/** Route guard: demo-only endpoints answer 404 when demos are off. */
export const demoOnly: express.RequestHandler = (_req, res, next) => {
  if (!demoFeatures()) return res.status(404).json({ error: "Not found" });
  next();
};
