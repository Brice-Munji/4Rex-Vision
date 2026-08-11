import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProActive } from "@/lib/journal/access";
import type { User } from "@prisma/client";

export interface MarketAccess {
  user: User;
  /** Active Rex Pro — full Market Intelligence access. */
  isPro: boolean;
}

/**
 * Resolve the caller's Market Intelligence access, or null if not signed in.
 * Market Intelligence is a Rex Pro feature; non-Pro users get a blurred preview.
 * Resilient to stale-JWT id drift (mirrors the journal/admin guards).
 */
export async function getMarketAccess(): Promise<MarketAccess | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  let user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user && session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
    });
  }
  if (!user) return null;

  return { user, isPro: isProActive(user) };
}
