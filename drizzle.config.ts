import { defineConfig } from "drizzle-kit";

// Generates SQL migrations from src/server/db/schema.ts (applied at server start for PGlite and Postgres alike)
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
});
