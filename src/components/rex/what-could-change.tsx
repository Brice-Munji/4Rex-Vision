"use client";

import { motion } from "framer-motion";
import { RefreshCcwDot, ArrowRight } from "lucide-react";
import { RexSection } from "./rex-section";
import type { WhatCouldChangeItem } from "@/lib/rex/types";

export function WhatCouldChange({
  items,
  delay,
}: {
  items: WhatCouldChangeItem[];
  delay?: number;
}) {
  if (!items.length) return null;
  return (
    <RexSection
      sectionNo={11}
      title="What Could Change My Mind?"
      subtitle="The signals that would invalidate this read — Rex stays flexible."
      icon={<RefreshCcwDot className="h-5 w-5" />}
      delay={delay}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex items-start gap-3 rounded-2xl glass p-4"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <ArrowRight className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">{item.label}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </RexSection>
  );
}
