// Shared Express app for Vercel device access & policy endpoints.
import express from "express";
import { setupDeviceAccessRoutes } from "../../src/server/deviceAccessHub";

const app = express();
app.use(express.json({ limit: "2mb" }));

// In serverless functions, WebSocket broadcast is a safe no-op
setupDeviceAccessRoutes(app, () => {});

export default app;
