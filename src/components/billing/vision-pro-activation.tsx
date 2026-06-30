"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const unlocks = [
  "Unlimited analyses unlocked.",
  "AI Coach activated.",
  "Trading Journal unlocked.",
  "Economic Intelligence enabled.",
  "Market Monitoring activated.",
  "Priority AI Processing enabled.",
];

export function VisionProActivation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl glass-strong p-8 text-center shadow-2xl"
          >
            {/* glow */}
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-sky-500/30 blur-[80px]" />
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 13, delay: 0.1 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-xl shadow-sky-500/40"
            >
              <Sparkles className="h-10 w-10 text-white" />
            </motion.div>

            <h2 className="mt-6 text-2xl font-bold tracking-tight">
              ✨ Welcome to Vision Pro
            </h2>

            <ul className="mt-6 space-y-2 text-left">
              {unlocks.map((u, i) => (
                <motion.li
                  key={u}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/90">{u}</span>
                </motion.li>
              ))}
            </ul>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + unlocks.length * 0.1 }}
              className="mt-6 text-sm text-muted-foreground"
            >
              Thank you for trusting 4RexVision AI.
            </motion.p>

            <Button className="mt-6 w-full" size="lg" onClick={onClose}>
              Start using Vision Pro
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
