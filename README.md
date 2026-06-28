# 4RexVision AI

**See Beyond the Charts.**

A premium marketing website and reusable UI system for 4RexVision AI — a fintech product that transforms trading chart screenshots into intelligent, AI-powered market analysis.

> This codebase now includes the public marketing site **and** a complete
> authentication + onboarding + profile system. The trading dashboard and AI
> analysis features are intentionally still out of scope (the Free-plan
> usage logic is prepared but no AI runs yet).

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
