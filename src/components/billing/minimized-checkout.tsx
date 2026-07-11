"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutStep } from "./rex-pro-checkout";

/**
 * Floating widget shown when the checkout is minimized. Lets the user keep
 * navigating the app and resume exactly where they left off — no progress lost.
 */
export function MinimizedCheckout({
  open,
  step,
  onResume,
  onDismiss,
}: {
  open: boolean;
  step: CheckoutStep;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const processing = step === "processing";
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="fixed bottom-4 right-4 z-[75] w-[min(340px,calc(100vw-2rem))]"
        >
          <div className="relative overflow-hidden rounded-2xl p-4 shadow-2xl shadow-black/50 ring-1 ring-white/10 glass-strong">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-500/20 blur-2xl" />

            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-md shadow-sky-500/30">
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </span>
              {processing ? "Payment in progress" : "Payment Ready"}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {processing
                ? "We're confirming your Rex Pro payment."
                : "Continue your Rex Pro upgrade."}
            </p>

            <Button
              size="sm"
              className="mt-3 w-full rounded-xl"
              onClick={onResume}
            >
              Resume Checkout
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
