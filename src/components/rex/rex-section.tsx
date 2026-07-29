"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RexSectionProps {
  sectionNo?: number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** A consistent, progressively-revealed report section wrapper. */
export function RexSection({
  sectionNo,
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  delay = 0,
}: RexSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("scroll-mt-24", className)}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </span>
          )}
          <div>
            {sectionNo !== undefined && (
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Section {sectionNo}
              </span>
            )}
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}
