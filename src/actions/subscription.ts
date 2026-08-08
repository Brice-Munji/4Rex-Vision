"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PLAN_DAILY_LIMITS } from "@/lib/constants";
import type { ActionState } from "@/actions/auth";
import type { BillingCycle, Plan } from "@prisma/client";

function periodEnd(cycle: BillingCycle): Date {
  const d = new Date();
  if (cycle === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Upgrade to a paid plan. In production this would redirect to Stripe Checkout;
 * while Stripe is unconfigured we activate the subscription directly (simulated).
 */
export async function upgradePlan(
  plan: Exclude<Plan, "FREE">,
  cycle: BillingCycle = "MONTHLY"
): Promise<ActionState & { checkoutUrl?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  // (Stripe wiring point — see src/lib/stripe.ts. Falls through to simulated.)
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      plan,
      subscriptionStatus: "ACTIVE",
      billingCycle: cycle,
      currentPeriodEnd: periodEnd(cycle),
      cancelAtPeriodEnd: false,
    },
  });

  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { ok: true, message: "Subscription activated." };
}

/** Downgrade back to the free Explorer plan. */
export async function downgradeToExplorer(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      plan: "FREE",
      subscriptionStatus: "INACTIVE",
      billingCycle: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });

  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { ok: true, message: "You're back on Explorer." };
}

/** Schedule cancellation at the end of the current period. */
export async function cancelSubscription(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { cancelAtPeriodEnd: true },
  });

  revalidatePath("/billing");
  return { ok: true, message: "Subscription will cancel at period end." };
}

/** Reactivate a subscription that was scheduled to cancel. */
export async function reactivateSubscription(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { cancelAtPeriodEnd: false, subscriptionStatus: "ACTIVE" },
  });

  revalidatePath("/billing");
  return { ok: true, message: "Subscription reactivated." };
}

export interface RecordAnalysisResult {
  ok: boolean;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  reachedLimit: boolean;
}

const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Active while under 24h since the last analysis (rolling window). */
function usageWindowActive(windowStart: Date): boolean {
  return Date.now() - windowStart.getTime() < USAGE_WINDOW_MS;
}

/**
 * Record a completed analysis against the daily allowance. Prepares the
 * Explorer 3/day logic — AI itself is still not implemented. For unlimited
 * plans this is a no-op counter that never blocks.
 */
export async function recordAnalysis(): Promise<RecordAnalysisResult> {
  const session = await auth();
  const empty = {
    ok: false,
    used: 0,
    limit: 0,
    remaining: 0,
    unlimited: false,
    reachedLimit: false,
  };
  if (!session?.user?.id) return empty;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return empty;

  const limit = PLAN_DAILY_LIMITS[user.plan];
  const unlimited = !Number.isFinite(limit);

  // Rolling 24h window — continue if active, else start fresh.
  const active = usageWindowActive(new Date(user.analysisCountDate));
  const current = active ? user.dailyAnalysisCount : 0;
  const next = current + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: { dailyAnalysisCount: next, analysisCountDate: new Date() },
  });

  revalidatePath("/dashboard");

  if (unlimited) {
    return { ok: true, used: next, limit: Infinity, remaining: Infinity, unlimited: true, reachedLimit: false };
  }

  return {
    ok: true,
    used: next,
    limit,
    remaining: Math.max(0, limit - next),
    unlimited: false,
    reachedLimit: next >= limit,
  };
}
