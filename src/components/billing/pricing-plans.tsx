"use client";

import * as React from "react";
import { BillingCycleToggle, type Cycle } from "./billing-cycle-toggle";
import { PricingCard } from "./pricing-card";
import { PLANS, type PlanConfig } from "@/lib/plans";
import type { Plan } from "@prisma/client";

interface PricingPlansProps {
  currentPlan?: Plan;
  pendingPlanId?: Plan | null;
  defaultCycle?: Cycle;
  onSelect?: (plan: PlanConfig, cycle: Cycle) => void;
  onCycleChange?: (cycle: Cycle) => void;
}

export function PricingPlans({
  currentPlan,
  pendingPlanId,
  defaultCycle = "MONTHLY",
  onSelect,
  onCycleChange,
}: PricingPlansProps) {
  const [cycle, setCycle] = React.useState<Cycle>(defaultCycle);

  function changeCycle(c: Cycle) {
    setCycle(c);
    onCycleChange?.(c);
  }

  return (
    <div>
      <div className="flex justify-center">
        <BillingCycleToggle value={cycle} onChange={changeCycle} />
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl items-stretch gap-6 lg:grid-cols-3">
        {PLANS.map((plan, i) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            index={i}
            currentPlan={currentPlan === plan.id}
            pending={pendingPlanId === plan.id}
            onSelect={(p) => onSelect?.(p, cycle)}
          />
        ))}
      </div>
    </div>
  );
}
