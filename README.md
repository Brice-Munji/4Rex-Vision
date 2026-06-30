# 4RexVision AI

**See Beyond the Charts.**

A premium marketing website and reusable UI system for 4RexVision AI — a fintech product that transforms trading chart screenshots into intelligent, AI-powered market analysis.

> This codebase now includes the public marketing site, a complete
> authentication + onboarding + profile system, **and** the authenticated
> **AI Trading Command Center** dashboard. Actual AI analysis and live market
> data are intentionally still out of scope — the dashboard is a polished,
> reusable interface wired with realistic placeholder data, ready for the AI
> engine to plug in.

## Trading Command Center (Dashboard)

A premium authenticated experience under the `(app)` route group:

- **Responsive app shell** (`src/components/dashboard/shell/`): collapsible
  desktop sidebar (persisted), sticky top nav with time-aware greeting, live
  date, global search, notifications menu, theme toggle and user dropdown;
  mobile sidebar drawer + bottom navigation; animated page transitions.
- **Command center** (`/dashboard`): welcome hero with remaining-analyses
  widget, market-overview cards (sentiment, high-impact events, active session,
  AI status), quick actions, the **AI Workspace** (drag-&-drop upload with a
  premium 7-step analysis sequence — interface only), recent analyses, a
  rotating **AI insights** panel, notification cards and a journal preview.
- **Section pages**: `/analyze`, `/journal`, `/history`, `/market`, `/help`
  built from the same reusable components, with elegant empty/coming-soon
  states. All dashboard data lives in `src/lib/dashboard-data.ts` for easy
  replacement with real queries later.

No existing components, pages, branding, colors or animations were redesigned —
the dashboard purely extends the app.

## Subscription, Billing & Growth

The experience of unlocking a professional AI trading partner — Stripe-ready,
running in simulated mode until keys are configured.

- **Plans** (`src/lib/plans.ts`): Explorer (Free), Vision Pro, Vision Elite
  (Coming Soon) — a single source of truth for names, pricing, features,
  comparison matrix and premium/locked features.
- **Public pricing page** (`/pricing`): monthly/yearly toggle with animated
  savings badge, Most Popular badge, animated feature comparison table,
  testimonials, enterprise contact and FAQ.
- **Billing dashboard** (`/billing`): current plan & status, renewal date,
  upgrade/downgrade, cancel & reactivate (with confirmation), payment method,
  billing address, invoices/billing history and billing activity.
- **AI Growth** (`/growth`): usage analytics, AI-growth progress rings,
  trading-discipline score (strengths / needs-work), and professional
  achievement badges.
- **Explorer daily limit**: an animated segmented indicator (■■■□□) that updates
  live. On the third analysis the user sees a premium **End-of-Day Trading
  Summary** (animated stat cards, AI recap, progress-vs-yesterday and a
  "Continue Your Momentum" upgrade) instead of a hard paywall.
- **Vision Pro activation**: a celebratory success animation listing everything
  unlocked.
- **Locked feature cards**: aspirational premium teasers throughout the
  dashboard.
- **Data layer**: `User` gains Stripe-ready fields (`billingCycle`,
  `currentPeriodEnd`, `cancelAtPeriodEnd`, `stripeCustomerId`,
  `stripeSubscriptionId`). Server actions in `src/actions/subscription.ts`
  handle upgrade/downgrade/cancel/reactivate and per-day usage. A Stripe
  scaffold (`src/lib/stripe.ts`, server-only) and webhook route
  (`/api/stripe/webhook`) are prepared — no secret keys are exposed.

Reusable building blocks: `PlanBadge`, `PricingCard`/`PricingPlans`,
`BillingCycleToggle`, `FeatureComparison`, `StatCard`, `ProgressRing`/`ProgressBar`,
`LockedFeatureCard`, `ExplorerLimit`, `BillingManager`, billing/usage/achievement
cards. Payments still run in simulated mode (no live charges).

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** (with custom design tokens)
- **shadcn/ui**-style primitives (Radix UI)
- **Lucide** icons
- **Framer Motion** animations
- **next-themes** (dark mode default + light toggle)
- **Prisma** + **PostgreSQL** (data layer)
- **Auth.js / NextAuth v5** (credentials auth, JWT sessions)
- **bcryptjs** (password hashing), **zod** (validation), **sonner** (toasts)

## Authentication & Onboarding

- Email + password **sign up / login / logout** with hashed passwords (bcrypt)
- **Email verification** and **forgot / reset password** (tokens hashed at rest,
  links logged to the server console in dev — swap `src/lib/mail.ts` for a real
  provider in production)
- **Remember me** (30-day vs 1-day session lifetime, enforced in the JWT)
- **Protected routes** + onboarding gating via `src/middleware.ts`
- Premium **6-step onboarding** (welcome → experience → style → pairs → theme →
  success) that personalizes the workspace
- Logged-in **header** with avatar, name, plan badge and dropdown
  (Dashboard / Profile / Billing / Settings / Logout)
- Full **profile management**: personal info & avatar, trading preferences,
  theme, password change, and account deletion
- **Free plan logic**: every account starts Free with 3 analyses/day, tracked in
  the DB and reset per UTC day (`src/lib/usage.ts`) — AI is not wired up yet

## Database Setup

Requires a PostgreSQL database. Copy `.env.example` to `.env` and set
`DATABASE_URL` and `AUTH_SECRET` (`openssl rand -base64 32`), then:

```bash
npm run db:migrate   # apply schema / create tables
npm run db:studio    # optional: browse data
```

The Prisma schema lives in `prisma/schema.prisma` (User, Account, Session,
VerificationToken, PasswordResetToken).

## Design System

- Dark mode by default with an optional light mode toggle
- Glassmorphism cards, `xl` rounded corners, blue/cyan gradient accents
- Animated reveal-on-scroll, staggered entrances and floating product mockup
- Fully responsive, accessible and keyboard-friendly

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve production build
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, fonts, ThemeProvider, metadata
│   ├── page.tsx            # Landing page composition
│   └── globals.css         # Tokens, utilities (glass, gradients, grid)
├── components/
│   ├── ui/                 # Reusable primitives (button, card, badge, accordion, reveal)
│   ├── layout/             # Navbar + Footer
│   ├── sections/           # Hero, HowItWorks, Features, Pricing, FAQ, CTA, mockup
│   ├── logo.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
└── lib/
    └── utils.ts            # cn() helper
```

## Landing Page Sections

1. Sticky glass navigation with mobile menu + theme toggle
2. Hero with animated product mockup (chart vision, probabilities, risk, news)
3. How It Works — 3 steps
4. Features — 8 premium feature cards
5. Pricing — Free / Professional (Most Popular) / Enterprise
6. FAQ — 10 professional questions
7. Footer — Company, Resources, Legal, social links, newsletter
