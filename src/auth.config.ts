import type { NextAuthConfig } from "next-auth";
import {
  SESSION_MAX_AGE_DEFAULT,
  SESSION_MAX_AGE_REMEMBER,
} from "@/lib/constants";

/**
 * Edge-compatible auth config (no Prisma / Node APIs).
 * Used by middleware and extended by the full config in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_REMEMBER,
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.firstName = (user as any).firstName ?? null;
        token.lastName = (user as any).lastName ?? null;
        token.avatar = (user as any).avatar ?? null;
        token.plan = (user as any).plan ?? "FREE";
        token.emailVerified = (user as any).emailVerified ?? null;
        token.onboardingComplete = (user as any).onboardingComplete ?? false;

        const remember = (user as any).rememberMe !== false;
        const maxAge = remember
          ? SESSION_MAX_AGE_REMEMBER
          : SESSION_MAX_AGE_DEFAULT;
        token.expiresAt = Math.floor(Date.now() / 1000) + maxAge;
      }

      // Enforce the remember-me lifetime: invalidate the token once the
      // computed expiry passes (cookie maxAge is static, this is the real gate).
      if (
        typeof token.expiresAt === "number" &&
        Math.floor(Date.now() / 1000) > token.expiresAt
      ) {
        return null;
      }

      // Allow the client to refresh token claims via `update()`.
      if (trigger === "update" && session) {
        token.firstName = session.firstName ?? token.firstName;
        token.lastName = session.lastName ?? token.lastName;
        token.avatar = session.avatar ?? token.avatar;
        token.plan = session.plan ?? token.plan;
        token.onboardingComplete =
          session.onboardingComplete ?? token.onboardingComplete;
        token.emailVerified = session.emailVerified ?? token.emailVerified;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.firstName = (token.firstName as string | null) ?? null;
        session.user.lastName = (token.lastName as string | null) ?? null;
        session.user.avatar = (token.avatar as string | null) ?? null;
        session.user.plan = (token.plan as any) ?? "FREE";
        session.user.emailVerified =
          (token.emailVerified as Date | null) ?? null;
        session.user.onboardingComplete =
          (token.onboardingComplete as boolean) ?? false;
        session.user.name =
          [token.firstName, token.lastName].filter(Boolean).join(" ") ||
          session.user.email ||
          null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
