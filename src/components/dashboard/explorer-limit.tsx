"use client";

import { motion } from "framer-motion";
import { Zap, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnlockRexProButton } from "@/components/billing/unlock-rex-pro";

interface ExplorerLimitProps {
  used: number;
  limit: number;
  unlimited: boolean;
  /** compact omits the heading/upgrade link (for inline placement). */
  compact?: boolean;
}

export function ExplorerLimit({
  used,
  limit,
  unlimited,
  compact,
}: ExplorerLimitProps) {
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);

  if (unlimited) {
    return (
      <div className={cn("rounded-2xl glass p-5", compact && "p-4")}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          Daily Analyses
        </div>
        <div className="mt-3 flex items-center gap-2">
          <InfinityIcon className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Unlimited</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl glass p-5", compact && "p-4")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          Daily Analyses
        </div>
        <span className="text-sm font-semibold">
          {remaining} <span className="text-muted-foreground">available</span>
        </span>
      </div>

      {/* segmented ■■■□□ indicator */}
      <div className="mt-4 flex gap-2" role="img" aria-label={`${remaining} of ${limit} analyses remaining`}>
        {Array.from({ length: limit }).map((_, i) => {
          const filled = i < remaining;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "h-2.5 flex-1 rounded-full",
                filled
                  ? "bg-primary"
                  : "bg-secondary"
              )}
            />
          );
        })}
      </div>

      {!compact && (
        <div className="mt-4">
          <UnlockRexProButton
            label="Unlock Rex Pro"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs font-medium text-primary hover:bg-transparent hover:text-primary/80"
          />
        </div>
      )}
    </div>
  );
}
