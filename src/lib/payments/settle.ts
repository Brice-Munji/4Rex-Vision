import "server-only";
import { prisma } from "@/lib/prisma";
import { getProviderById } from "./registry";
import type { PaymentOutcome } from "./types";

export type SettleOutcome = PaymentOutcome | "error";

/** Add one calendar month to `from` (subscription period). */
function addMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Verify a transaction with its provider and, on success, activate the plan.
 *
 * This is the SINGLE source of truth for turning a subscription on. It is
 * idempotent and auth-agnostic, so it can be driven both by the user-facing
 * confirm action (with ownership checks around it) and by provider webhooks.
 * A plan is never activated without a verified `success` from the provider.
 */
export async function settleByReference(reference: string): Promise<SettleOutcome> {
  const tx = await prisma.transaction.findUnique({ where: { reference } });
  if (!tx) return "error";
  if (tx.status === "SUCCESS") return "success";

  const provider = getProviderById(tx.provider);
  if (!provider) return "error";

  const verified = await provider.verify(reference, tx.providerReference ?? undefined);
  if (!verified.ok) {
    console.error(`[payments:${tx.provider}] verify error:`, verified.message);
    return "error";
  }

  if (verified.status === "pending") return "pending";

  if (verified.status === "failed") {
    await prisma.transaction.update({
      where: { reference },
      data: { status: "FAILED", providerReference: verified.providerReference },
    });
    return "failed";
  }

  // SUCCESS — activate the subscription (only place a paid plan is switched on).
  const now = new Date();
  await prisma.$transaction([
    prisma.transaction.update({
      where: { reference },
      data: { status: "SUCCESS", providerReference: verified.providerReference },
    }),
    prisma.user.update({
      where: { id: tx.userId },
      data: {
        plan: tx.plan,
        subscriptionStatus: "ACTIVE",
        billingCycle: "MONTHLY",
        subscriptionStart: now,
        currentPeriodEnd: addMonth(now),
        cancelAtPeriodEnd: false,
        paymentProvider: tx.provider,
        transactionReference: reference,
      },
    }),
  ]);

  return "success";
}
