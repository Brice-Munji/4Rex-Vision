# Deploying 4RexVision

A practical, copy‑paste guide to run 4RexVision **24/7** on a real host.

**Stack:** Next.js 15 (App Router) · Prisma · PostgreSQL · NextAuth v5 · Node ≥ 18.18 (use **Node 20 LTS**).

Recommended combo: **Vercel** (app) + **Supabase or Neon** (Postgres). Render/Railway work too (see the bottom).

> ⚠️ `.env` is gitignored and never committed. You set the same variables in your host's dashboard. `.env.example` is the template of every supported variable.

---

## 1. Prerequisites

- A GitHub repo with this code (already at `github.com/Brice-Munji/4Rex-Vision`).
- Node 20 LTS locally (for running migrations).
- A PostgreSQL database (Supabase / Neon / Railway / RDS).
- A **valid Gemini API key** from Google AI Studio — it must start with `AIza…` (an `AQ.…`/`ya29.…` value is a short‑lived OAuth token and will 401). Get one at https://aistudio.google.com/app/apikey.

---

## 2. Environment variables

### Required (the app won't work correctly without these)

| Variable | What it is | Example / how to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public` |
| `AUTH_SECRET` | NextAuth signing secret | generate: `openssl rand -base64 32` (or `npx auth secret`) |
| `AUTH_TRUST_HOST` | Trust the deployment host | `true` |
| `NEXTAUTH_URL` | Canonical app URL | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (client) | `https://your-domain.com` |
| `GEMINI_API_KEY` | Rex Vision (chart recognition) | AI Studio key starting with `AIza…` |
| `SUPER_ADMIN_EMAILS` | Who can open the Owner Command Center | `you@example.com` (comma‑separated) |

### Recommended (resilience / core features)

| Variable | Purpose |
|---|---|
| `GEMINI_VISION_MODEL` | e.g. `gemini-2.5-flash` |
| `OPENAI_API_KEY` (+ `OPENAI_VISION_MODEL`) | Vision **primary/backup** (GPT‑4o vision is excellent) |
| `MISTRAL_API_KEY`, `NVIDIA_API_KEY` | Vision fallbacks (used only if a primary fails) |
| `ANTHROPIC_API_KEY` (+ `REX_VISION_MODEL`) | Final vision fallback |
| `RESEND_API_KEY` + `EMAIL_FROM` | Email (verification / password reset) via Resend, **or** the `SMTP_*` set below |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Generic SMTP email (alternative to Resend) |
| `FINNHUB_API_KEY` | Live economic calendar + forex news |

Vision priority order is **OpenAI → Gemini → Mistral → NVIDIA → Anthropic**; set at least one. More keys = more resilience.

### Optional

- **Google sign‑in:** `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Register the redirect URI `https://your-domain.com/api/auth/callback/google` in Google Cloud Console. Leave blank to keep email/password only.
- **Payments:** `FLUTTERWAVE_SECRET_KEY` / `FLUTTERWAVE_WEBHOOK_HASH`, `PAYMENT_MTN_MOMO_NUMBER` / `PAYMENT_ORANGE_MONEY_NUMBER` / `PAYMENT_OWNER_NAME`, or Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*`). Leave blank to run billing in demo mode.

---

## 3. Set up the database + run migrations

The repo ships committed Prisma **migrations**, so a fresh database gets the exact schema (and starts with **0 revenue / 0 users** — nothing is seeded).

From your machine, with `DATABASE_URL` set to your new database:

```bash
npm install                 # also runs `prisma generate`
npx prisma migrate deploy   # applies all committed migrations to the DB
```

`prisma migrate deploy` is the production‑safe command (it never resets data). Use `npm run db:migrate` only for local schema iteration.

### Supabase note (pooling)

Supabase gives two connection strings:

- **Direct** (port `5432`) — use this for **migrations**.
- **Pooled** (port `6543`, PgBouncer) — use this for the **serverless runtime** on Vercel, appended with `?pgbouncer=true&connection_limit=1`.

Practical approach:

1. Run `npx prisma migrate deploy` locally using the **direct** (5432) string.
2. Set the app's `DATABASE_URL` (in Vercel) to the **pooled** (6543) string with `?pgbouncer=true&connection_limit=1`.

> Want a cleaner split (a dedicated `directUrl` for migrations in `prisma/schema.prisma`)? Ask and I'll wire it in.

Neon works the same way (use the pooled host for runtime, direct for migrations).

---

## 4. Deploy to Vercel

1. **Import the repo:** Vercel → Add New → Project → import `Brice-Munji/4Rex-Vision`. Framework preset: **Next.js** (auto‑detected).
2. **Build settings** (defaults are correct):
   - Build command: `npm run build` (runs `prisma generate && next build`)
   - Install command: `npm install`
   - Output: `.next`
3. **Environment Variables:** add everything from section 2 (at minimum the **Required** table). Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your Vercel domain.
4. **Deploy.** After the first deploy, if you didn't run migrations locally, run them once against the production DB:
   ```bash
   DATABASE_URL="<your-direct-connection>" npx prisma migrate deploy
   ```
5. **Add your domain** (optional) and update `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` + the Google redirect URI to match.

That's it — Vercel keeps it running 24/7, no restarts.

---

## 5. First‑run checklist (after deploy)

- [ ] Visit the site → register an account with an email in `SUPER_ADMIN_EMAILS`.
- [ ] Open `/super-admin` (Owner Command Center) — revenue/users start at **0**.
- [ ] Upload a chart on `/analyze` → confirm recognition works (Gemini/OpenAI). If you see "temporarily unavailable", check the vision key is a valid `AIza…` (not `AQ.…`).
- [ ] Test password reset / verification email (Resend or SMTP).
- [ ] If using Google sign‑in, confirm the OAuth redirect URI matches your domain.

---

## 6. Run locally in VS Code (quick)

```bash
git clone https://github.com/Brice-Munji/4Rex-Vision.git
cd 4Rex-Vision
npm install
cp .env.example .env          # then fill in DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY, SUPER_ADMIN_EMAILS…
npx prisma migrate deploy     # or: npm run db:migrate
npm run dev                   # http://localhost:3000
```

Inspect data anytime: `npm run db:studio`.

---

## 7. Alternative hosts

- **Render:** New → Web Service → connect the repo. Build: `npm install && npm run build`. Start: `npm run start`. Add a Render PostgreSQL instance and set `DATABASE_URL`. Add all env vars. Run `prisma migrate deploy` (Render shell or a one‑off job).
- **Railway:** New Project → Deploy from GitHub. Add a PostgreSQL plugin (provides `DATABASE_URL`). Set env vars. Build `npm run build`, start `npm run start`. Run `prisma migrate deploy`.

---

## 8. Security notes

- Never commit `.env` — set secrets in the host dashboard only. No key is ever exposed to the browser (only `NEXT_PUBLIC_*` values are).
- **Rotate any key** that has been shared in plaintext (Gemini/Mistral/NVIDIA, etc.) before going live, then update the value in your host.
- Keep `AUTH_SECRET` stable in production (changing it invalidates all sessions).
