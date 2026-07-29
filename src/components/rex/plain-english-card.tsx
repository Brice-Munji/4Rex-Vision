"use client";

import { motion } from "framer-motion";
import { Languages, ArrowRight } from "lucide-react";
import { RexSection } from "./rex-section";
import { ExplainThis } from "./explain-this";
import type { PlainEnglishItem } from "@/lib/rex/types";

export function PlainEnglishCard({
  items,
  delay,
}: {
  items: PlainEnglishItem[];
  delay?: number;
}) {
  return (
    <RexSection
      sectionNo={8}
      title="Plain English Translator"
      subtitle="Every technical conclusion, in language anyone can act on."
      icon={<Languages className="h-5 w-5" />}
      delay={delay}
    >
      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="overflow-hidden rounded-3xl glass"
          >
            <div className="grid gap-0 md:grid-cols-2">
              {/* technical */}
              <div className="border-b border-border/60 p-5 md:border-b-0 md:border-r">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Technical
                </span>
                <p className="mt-3 text-sm font-medium text-foreground/90">
                  {item.technical}
                </p>
              </div>

              {/* plain english */}
              <div className="relative bg-sky-500/[0.04] p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-500">
                  Plain English
                </span>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {item.plain}
                </p>
                {item.concept && (
                  <div className="mt-3">
                    <ExplainThis concept={item.concept} />
                  </div>
                )}
                <ArrowRight className="pointer-events-none absolute -left-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-background p-1 text-sky-500 md:block" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </RexSection>
  );
}
