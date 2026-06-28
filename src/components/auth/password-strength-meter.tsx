"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, color, checks } = getPasswordStrength(password);
  const show = password.length > 0;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="pt-2">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: i <= score ? "100%" : "0%" }}
                    transition={{ duration: 0.3 }}
                    className={cn("h-full rounded-full", i <= score ? color : "")}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Password strength
              </span>
              <span className="text-xs font-medium">{label}</span>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    c.passed ? "text-emerald-500" : "text-muted-foreground"
                  )}
                >
                  {c.passed ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <X className="h-3 w-3" strokeWidth={3} />
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
