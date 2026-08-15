"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import type { ActionState } from "@/actions/auth";

const SUSPENDED_MESSAGE =
  "This account has been suspended. Please contact support if you think this is a mistake.";

export async function loginUser(values: unknown): Promise<ActionState> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { ok: false, message: "Please fix the errors below.", fieldErrors };
  }

  // Give suspended users a clear message (authorize() also blocks them).
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { suspended: true },
  });
  if (existing?.suspended) {
    return { ok: false, message: SUSPENDED_MESSAGE };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      rememberMe: parsed.data.rememberMe,
      redirect: false,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { ok: false, message: "Invalid email or password." };
      }
      return { ok: false, message: "Something went wrong. Please try again." };
    }
    throw error;
  }
}

export async function logoutUser() {
  // Clear the session only — the client handles navigation so we never emit a
  // server-side redirect that could resolve to an internal localhost origin
  // behind a proxy.
  await signOut({ redirect: false });
}
