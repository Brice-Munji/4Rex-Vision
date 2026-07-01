"use client";

import { motion } from "framer-motion";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  ShieldCheck,
  Activity,
  AlignHorizontalDistributeCenter,
  Unlock,
  MoveHorizontal,
  Layers,
  Minimize2,
  type LucideIcon,
} from "lucide-react";
import { RexSection } from "./rex-section";
import type { EvidenceItem } from "@/lib/rex/types";

const EVIDENCE_ICONS: Record<string, LucideIcon> = {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  ShieldCheck,
  Activity,
  AlignHorizontalDistributeCenter,
  Unlock,
  MoveHorizontal,
  Layers,
  Minimize2,
};

export function WhyRexThinks({
  evidence,
  delay,
}: {
  evidence: EvidenceItem[];
  delay?: number;
}) {
  return (
    <RexSection
      sectionNo={6}
      title="Why Rex Thinks This"
      subtitle="Evidence only — every observation is explained."
      icon={<Lightbulb className="h-5 w-5" />}
      delay={delay}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {evidence.map((e, i) => {
          const Icon = EVIDENCE_ICONS[e.icon] ?? Activity;
          return (
            <motion.div
              key={e.key}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-2xl glass p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{e.label}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {e.explanation}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </RexSection>
  );
}
