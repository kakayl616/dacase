# Deployment Guide

## Free Stack (Recommended)
- **Frontend + Backend:** Render.com (free web service) OR Railway (hobby $5 trial)
- **Database:** Turso (free — 100 DBs, 5GB) or keep SQLite on Railway

---

## Option A: Render (Fully Free)

1. Push to GitHub
2. Go to render.com → New Web Service → connect repo
3. Build command: `cd packages/web && bun install && bun run build`
4. Start command: `cd packages/web && bun run preview` or `bunx vite preview --port $PORT`
5. Set environment variables:

```
DISCORD_BOT_TOKEN=your_new_bot_token_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
JWT_SECRET=a-long-random-secret
DATABASE_URL=file:./local.db
```

---

## Option B: Railway

1. Push to GitHub
2. New Project → Deploy from GitHub
3. Same env vars as above
4. Railway auto-detects Bun

---

## Database (Production)

For production, use **Turso**:
1. `npm install -g turso`
2. `turso auth login`
3. `turso db create discord-cases`
4. `turso db show discord-cases` → copy URL
5. `turso db tokens create discord-cases` → copy auth token
6. Set in env:
   ```
   DATABASE_URL=libsql://your-db.turso.io
   DATABASE_AUTH_TOKEN=your-token
   ```
7. Run `bun run db:push` to migrate schema

---

## Discord Bot Token

Your token returned 401 — it's likely been regenerated or invalidated.

1. Go to https://discord.com/developers/applications
2. Select your bot → Bot tab
3. Click "Reset Token" → copy the new one
4. Set `DISCORD_BOT_TOKEN=your_new_token` in `.env`

**Required bot permissions:**
- No special permissions needed — just the token to use `GET /users/:id` endpoint

---

## Admin Credentials

Default: `admin` / `admin123`

To change:
```
ADMIN_USERNAME=yourusername
ADMIN_PASSWORD=yourpassword
```

---

## Custom Domain

On Render/Railway: Settings → Custom Domain → add your domain
Then DNS: CNAME → your-app.render.com

For subdomain routing (case.yourdomain.com):
- Point CNAME to your deployment
- The app handles all routes internally

---

## Environment Variables Reference

| Variable | Description | Required |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Your Discord bot token | Yes |
| `ADMIN_USERNAME` | Admin panel username | Yes |
| `ADMIN_PASSWORD` | Admin panel password | Yes |
| `JWT_SECRET` | JWT signing secret (random string) | Yes |
| `DATABASE_URL` | Turso DB URL or `file:./local.db` | Yes |
| `DATABASE_AUTH_TOKEN` | Turso auth token (blank for local) | No |
