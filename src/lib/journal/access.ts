import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Rex Pro is "active" when the plan is a paid tier, the subscription status is
 * live, and (for time-boxed grants) the period hasn't lapsed. Admin lifetime
 * grants have a null period end and stay active.
 */
export function isProActive(user: {
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
}): boolean {
  const paidPlan = user.plan === "PROFESSIONAL" || user.plan === "ENTERPRISE";
  const liveStatus =
    user.subscriptionStatus === "ACTIVE" || user.subscriptionStatus === "TRIALING";
  if (!paidPlan || !liveStatus) return false;
  if (user.currentPeriodEnd && user.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}

export interface JournalAccess {
  user: User;
  /** Full read/write access (active Rex Pro). */
  canEdit: boolean;
  /** Has existing journal data (so an expired Pro can still read it). */
  hasData: boolean;
  /** May view the journal dashboard (active Pro OR has preserved data). */
  canView: boolean;
}

/** Resolve the caller's journal access, or null if not signed in. */
export async function getJournalAccess(): Promise<JournalAccess | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  let user = await prisma.user.findUnique({ where: { id: session.user.id } });
  // Resilient to stale-JWT id drift (same as the admin guard).
  if (!user && session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
    });
  }
  if (!user) return null;

  const canEdit = isProActive(user);
  const hasData = canEdit
    ? true
    : (await prisma.journalEntry.count({ where: { userId: user.id } })) > 0;

  return { user, canEdit, hasData, canView: canEdit || hasData };
}
