"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations";
import {
  createPasswordResetToken,
  createVerificationToken,
  hashToken,
} from "@/lib/tokens";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/mail";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerUser(
  values: unknown
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { ok: false, message: "Please fix the errors below.", fieldErrors };
  }

  const { firstName, lastName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      message: "An account with this email already exists.",
      fieldErrors: { email: "Email already in use" },
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      plan: "FREE",
      subscriptionStatus: "INACTIVE",
    },
  });

  // Fire off email verification (logged to console in dev).
  const token = await createVerificationToken(user.id);
  await sendVerificationEmail(user.email, token);

  return { ok: true, message: "Account created. Check your email to verify." };
}

export async function requestPasswordReset(
  values: unknown
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "Invalid email" },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always succeed to avoid leaking which emails are registered.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token);
  }

  return {
    ok: true,
    message: "If an account exists, a reset link is on its way.",
  };
}

export async function resetPassword(values: unknown): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { ok: false, message: "Please fix the errors below.", fieldErrors };
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record || record.expires < new Date()) {
    return {
      ok: false,
      message: "This reset link is invalid or has expired.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true, message: "Password updated. You can now sign in." };
}
