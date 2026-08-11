"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStatus, SessionsPayload } from "@/lib/market/types";
import { IntelCard, CardHead, CardFooter } from "./card";
import { CardSkeleton } from "./skeletons";

const STATUS_STYLES: Record<SessionStatus, string> = {
  "Peak Volatility": "border-primary/40 bg-primary/15 text-primary",
  Active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Opening Soon": "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Closed: "border-border bg-secondary text-muted-foreground",
};

/** Sessions are computed locally from UTC time — no fetch, so no error state. */
export function SessionsCard({ data }: { data: SessionsPayload | null }) {
  return (
    <IntelCard>
      <CardHead icon={Clock} title="Active Trading Sessions" accent="bg-primary/10 text-primary" />

      {!data ? (
        <CardSkeleton rows={3} />
      ) : (
        <div className="mt-5 space-y-3">
          {data.sessions.map((s) => (
            <div
              key={s.name}
              className={cn(
                "rounded-2xl border p-3 transition-all duration-300",
                s.active
                  ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_28px_-12px_rgba(59,130,246,0.6)]"
                  : "border-border bg-secondary"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {s.active && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      s.active ? "text-foreground" : s.open ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.openUtc}–{s.closeUtc} UTC
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    STATUS_STYLES[s.status]
                  )}
                >
                  {s.status}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.progressPct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    s.active ? "bg-primary" : s.open ? "bg-muted-foreground/40" : "bg-border"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <CardFooter>London overlap increases volatility</CardFooter>
    </IntelCard>
  );
}
