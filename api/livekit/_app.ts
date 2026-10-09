// Shared Express app for the Vercel LiveKit functions (same routes as the Node server).
import express from "express";
import { setupLivekitRoutes } from "../../src/server/livekitHub";
import { attachUser } from "../../src/server/auth/session";

const app = express();
app.use(express.json({ limit: "1mb" }));
// Needs DATABASE_URL (Supabase) in the Vercel project so sessions can be verified
app.use(attachUser());
setupLivekitRoutes(app);

export default app;
