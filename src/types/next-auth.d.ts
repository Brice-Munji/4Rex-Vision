import { Plan, Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      plan: Plan;
      role: Role;
      emailVerified: Date | null;
      onboardingComplete: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    plan?: Plan;
    role?: Role;
    emailVerified?: Date | null;
    onboardingComplete?: boolean;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    plan?: Plan;
    role?: Role;
    emailVerified?: Date | null;
    onboardingComplete?: boolean;
    expiresAt?: number;
  }
}
