"use client";

import { motion } from "framer-motion";
import { Rocket, Check } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  description?: string;
  features?: string[];
}

export function ComingSoon({
  title = "Full experience coming soon",
  description = "This module is being prepared for the AI engine. The interface is ready — intelligent features arrive next.",
  features = [],
}: ComingSoonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl glass p-8 text-center sm:p-12"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-48 w-80 -translate-x-1/2 rounded-full bg-sky-500/10 blur-[90px]" />
        <div className="absolute inset-0 bg-grid mask-radial opacity-[0.18]" />
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-xl shadow-sky-500/30"
      >
        <Rocket className="h-8 w-8" />
      </motion.div>

      <h2 className="mt-6 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>

      {features.length > 0 && (
        <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-2">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-sm"
            >
              <Check className="h-4 w-4 shrink-0 text-sky-500" strokeWidth={3} />
              <span className="text-foreground/80">{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
        In active development
      </div>
    </motion.div>
  );
}
