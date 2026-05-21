import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

async function runMigrations() {
  try {
    await client.execute("ALTER TABLE cases ADD COLUMN timer_seconds INTEGER NOT NULL DEFAULT 1800");
    console.log("[migration] Added timer_seconds column");
  } catch {
    // Column already exists — ignore
  }
}

runMigrations().catch(console.error);
