import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validations";
import { resolveRole } from "@/lib/admin/roles";

/**
 * Google OAuth is only registered when credentials are present, so the app
 * (and the Credentials provider) keeps working in environments where Google
 * OAuth hasn't been configured yet. Auth.js v5 reads AUTH_GOOGLE_ID /
 * AUTH_GOOGLE_SECRET by convention; we also accept the GOOGLE_* aliases.
 */
const googleClientId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
export const googleConfigured = Boolean(googleClientId && googleClientSecret);

const googleProviders = googleConfigured
  ? [
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        // Same-email accounts are linked to the existing user instead of
        // erroring with OAuthAccountNotLinked. Safe here because Google has
        // already verified ownership of the email address.
        allowDangerousEmailAccountLinking: true,
        // Map Google's OpenID profile onto our User columns (no `name`/`image`
        // columns exist — the Prisma adapter would reject them). New Google
        // users are email-verified at creation but must complete onboarding, so
        // first-time sign-ups land on /onboarding (the middleware enforces the
        // gate off `onboardingComplete`). This value is only written by the
        // adapter's createUser — i.e. on first-time account creation — so
        // existing Google users keep their stored value and are unaffected.
        profile(profile) {
          return {
            id: profile.sub,
            email: profile.email,
            firstName: profile.given_name ?? null,
            lastName: profile.family_name ?? null,
            avatar: profile.picture ?? null,
            emailVerified: profile.email_verified ? new Date() : null,
            plan: "FREE",
            role: "USER",
            onboardingComplete: false,
          } as any;
        },
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        rememberMe: {},
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
          rememberMe:
            credentials?.rememberMe === "true" ||
            credentials?.rememberMe === true,
        });
        if (!parsed.success) return null;

        const { email, password, rememberMe } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          plan: user.plan,
          role: resolveRole(user.role, user.email),
          emailVerified: user.emailVerified,
          onboardingComplete: user.onboardingComplete,
          rememberMe,
        } as any;
      },
    }),
    ...googleProviders,
  ],
  events: {
    /**
     * After any Google sign-in, guarantee the account is marked verified and
     * refresh presence. This covers the account-linking case where an existing
     * (possibly unverified) credential user links Google: their DB record is
     * verified here — awaited, so it lands before the dashboard renders and the
     * "verify your email" banner never shows for Google users.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user?.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: (user as any).emailVerified ?? new Date(),
          lastActiveAt: new Date(),
        },
      });
    },
  },
});
