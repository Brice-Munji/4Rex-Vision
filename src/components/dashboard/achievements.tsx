"use client";

import { motion } from "framer-motion";
import { Lock, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icon-map";
import { ACHIEVEMENTS } from "@/lib/billing-data";

export function Achievements() {
  return (
    <div className="rounded-3xl glass p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <Award className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Achievements</h2>
          <p className="text-sm text-muted-foreground">
            Milestones earned on your trading journey.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a, i) => {
          const Icon = getIcon(a.icon);
          return (
            <motion.div
              key={a.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={cn(
                "relative flex items-start gap-4 overflow-hidden rounded-2xl border p-4",
                a.unlocked
                  ? "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent"
                  : "border-border/60 bg-card/40"
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  a.unlocked
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {a.unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  {a.unlocked && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                      Earned
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.description}
                </p>
                {!a.unlocked && typeof a.progress === "number" && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${a.progress}%` }}
                      />
                    </div>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {a.progress}% complete
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
