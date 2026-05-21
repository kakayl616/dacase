import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import apiApp from "./src/api/index";
import path from "path";

const port = Number(process.env.PORT) || 4173;

const root = new Hono();

// Prefix all API routes with /api
const api = new Hono();
api.route("/", apiApp);
root.route("/api", api);

// Serve static files from dist
root.use("*", serveStatic({ root: "./dist" }));

// SPA fallback
root.get("*", async (c) => {
  const html = await Bun.file(path.resolve("./dist/index.html")).text();
  return c.html(html);
});

Bun.serve({
  port,
  fetch: root.fetch,
});

console.log(`Server running on port ${port}`);
