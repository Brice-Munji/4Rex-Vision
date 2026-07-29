"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanConfig } from "@/lib/plans";
import type { Cycle } from "./billing-cycle-toggle";

interface PricingCardProps {
  plan: PlanConfig;
  cycle: Cycle;
  currentPlan?: boolean;
  /** Render compact (e.g. inside the billing dashboard). */
  onSelect?: (plan: PlanConfig) => void;
  pending?: boolean;
  index?: number;
}

export function PricingCard({
  plan,
  cycle,
  currentPlan,
  onSelect,
  pending,
  index = 0,
}: PricingCardProps) {
  const Icon = plan.icon;
  const price = cycle === "YEARLY" ? plan.yearlyMonthly : plan.monthly;
  const isFree = plan.id === "FREE";
  const isPaidPriced = !isFree && !plan.comingSoon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300",
        plan.highlight
          ? "glass-strong border-primary shadow-sm lg:-mt-4 lg:mb-4"
          : "glass hover:-translate-y-1 hover:border-primary/50"
      )}
    >
      {plan.highlight && (
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl" />
      )}
      {plan.badge && (
        <Badge
          variant={plan.badge === "Most Popular" ? "gradient" : "glass"}
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          {plan.badge === "Most Popular" && <Sparkles className="h-3 w-3" />}
          {plan.badge}
        </Badge>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary",
            plan.accent
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>

      <div className="mt-5 flex items-baseline gap-1">
        {plan.comingSoon ? (
          <span className="text-3xl font-bold tracking-tight">Custom</span>
        ) : (
          <>
            <span className="text-4xl font-bold tracking-tight">${price}</span>
            <span className="text-sm text-muted-foreground">
              {isFree ? "forever" : "/mo"}
            </span>
          </>
        )}
      </div>
      {isPaidPriced && cycle === "YEARLY" && (
        <p className="mt-1 text-xs text-muted-foreground">
          Billed annually · ${price * 12}/yr
        </p>
      )}
      {isPaidPriced && cycle === "MONTHLY" && (
        <p className="mt-1 text-xs text-muted-foreground">Billed monthly</p>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                plan.highlight
                  ? "bg-primary/10 text-primary"
                  : "bg-sky-500/10 text-sky-500"
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/80">{f}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.highlight ? "default" : "secondary"}
        size="lg"
        className="mt-8 w-full"
        disabled={currentPlan || plan.comingSoon || pending}
        onClick={() => onSelect?.(plan)}
      >
        {currentPlan ? "Current plan" : plan.comingSoon ? "Coming Soon" : plan.cta}
      </Button>
    </motion.div>
  );
}
