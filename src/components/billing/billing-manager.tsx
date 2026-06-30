"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ArrowDownCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/app/plan-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { PricingPlans } from "./pricing-plans";
import { VisionProActivation } from "./vision-pro-activation";
import { PLAN_BY_ID, type PlanConfig } from "@/lib/plans";
import type { Cycle } from "./billing-cycle-toggle";
import {
  upgradePlan,
  downgradeToExplorer,
  cancelSubscription,
  reactivateSubscription,
} from "@/actions/subscription";
import type { Plan, SubscriptionStatus, BillingCycle } from "@prisma/client";
import { cn } from "@/lib/utils";

interface BillingManagerProps {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-500",
  TRIALING: "bg-sky-500/10 text-sky-500",
  PAST_DUE: "bg-amber-500/10 text-amber-500",
  CANCELED: "bg-rose-500/10 text-rose-500",
  INACTIVE: "bg-secondary text-muted-foreground",
};

export function BillingManager({
  plan,
  subscriptionStatus,
  billingCycle,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: BillingManagerProps) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = React.useTransition();
  const [pendingPlanId, setPendingPlanId] = React.useState<Plan | null>(null);
  const [showActivation, setShowActivation] = React.useState(false);

  const isFree = plan === "FREE";
  const config = PLAN_BY_ID[plan];

  const renewalDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  function refresh(newPlan: Plan) {
    update({ plan: newPlan }).then(() => router.refresh());
  }

  function handleUpgrade(selected: PlanConfig, cycle: Cycle) {
    if (selected.comingSoon || selected.id === "FREE" || selected.id === plan) return;
    setPendingPlanId(selected.id);
    startTransition(async () => {
      const res = await upgradePlan(
        selected.id as Exclude<Plan, "FREE">,
        cycle as BillingCycle
      );
      setPendingPlanId(null);
      if (res.ok) {
        if (selected.id === "PROFESSIONAL") setShowActivation(true);
        else toast.success(res.message ?? "Subscription updated.");
        refresh(selected.id);
      } else {
        toast.error(res.message ?? "Something went wrong.");
      }
    });
  }

  function handleDowngrade() {
    startTransition(async () => {
      const res = await downgradeToExplorer();
      if (res.ok) {
        toast.success(res.message ?? "Downgraded to Explorer.");
        refresh("FREE");
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelSubscription();
      if (res.ok) {
        toast.success(res.message ?? "Subscription will cancel at period end.");
        router.refresh();
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const res = await reactivateSubscription();
      if (res.ok) {
        toast.success(res.message ?? "Subscription reactivated.");
        router.refresh();
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-6">
      <VisionProActivation
        open={showActivation}
        onClose={() => setShowActivation(false)}
      />

      {/* Current plan card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-[80px]" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Current plan</span>
            <div className="mt-1.5 flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{config.name}</h2>
              <PlanBadge plan={plan} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  STATUS_STYLES[subscriptionStatus]
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {subscriptionStatus.charAt(0) + subscriptionStatus.slice(1).toLowerCase().replace("_", " ")}
              </span>
              {billingCycle && (
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {billingCycle === "YEARLY" ? "Yearly billing" : "Monthly billing"}
                </span>
              )}
            </div>
          </div>

          {!isFree && (
            <div className="flex items-center gap-2">
              {cancelAtPeriodEnd ? (
                <Button onClick={handleReactivate} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Reactivate
                </Button>
              ) : (
                <CancelDialog onConfirm={handleCancel} pending={pending} renewalDate={renewalDate} />
              )}
            </div>
          )}
        </div>

        {!isFree && renewalDate && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm">
            <Calendar className="h-4 w-4 text-sky-500" />
            {cancelAtPeriodEnd ? (
              <span className="text-amber-600 dark:text-amber-400">
                Access ends on <span className="font-medium">{renewalDate}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Renews on <span className="font-medium text-foreground">{renewalDate}</span>
              </span>
            )}
          </div>
        )}

        {cancelAtPeriodEnd && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Your subscription is set to cancel. Reactivate anytime before it ends to keep Vision Pro.
          </div>
        )}
      </motion.div>

      {/* Upgrade (free) or manage (paid) */}
      {isFree ? (
        <div className="rounded-3xl glass p-6 sm:p-8">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-500" />
            <h3 className="text-lg font-semibold">Choose your plan</h3>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Upgrade to unlock unlimited analyses and your full AI trading suite.
          </p>
          <PricingPlans
            currentPlan={plan}
            pendingPlanId={pendingPlanId}
            onSelect={handleUpgrade}
          />
        </div>
      ) : (
        <div className="rounded-3xl glass p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold">Manage subscription</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            You have access to every Vision Pro feature.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="secondary" disabled>
              <Sparkles className="h-4 w-4" />
              {billingCycle === "YEARLY" ? "Switch to monthly" : "Switch to yearly"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDowngrade}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
              Downgrade to Explorer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CancelDialog({
  onConfirm,
  pending,
  renewalDate,
}: {
  onConfirm: () => void;
  pending: boolean;
  renewalDate: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Cancel subscription</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Vision Pro?</DialogTitle>
          <DialogDescription>
            You&apos;ll keep full access{renewalDate ? ` until ${renewalDate}` : " until your period ends"}, then return to the Explorer plan. You can reactivate anytime before then.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 rounded-2xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
          You&apos;ll lose: unlimited analyses, AI Coach, AI Replay, Market
          Monitoring, Economic Intelligence and priority processing.
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep Vision Pro</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              onClick={onConfirm}
              disabled={pending}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel subscription
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
