"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createVerificationToken, hashToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";
import type { ActionState } from "@/actions/auth";

export async function verifyEmail(token: string): Promise<ActionState> {
  if (!token) return { ok: false, message: "Missing verification token." };

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });

  if (!record || record.expires < new Date()) {
    return { ok: false, message: "This verification link is invalid or expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true, message: "Your email has been verified." };
}

export async function resendVerification(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return { ok: false, message: "Account not found." };
  if (user.emailVerified)
    return { ok: true, message: "Your email is already verified." };

  const token = await createVerificationToken(user.id);
  await sendVerificationEmail(user.email, token);
  return { ok: true, message: "Verification email sent." };
}
