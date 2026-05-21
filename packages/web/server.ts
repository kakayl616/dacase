import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import apiApp from "./src/api/index";
import path from "path";

const port = Number(process.env.PORT) || 4173;

const server = new Hono();

// Mount API — handles all /api/* requests
server.mount("/api", apiApp.fetch);

// Serve static build output
server.use("*", serveStatic({ root: "./dist" }));

// SPA fallback
server.get("*", async (c) => {
  const html = await Bun.file(path.resolve("./dist/index.html")).text();
  return c.html(html);
});

Bun.serve({
  port,
  fetch: server.fetch,
});

console.log(`Server running on port ${port}`);
