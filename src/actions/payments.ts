"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { REX_PRO } from "@/lib/payments/catalog";
import { resolveProvider } from "@/lib/payments/registry";
import { getPaymentDestination } from "@/lib/payments/recipients";
import { settleByReference } from "@/lib/payments/settle";
import type { PaymentMethodId } from "@/lib/payments/types";

/* -------------------------------------------------------------------------- */
/*                                   Types                                     */
/* -------------------------------------------------------------------------- */

export type StartCheckoutResult =
  | { ok: true; reference: string; mode: "redirect"; redirectUrl: string }
  | { ok: true; reference: string; mode: "inline" }
  | { ok: false; message: string };

export type ConfirmCheckoutResult =
  | { ok: true; status: "success" }
  | { ok: true; status: "pending" }
  | { ok: true; status: "failed" }
  /** Transport/unknown error — surfaced as a friendly retry message. */
  | { ok: false; message: string };

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                    */
/* -------------------------------------------------------------------------- */

/** Derive the request origin behind the sandbox proxy. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * The generic message users ever see on failure. Technical provider errors are
 * logged server-side but never shown to the user.
 */
const FRIENDLY_FAILURE =
  "We couldn't complete your payment. No worries — please try again or choose another payment method.";

/* -------------------------------------------------------------------------- */
/*                              Start checkout                                 */
/* -------------------------------------------------------------------------- */

/**
 * Begin a Rex Pro checkout. Creates a PENDING transaction and asks the resolved
 * provider to initiate payment. Nothing about the subscription changes here —
 * activation only happens after server-side verification succeeds.
 */
export async function startRexProCheckout(
  method: PaymentMethodId,
  phone?: string
): Promise<StartCheckoutResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Please sign in to continue." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, message: "Please sign in to continue." };

  const provider = resolveProvider(method);
  if (!provider) {
    return { ok: false, message: "That payment method isn't available right now." };
  }

  // Resolve the receiving account for this rail from backend config only. The
  // frontend never sends or sees this — the payment is routed to the configured
  // recipient here on the server.
  const destination = getPaymentDestination(method) ?? undefined;

  // Idempotent reference. In demo mode, a test number ending in 0000 forces the
  // failure path so the failed-payment UI can be exercised.
  const isDemo = provider.id === "demo";
  const forceFail = isDemo && !!phone && phone.replace(/\D/g, "").endsWith("0000");
  const reference = `rex-${forceFail ? "fail-" : ""}${randomUUID()}`;

  await prisma.transaction.create({
    data: {
      userId: user.id,
      provider: provider.id,
      method,
      reference,
      status: "PENDING",
      plan: REX_PRO.plan,
      amount: REX_PRO.amount,
      currency: REX_PRO.currency,
      description: `${REX_PRO.name} — monthly subscription`,
      // Record where this payment is routed (audit trail).
      recipient: destination?.account ?? null,
      recipientName: destination?.configured ? destination.ownerName : null,
    },
  });

  const origin = await requestOrigin();
  const result = await provider.initiate({
    reference,
    method,
    amount: REX_PRO.amount,
    currency: REX_PRO.currency,
    description: `${REX_PRO.name} — monthly subscription`,
    redirectUrl: `${origin}/billing?ref=${encodeURIComponent(reference)}`,
    customer: {
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      phone: phone ?? null,
    },
    destination,
  });

  if (!result.ok) {
    await prisma.transaction.update({
      where: { reference },
      data: { status: "FAILED" },
    });
    // Log the real reason; show the user nothing technical.
    console.error(`[payments:${provider.id}] initiate failed:`, result.message);
    return { ok: false, message: FRIENDLY_FAILURE };
  }

  if (result.mode === "redirect") {
    return { ok: true, reference, mode: "redirect", redirectUrl: result.redirectUrl };
  }
  return { ok: true, reference, mode: "inline" };
}

/* -------------------------------------------------------------------------- */
/*                            Confirm & activate                              */
/* -------------------------------------------------------------------------- */

/**
 * Verify a checkout server-side and, only on success, activate Rex Pro. Safe to
 * call repeatedly (idempotent) — the modal polls it while a mobile-money prompt
 * is pending, and the billing page calls it once on provider redirect.
 */
export async function confirmRexProCheckout(
  reference: string
): Promise<ConfirmCheckoutResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Please sign in to continue." };

  // Ownership check before touching the provider.
  const tx = await prisma.transaction.findUnique({ where: { reference } });
  if (!tx || tx.userId !== session.user.id) {
    return { ok: false, message: FRIENDLY_FAILURE };
  }

  const outcome = await settleByReference(reference);

  switch (outcome) {
    case "success":
      revalidatePath("/billing");
      revalidatePath("/dashboard");
      return { ok: true, status: "success" };
    case "pending":
      return { ok: true, status: "pending" };
    case "failed":
      return { ok: true, status: "failed" };
    default:
      return { ok: false, message: FRIENDLY_FAILURE };
  }
}
