"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRESS_COMPARISON } from "@/lib/billing-data";

export function ProgressComparison() {
  return (
    <div className="allow-anim grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PROGRESS_COMPARISON.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: i * 0.07 }}
          className="rounded-2xl glass p-5"
        >
          <p className="text-sm text-muted-foreground">{s.label}</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-bold tracking-tight">{s.today}</span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                s.positive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              )}
            >
              {s.positive ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {s.delta}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Yesterday <span className="font-medium text-foreground/70">{s.yesterday}</span>
          </p>
        </motion.div>
      ))}
    </div>
  );
}
