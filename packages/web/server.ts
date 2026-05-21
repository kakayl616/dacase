import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import app from "./src/api/index";
import path from "path";

const port = Number(process.env.PORT) || 4173;

const server = new Hono();

// All /api routes → Hono API
server.route("/api", app);

// Serve static build output
server.use("*", serveStatic({ root: "./dist" }));

// SPA fallback for client-side routing
server.get("*", (c) => {
  return c.html(Bun.file(path.resolve("./dist/index.html")).text());
});

export default {
  port,
  fetch: server.fetch,
};
