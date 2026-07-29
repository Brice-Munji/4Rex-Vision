"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";

export function ClosingNote({ note, delay }: { note: string; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl glass-strong p-6 text-center sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full" />
      </div>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ShieldCheck className="h-6 w-6" />
      </span>
      <h3 className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Rex&apos;s Closing Note
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-pretty text-base leading-relaxed text-foreground/90">
        {note}
      </p>
    </motion.section>
  );
}
