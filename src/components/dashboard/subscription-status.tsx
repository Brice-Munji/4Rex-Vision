"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Infinity as InfinityIcon, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";

const PLAN_LABEL: Record<Plan, string> = {
  FREE: "Rex Explorer",
  PROFESSIONAL: "Rex Pro",
  ENTERPRISE: "Vision Elite",
};

const R = 42;
const CIRC = 2 * Math.PI * R;

function nextUtcMidnight(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1));
}

function fmtShort(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function SubscriptionStatus({
  plan,
  used,
  limit,
  unlimited,
}: {
  plan: Plan;
  used: number;
  limit: number;
  unlimited: boolean;
}) {
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);
  const reached = !unlimited && remaining === 0;
  const fraction = unlimited ? 1 : limit > 0 ? Math.min(1, used / limit) : 0;
  const offset = CIRC * (1 - fraction);

  // Live "resets in" countdown for metered plans.
  const target = React.useMemo(() => nextUtcMidnight(), []);
  const [resetIn, setResetIn] = React.useState(() => target.getTime() - Date.now());
  React.useEffect(() => {
    if (unlimited) return;
    const t = setInterval(() => setResetIn(target.getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [unlimited, target]);

  const ringColor = reached ? "text-amber-500" : "text-primary";

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subscription Status</h3>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            unlimited
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {PLAN_LABEL[plan]}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        {/* Progress ring */}
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="8"
              className="stroke-secondary"
            />
            <motion.circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn("stroke-current", ringColor)}
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {unlimited ? (
              <InfinityIcon className="h-8 w-8 text-primary" />
            ) : (
              <>
                <span className="text-2xl font-bold tabular-nums leading-none">
                  {used}
                  <span className="text-base text-muted-foreground">/{limit}</span>
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  used
                </span>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-3">
          {unlimited ? (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4" />
                Unlimited Analyses
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                No countdown. No limits.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Usage</p>
                <p className="text-sm font-semibold">
                  {used} / {limit}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    reached ? "text-amber-500" : "text-foreground"
                  )}
                >
                  {reached
                    ? "0 Analyses Remaining"
                    : `${remaining} Analysis${remaining === 1 ? "" : "es"}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Resets in{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {fmtShort(resetIn)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
