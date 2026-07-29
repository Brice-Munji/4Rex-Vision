"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icon-map";
import { useCountUp } from "@/hooks/use-count-up";

export interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: string;
  accent: string;
  delta?: string;
  /** When the value is numeric, animate a count-up. */
  countUp?: boolean;
  decimals?: number;
  className?: string;
  index?: number;
}

export function StatCard({
  label,
  value,
  suffix,
  icon,
  accent,
  delta,
  countUp = true,
  decimals = 0,
  className,
  index = 0,
}: StatCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = getIcon(icon);

  const numeric = typeof value === "number";
  const counted = useCountUp(numeric ? (value as number) : 0, inView, 1000, decimals);
  const display = numeric && countUp ? counted : value;

  const deltaPositive = delta?.trim().startsWith("+");

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-border",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accent)}>
          <Icon className="h-5 w-5" />
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              deltaPositive
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-rose-500/10 text-rose-500"
            )}
          >
            {deltaPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta.replace(/^\+/, "")}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">{display}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}
