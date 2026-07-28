"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { YEARLY_DISCOUNT_PCT } from "@/lib/plans";

export type Cycle = "MONTHLY" | "YEARLY";

export function BillingCycleToggle({
  value,
  onChange,
}: {
  value: Cycle;
  onChange: (cycle: Cycle) => void;
}) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative inline-flex rounded-full glass p-1">
        {(["MONTHLY", "YEARLY"] as const).map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={cn(
                "relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
                active ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="cycle-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {c === "MONTHLY" ? "Monthly" : "Yearly"}
            </button>
          );
        })}
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
        Save {YEARLY_DISCOUNT_PCT}%
      </span>
    </div>
  );
}
