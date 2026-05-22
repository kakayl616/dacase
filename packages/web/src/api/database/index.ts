import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Run startup migrations to add missing columns (safe: try/catch each)
async function runMigrations() {
  const migrations = [
    "ALTER TABLE cases ADD COLUMN timer_seconds INTEGER NOT NULL DEFAULT 1800",
    "ALTER TABLE cases ADD COLUMN timer_started_at INTEGER",
    "ALTER TABLE recovery_codes ADD COLUMN value_received TEXT DEFAULT '0.00'",
    "ALTER TABLE recovery_codes ADD COLUMN refund_value TEXT DEFAULT '0.00'",
  ];
  for (const sql of migrations) {
    try {
      await client.execute(sql);
      console.log(`[migration] OK: ${sql.slice(0, 60)}`);
    } catch {
      // Column already exists — ignore
    }
  }
}

runMigrations().catch(console.error);
