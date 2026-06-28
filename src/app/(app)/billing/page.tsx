import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { PLAN_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/app/plan-badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Billing · 4RexVision AI",
};

const plans = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "/mo",
    features: ["3 AI analyses per day", "Basic analysis", "History", "Community support"],
  },
  {
    key: "PROFESSIONAL",
    name: "Professional",
    price: "$29",
    period: "/mo",
    featured: true,
    features: [
      "Unlimited analyses",
      "Advanced AI",
      "Unlimited history",
      "Priority processing",
      "Trading journal",
      "Economic intelligence",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Custom AI", "Unlimited users", "API access", "Dedicated support"],
  },
];

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & plans</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription. Payments arrive in a later release.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-3xl glass p-6">
        <div>
          <p className="text-sm text-muted-foreground">Current plan</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xl font-semibold">{PLAN_LABELS[user.plan]}</span>
            <PlanBadge plan={user.plan} />
          </div>
        </div>
        <Sparkles className="h-8 w-8 text-sky-400/60" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.key === user.plan;
          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-3xl p-6",
                plan.featured ? "glass-strong border-sky-500/40" : "glass"
              )}
            >
              {plan.featured && (
                <Badge
                  variant="gradient"
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                >
                  Most Popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" strokeWidth={3} />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.featured ? "default" : "secondary"}
                className="mt-6 w-full"
                disabled={current}
              >
                {current ? "Current plan" : plan.key === "ENTERPRISE" ? "Contact sales" : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
