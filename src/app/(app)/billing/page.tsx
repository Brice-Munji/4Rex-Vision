import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { BillingManager } from "@/components/billing/billing-manager";
import { ActivePaymentMethod } from "@/components/billing/active-payment-method";
import { BillingAddressCard } from "@/components/billing/payment-method-card";
import {
  SubscriptionHistory,
  type TransactionRow,
} from "@/components/billing/subscription-history";
import { BillingActivity } from "@/components/billing/billing-activity";
import type { PaymentMethodId } from "@/lib/payments/types";

export const metadata: Metadata = {
  title: "Subscription & Billing · 4RexVision",
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const history: TransactionRow[] = transactions.map((t) => ({
    id: t.id,
    reference: t.reference,
    method: t.method,
    provider: t.provider,
    status: t.status,
    amount: t.amount,
    currency: t.currency,
    description: t.description,
    date: t.createdAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));

  // The rail backing the current subscription = latest successful payment.
  const activeMethod =
    (transactions.find((t) => t.status === "SUCCESS")?.method as
      | PaymentMethodId
      | undefined) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<CreditCard className="h-5 w-5" />}
        title="Subscription & Billing"
        description="Manage your plan, payment method and subscription history."
      />

      <BillingManager
        plan={user.plan}
        subscriptionStatus={user.subscriptionStatus}
        billingCycle={user.billingCycle}
        subscriptionStart={
          user.subscriptionStart ? user.subscriptionStart.toISOString() : null
        }
        currentPeriodEnd={
          user.currentPeriodEnd ? user.currentPeriodEnd.toISOString() : null
        }
        cancelAtPeriodEnd={user.cancelAtPeriodEnd}
        paymentMethod={activeMethod}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivePaymentMethod method={activeMethod} />
        <BillingAddressCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionHistory items={history} />
        <BillingActivity />
      </div>
    </div>
  );
}
