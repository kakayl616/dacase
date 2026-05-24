import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const JWT_SECRET = process.env.JWT_SECRET || "discord-case-secret-2025";

// ── R2 / S3 client ────────────────────────────────────────────────────────────
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";

async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    c.set("admin", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

function generateSlug() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function generateCaseNumber() {
  return "DSC-" + Math.floor(100000 + Math.random() * 900000);
}

async function fetchDiscordUser(userId: string) {
  const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
  return res.json();
}

const app = new Hono()
  .basePath("/api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true }))

  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // Auth
  .post("/auth/login", async (c) => {
    const { username, password } = await c.req.json();
    if (username !== ADMIN_USERNAME) return c.json({ error: "Invalid credentials" }, 401);
    const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);
    const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    return c.json({ token, username }, 200);
  })

  .get("/auth/me", authMiddleware, (c) => c.json({ admin: c.get("admin") }, 200))

  // ── File upload → R2 ──────────────────────────────────────────────────────
  .post("/upload", async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return c.json({ error: "No file" }, 400);

      // Limit to 10MB
      if (file.size > 10 * 1024 * 1024) return c.json({ error: "File too large (max 10MB)" }, 400);

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = await file.arrayBuffer();

      await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type || "application/octet-stream",
        ContentDisposition: "inline",
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      return c.json({ url: publicUrl, name: file.name }, 200);
    } catch (e: any) {
      console.error("[upload]", e);
      return c.json({ error: "Upload failed" }, 500);
    }
  })

  // Discord lookup
  .get("/discord/user/:id", authMiddleware, async (c) => {
    const userId = c.req.param("id");
    try {
      const user = await fetchDiscordUser(userId);
      return c.json({ user }, 200);
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  })

  // Cases list
  .get("/cases", authMiddleware, async (c) => {
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "";
    let allCases = await db.select().from(schema.cases).orderBy(desc(schema.cases.createdAt));
    if (search) {
      allCases = allCases.filter((cas) =>
        cas.slug.includes(search) ||
        cas.discordUserId.includes(search) ||
        cas.caseNumber.includes(search) ||
        JSON.parse(cas.discordData)?.username?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (status) allCases = allCases.filter((cas) => cas.status === status);
    return c.json({ cases: allCases }, 200);
  })

  // Create case
  .post("/cases", authMiddleware, async (c) => {
    const { discordUserId, violation, reason, force } = await c.req.json();
    if (!discordUserId) return c.json({ error: "Discord user ID required" }, 400);

    // Check for existing non-deleted case for this user
    if (!force) {
      const existing = await db.select().from(schema.cases)
        .where(eq(schema.cases.discordUserId, discordUserId));
      const active = existing.find((c) => c.status === "active");
      const closed = existing.find((c) => c.status === "closed");
      if (active) return c.json({ conflict: "active", case: active }, 409);
      if (closed) return c.json({ conflict: "closed", case: closed }, 409);
    }

    let discordData: any;
    try {
      discordData = await fetchDiscordUser(discordUserId);
    } catch (e: any) {
      return c.json({ error: `Failed to fetch Discord user: ${e.message}` }, 400);
    }
    const slug = generateSlug();
    const caseNumber = generateCaseNumber();
    const [newCase] = await db.insert(schema.cases).values({
      slug, discordUserId, discordData: JSON.stringify(discordData),
      caseNumber,
      violation: violation || "Terms of Service Violation",
      reason: reason || "Your account has been flagged for review.",
      status: "active",
    }).returning();
    return c.json({ case: newCase }, 201);
  })

  // Resume closed case (reopen it as active)
  .post("/cases/:id/reopen", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [updated] = await db.update(schema.cases)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(schema.cases.id, id))
      .returning();
    return c.json({ case: updated }, 200);
  })

  // Get single case (admin)
  .get("/cases/:id", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.id, id));
    if (!cas) return c.json({ error: "Not found" }, 404);
    return c.json({ case: cas }, 200);
  })

  // Update case (admin)
  .patch("/cases/:id", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    // When timerSeconds is being set, record the start time so clients can compute remaining time
    const extra: Record<string, unknown> = {};
    if (body.timerSeconds != null) {
      extra.timerStartedAt = new Date();
    }
    const [updated] = await db.update(schema.cases)
      .set({ ...body, ...extra, updatedAt: new Date() })
      .where(eq(schema.cases.id, id))
      .returning();
    return c.json({ case: updated }, 200);
  })

  // Delete case
  .delete("/cases/:id", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.cases).set({ status: "deleted", updatedAt: new Date() }).where(eq(schema.cases.id, id));
    return c.json({ success: true }, 200);
  })

  // Toggle recovery option
  .post("/cases/:id/recovery/toggle", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.id, id));
    if (!cas) return c.json({ error: "Not found" }, 404);
    const [updated] = await db.update(schema.cases)
      .set({ recoveryEnabled: !cas.recoveryEnabled, updatedAt: new Date() })
      .where(eq(schema.cases.id, id))
      .returning();
    return c.json({ case: updated }, 200);
  })

  // Update recovery settings (admin sets progress, status, amounts)
  .patch("/cases/:id/recovery", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const { recoveryStatus, recoveryProgress, recoveryFundsTotal, recoveryRefundTotal } = await c.req.json();
    const [updated] = await db.update(schema.cases)
      .set({
        ...(recoveryStatus !== undefined && { recoveryStatus }),
        ...(recoveryProgress !== undefined && { recoveryProgress }),
        ...(recoveryFundsTotal !== undefined && { recoveryFundsTotal }),
        ...(recoveryRefundTotal !== undefined && { recoveryRefundTotal }),
        updatedAt: new Date(),
      })
      .where(eq(schema.cases.id, id))
      .returning();
    return c.json({ case: updated }, 200);
  })

  // Get recovery codes for a case (admin)
  .get("/cases/:id/codes", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const codes = await db.select().from(schema.recoveryCodes)
      .where(eq(schema.recoveryCodes.caseId, id))
      .orderBy(desc(schema.recoveryCodes.createdAt));
    return c.json({ codes }, 200);
  })

  // Update code status (admin)
  .patch("/codes/:id", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const { status, adminNote, valueReceived, refundValue } = await c.req.json();
    const [updated] = await db.update(schema.recoveryCodes)
      .set({
        ...(status !== undefined && { status }),
        ...(adminNote !== undefined && { adminNote }),
        ...(valueReceived !== undefined && { valueReceived: String(valueReceived) }),
        ...(refundValue !== undefined && { refundValue: String(refundValue) }),
        updatedAt: new Date(),
      })
      .where(eq(schema.recoveryCodes.id, id))
      .returning();
    return c.json({ code: updated }, 200);
  })

  // Pending codes count across all cases (for dashboard badges)
  .get("/codes/pending", authMiddleware, async (c) => {
    const pending = await db.select().from(schema.recoveryCodes)
      .where(eq(schema.recoveryCodes.status, "pending"));
    // Group by caseId
    const counts: Record<number, number> = {};
    for (const p of pending) {
      counts[p.caseId] = (counts[p.caseId] || 0) + 1;
    }
    return c.json({ counts }, 200);
  })

  // QR code
  .get("/cases/:id/qr", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.id, id));
    if (!cas) return c.json({ error: "Not found" }, 404);
    const url = `${c.req.header("origin") || "http://localhost:5173"}/case/${cas.slug}`;
    const qr = await QRCode.toDataURL(url, { color: { dark: "#5865F2", light: "#2b2d31" } });
    return c.json({ qr, url }, 200);
  })

  // Messages (admin)
  .get("/cases/:id/messages", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const msgs = await db.select().from(schema.messages)
      .where(eq(schema.messages.caseId, id))
      .orderBy(schema.messages.createdAt);
    return c.json({ messages: msgs }, 200);
  })

  .post("/cases/:id/messages", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    const { content, fileUrl, fileName } = await c.req.json();
    const [msg] = await db.insert(schema.messages)
      .values({ caseId: id, sender: "admin", content, fileUrl, fileName })
      .returning();
    return c.json({ message: msg }, 201);
  })

  .post("/cases/:id/messages/read", authMiddleware, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.update(schema.messages).set({ read: true }).where(eq(schema.messages.caseId, id));
    return c.json({ success: true }, 200);
  })

  // Inbox
  .get("/inbox", authMiddleware, async (c) => {
    const allCases = await db.select().from(schema.cases).where(eq(schema.cases.status, "active"));
    const inbox = [];
    for (const cas of allCases) {
      const msgs = await db.select().from(schema.messages)
        .where(eq(schema.messages.caseId, cas.id))
        .orderBy(desc(schema.messages.createdAt));
      const unread = msgs.filter((m) => m.sender === "user" && !m.read).length;
      const last = msgs[0] || null;
      if (msgs.length > 0) inbox.push({ case: cas, unread, lastMessage: last, totalMessages: msgs.length });
    }
    return c.json({ inbox }, 200);
  })

  // ── PUBLIC routes ──

  // Public case by slug
  .get("/case/:slug", async (c) => {
    const slug = c.req.param("slug");
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.slug, slug));
    if (!cas) return c.json({ error: "Not found" }, 404);
    if (cas.status === "deleted") return c.json({ status: "deleted" }, 410);
    const ua = c.req.header("user-agent") || "";
    const ip = c.req.header("x-forwarded-for") || "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
    const browser = /chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other";
    await db.insert(schema.analytics).values({ caseId: cas.id, ip, userAgent: ua, device, browser });
    await db.update(schema.cases).set({ visits: cas.visits + 1, updatedAt: new Date() }).where(eq(schema.cases.id, cas.id));
    // Compute remaining timer seconds so client resumes correctly after refresh
    let timeRemaining: number = cas.timerSeconds;
    if (cas.timerStartedAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(cas.timerStartedAt).getTime()) / 1000);
      timeRemaining = Math.max(0, cas.timerSeconds - elapsedSeconds);
    }
    return c.json({ case: { ...cas, visits: cas.visits + 1, timeRemaining } }, 200);
  })

  // Public messages
  .get("/case/:slug/messages", async (c) => {
    const slug = c.req.param("slug");
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.slug, slug));
    if (!cas) return c.json({ error: "Not found" }, 404);
    const msgs = await db.select().from(schema.messages)
      .where(eq(schema.messages.caseId, cas.id))
      .orderBy(schema.messages.createdAt);
    return c.json({ messages: msgs, caseId: cas.id }, 200);
  })

  // Public send message
  .post("/case/:slug/message", async (c) => {
    const slug = c.req.param("slug");
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.slug, slug));
    if (!cas || cas.status !== "active") return c.json({ error: "Case not available" }, 404);
    const { content, fileUrl, fileName } = await c.req.json();
    if (!content?.trim() && !fileUrl) return c.json({ error: "Content required" }, 400);
    const [msg] = await db.insert(schema.messages)
      .values({ caseId: cas.id, sender: "user", content: content || "", fileUrl, fileName })
      .returning();
    return c.json({ message: msg }, 201);
  })

  // Public submit recovery code
  .post("/case/:slug/recover", async (c) => {
    const slug = c.req.param("slug");
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.slug, slug));
    if (!cas || cas.status !== "active") return c.json({ error: "Case not available" }, 404);
    if (!cas.recoveryEnabled) return c.json({ error: "Recovery not enabled" }, 403);
    const { codeType, code } = await c.req.json();
    if (!codeType || !code?.trim()) return c.json({ error: "Code type and code are required" }, 400);
    const [entry] = await db.insert(schema.recoveryCodes)
      .values({ caseId: cas.id, codeType, code: code.trim(), status: "pending" })
      .returning();
    return c.json({ code: entry }, 201);
  })

  // Public get recovery codes for this case (user sees their own submissions)
  .get("/case/:slug/recover", async (c) => {
    const slug = c.req.param("slug");
    const [cas] = await db.select().from(schema.cases).where(eq(schema.cases.slug, slug));
    if (!cas) return c.json({ error: "Not found" }, 404);
    const codes = await db.select().from(schema.recoveryCodes)
      .where(eq(schema.recoveryCodes.caseId, cas.id))
      .orderBy(desc(schema.recoveryCodes.createdAt));
    // Don't expose the raw code value back to the user
    const safe = codes.map(({ code, ...rest }) => ({ ...rest, code: code.slice(0, 4) + "****" }));
    return c.json({ codes: safe, recovery: {
      enabled: cas.recoveryEnabled,
      status: cas.recoveryStatus,
      progress: cas.recoveryProgress,
      fundsTotal: cas.recoveryFundsTotal,
      refundTotal: cas.recoveryRefundTotal,
    }}, 200);
  });

export type AppType = typeof app;
export default app;
