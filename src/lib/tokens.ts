import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const VERIFICATION_TTL = 1000 * 60 * 60 * 24; // 24h
const RESET_TTL = 1000 * 60 * 60; // 1h

/** Hash a raw token before persisting it (never store raw tokens). */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function rawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createVerificationToken(userId: string) {
  await prisma.verificationToken.deleteMany({ where: { userId } });
  const raw = rawToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      token: hashToken(raw),
      expires: new Date(Date.now() + VERIFICATION_TTL),
    },
  });
  return raw;
}

export async function createPasswordResetToken(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  const raw = rawToken();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      token: hashToken(raw),
      expires: new Date(Date.now() + RESET_TTL),
    },
  });
  return raw;
}
