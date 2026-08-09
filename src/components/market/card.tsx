"use client";

import { motion } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

/**
 * Premium intelligence-card shell: 24px radius, true-black surface, subtle hover
 * elevation, and an optional soft blue glow for "active" cards.
 */
export function IntelCard({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <motion.section
      variants={cardVariants}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[24px] border p-5 sm:p-6",
        "border-[#1F1F1F] bg-[#111111] transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]",
        glow &&
          "border-primary/40 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_48px_-12px_rgba(59,130,246,0.55)]",
        className
      )}
    >
      {children}
    </motion.section>
  );
}

export function CardHead({
  icon: Icon,
  title,
  accent = "bg-primary/10 text-primary",
  right,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-[#F5F5F5]">{title}</h3>
      </div>
      {right}
    </div>
  );
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-auto pt-4 text-[11px] font-medium text-[#A3A3A3]">{children}</p>
  );
}

/** Non-destructive error state: keeps the card intact and offers a retry. */
export function CardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
        <AlertCircle className="h-5 w-5" />
      </span>
      <p className="text-xs text-[#A3A3A3]">Couldn&apos;t load this data.</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] transition-colors hover:border-primary/40 hover:text-primary"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}
