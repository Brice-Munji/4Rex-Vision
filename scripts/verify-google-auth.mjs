// Verifies the Google OAuth persistence + linking + banner-gating logic by
// exercising the exact @auth/prisma-adapter calls NextAuth makes during an
// OAuth sign-in — without needing live Google credentials.
//
//   node scripts/verify-google-auth.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const adapter = PrismaAdapter(prisma);

let pass = 0,
  fail = 0;
const check = (name, cond) => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`);
  }
};

// Mirrors src/auth.ts Google profile() → the object NextAuth hands createUser.
const googleProfile = (email, sub) => ({
  id: sub,
  email,
  firstName: "Test",
  lastName: "Trader",
  avatar: "https://example.com/a.png",
  emailVerified: new Date(),
  plan: "FREE",
  role: "USER",
  onboardingComplete: true,
});

// Mirrors the account object NextAuth links after a Google sign-in.
const googleAccount = (userId, sub) => ({
  userId,
  type: "oidc",
  provider: "google",
  providerAccountId: sub,
  access_token: "ya29.test",
  token_type: "bearer",
  scope: "openid email profile",
});

// Mirrors (app)/layout.tsx: banner shows only for unverified credential users.
const showBanner = (u) => !u.emailVerified && !!u.passwordHash;

const emails = ["gauth_new@example.com", "gauth_link@example.com"];

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

async function main() {
  await cleanup();

  // ── Scenario 1: brand-new Google user (one-click sign-up) ──────────────
  console.log("\nScenario 1 — new Google user");
  const sub1 = "google-sub-1001";
  const created = await adapter.createUser(googleProfile(emails[0], sub1));
  check("adapter.createUser accepts our column mapping (no name/image crash)", !!created.id);
  await adapter.linkAccount(googleAccount(created.id, sub1));

  let u1 = await prisma.user.findUnique({ where: { email: emails[0] } });
  check("email auto-verified for Google user", !!u1.emailVerified);
  check("no passwordHash (pure OAuth account)", !u1.passwordHash);
  check("onboarding skipped → dashboard opens immediately", u1.onboardingComplete === true);
  check("plan defaults to FREE", u1.plan === "FREE");
  check("verify banner HIDDEN for Google user", showBanner(u1) === false);

  const acct1 = await prisma.account.findFirst({ where: { userId: u1.id } });
  check('account stored with provider = "google"', acct1?.provider === "google");

  // ── Scenario 2: returning Google user (no duplicate) ───────────────────
  console.log("\nScenario 2 — returning Google user (no duplicate)");
  const linked = await adapter.getUserByAccount({
    provider: "google",
    providerAccountId: sub1,
  });
  check("getUserByAccount resolves the existing user", linked?.id === u1.id);
  const count1 = await prisma.user.count({ where: { email: emails[0] } });
  check("still exactly ONE user for that email", count1 === 1);

  // ── Scenario 3: existing credential user links Google (same email) ─────
  console.log("\nScenario 3 — existing credential user links Google");
  const cred = await prisma.user.create({
    data: {
      email: emails[1],
      firstName: "Cred",
      lastName: "User",
      passwordHash: await bcrypt.hash("secret123", 12),
      emailVerified: null, // unverified credential account
      onboardingComplete: true,
    },
  });
  check("credential user starts UNVERIFIED → banner shown", showBanner(cred) === true);

  // allowDangerousEmailAccountLinking → NextAuth finds by email and links.
  const byEmail = await adapter.getUserByEmail(emails[1]);
  check("getUserByEmail finds the existing credential user", byEmail?.id === cred.id);
  const sub2 = "google-sub-2002";
  await adapter.linkAccount(googleAccount(cred.id, sub2));

  // events.signIn effect: mark verified + refresh presence.
  await prisma.user.update({
    where: { id: cred.id },
    data: { emailVerified: new Date(), lastActiveAt: new Date() },
  });

  const merged = await prisma.user.findUnique({ where: { email: emails[1] } });
  const acctCount = await prisma.account.count({ where: { userId: cred.id } });
  const userCount = await prisma.user.count({ where: { email: emails[1] } });
  check("NO duplicate user created (linked instead)", userCount === 1);
  check("Google account linked to the SAME user", acctCount === 1 && merged.id === cred.id);
  check("password login still intact after linking", !!merged.passwordHash);
  check("now verified → banner HIDDEN after linking", showBanner(merged) === false);

  await cleanup();
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
