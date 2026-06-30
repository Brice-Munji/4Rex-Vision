import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { PageHeader } from "@/components/dashboard/page-header";
import { BillingManager } from "@/components/billing/billing-manager";
import { BillingHistory } from "@/components/billing/billing-history";
import {
  PaymentMethodCard,
  BillingAddressCard,
} from "@/components/billing/payment-method-card";
import { BillingActivity } from "@/components/billing/billing-activity";

export const metadata: Metadata = {
  title: "Subscription & Billing · 4RexVision AI",
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isPaid = user.plan !== "FREE";

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<CreditCard className="h-5 w-5" />}
        title="Subscription & Billing"
        description="Manage your plan, payment method and invoices."
      />

      <BillingManager
        plan={user.plan}
        subscriptionStatus={user.subscriptionStatus}
        billingCycle={user.billingCycle}
        currentPeriodEnd={
          user.currentPeriodEnd ? user.currentPeriodEnd.toISOString() : null
        }
        cancelAtPeriodEnd={user.cancelAtPeriodEnd}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PaymentMethodCard hasMethod={isPaid} />
        <BillingAddressCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BillingHistory hasHistory={isPaid} />
        <BillingActivity />
      </div>
    </div>
  );
}
