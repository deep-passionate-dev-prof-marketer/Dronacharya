import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { setupRealtimeWebSocket } from "./src/server/realtimeHub";
import { closeDb, getDb } from "./src/server/db";
import { sql } from "drizzle-orm";
import { seedIfEmpty } from "./src/server/db/seed";
import { attachUser, requireAuth } from "./src/server/auth/session";
import { setupAuthRoutes } from "./src/server/auth/routes";
import { apiNotFound, catchAsyncErrors, errorHandler, logProcessErrors } from "./src/server/asyncRoutes";
import { checkConfigOrExit } from "./src/server/config";
import { setupAiRoutes } from "./src/server/aiRoutes";
import { securityHeaders } from "./src/server/securityHeaders";
import { demoFeatures } from "./src/server/features";
import { mediaEnabled } from "./src/server/media/mediaServer";

dotenv.config();
checkConfigOrExit();
logProcessErrors();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Before any route is registered: async handler errors reach the error middleware
catchAsyncErrors(app);
const httpServer = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.disable("x-powered-by");
app.use(securityHeaders());
// Small JSON bodies everywhere; uploads use their own parsers on their routes
app.use(express.json({ limit: "200kb" }));
app.set("trust proxy", 1);

// Database (PGlite file in dev, Postgres/Supabase via DATABASE_URL) + test accounts on first run
const db = await getDb();
await seedIfEmpty(db);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await closeDb();
    process.exit(0);
  });
}

// Signed sessions: every request gets req.user from the HttpOnly cookie (never from the request body)
app.use(attachUser());
setupAuthRoutes(app);

// Initialize Real-Time WebSockets, Room Bomber Partition Engine & REST Routes
setupRealtimeWebSocket(httpServer, app);

// Live-class AI helpers (caption translation, demo peer notes): guarded, rate-limited, no canned answers
setupAiRoutes(app);

// What the web app needs to know about this server before sign-in (no secrets)
app.get("/api/config", (_req, res) => {
  res.json({
    demoFeatures: demoFeatures(),
    media: mediaEnabled(),
  });
});

// Health: the platform's own check (Render, Docker) and the admin status page. Only real figures.
app.get("/api/health", async (_req, res) => {
  let database = "ok";
  try {
    const db: any = await getDb();
    await db.execute(sql`select 1`);
  } catch {
    database = "down";
  }
  res.status(database === "ok" ? 200 : 503).json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    media: mediaEnabled(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});
app.get("/api/system/health", requireAuth("admin"), (_req, res) => {
  const mem = process.memoryUsage();
  res.json({ status: "ok", uptimeSeconds: Math.floor(process.uptime()), memoryRssMb: Math.round(mem.rss / (1024 * 1024)) });
});

async function startServer() {
  // Unknown API paths answer JSON 404 instead of the web page
  app.all("/api/*", apiNotFound());
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    // Dev only: the production image serves the built files and never loads Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  app.use(errorHandler());

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dronacharya] 21K School server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
