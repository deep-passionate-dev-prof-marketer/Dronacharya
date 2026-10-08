// Shared Express app for the Vercel LiveKit functions (same routes as the Node server).
import express from "express";
import { setupLivekitRoutes } from "../../src/server/livekitHub";

const app = express();
app.use(express.json({ limit: "1mb" }));
setupLivekitRoutes(app);

export default app;
