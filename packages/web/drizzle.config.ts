import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

// Use turso dialect when a real auth token is present (production), sqlite for local file
const isTurso = authToken && authToken.length > 0;

export default defineConfig({
  dialect: isTurso ? "turso" : "sqlite",
  schema: "./src/api/database/schema.ts",
  out: "./drizzle",
  dbCredentials: isTurso
    ? { url, authToken }
    : { url },
});