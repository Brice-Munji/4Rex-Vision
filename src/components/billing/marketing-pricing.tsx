"use client";

import { useRouter } from "next/navigation";
import { PricingPlans } from "./pricing-plans";
import type { PlanConfig } from "@/lib/plans";

export function MarketingPricing() {
  const router = useRouter();

  function handleSelect(plan: PlanConfig) {
    if (plan.comingSoon) return;
    // Marketing context: send visitors into sign-up (they manage billing in-app).
    router.push(plan.id === "FREE" ? "/register" : "/register?intent=pro");
  }

  return <PricingPlans onSelect={handleSelect} />;
}
