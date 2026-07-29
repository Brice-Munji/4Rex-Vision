import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validations";

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
          emailVerified: user.emailVerified,
          onboardingComplete: user.onboardingComplete,
          rememberMe,
        } as any;
      },
    }),
  ],
});
