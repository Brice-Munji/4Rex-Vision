"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Sparkles, BookOpen, History, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "Upload Screenshot",
    description: "Analyze a chart instantly",
    href: "/analyze",
    icon: Upload,
    gradient: "bg-primary/10 text-primary",
  },
  {
    label: "Ask AI",
    description: "Get market insights on demand",
    href: "/analyze?mode=ask",
    icon: Sparkles,
    gradient: "bg-primary/10 text-primary",
    disabled: true,
  },
  {
    label: "Trading Journal",
    description: "Review and refine your trades",
    href: "/journal",
    icon: BookOpen,
    gradient: "bg-amber-500/10 text-amber-400",
  },
  {
    label: "Analysis History",
    description: "Browse past AI reports",
    href: "/history",
    icon: History,
    gradient: "bg-emerald-500/10 text-emerald-400",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((a, i) => {
        const cardContent = (
          <>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-300",
                a.gradient,
                !a.disabled && "group-hover:scale-110"
              )}
            >
              <a.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 flex items-center gap-2 font-semibold">
              {a.label}
              {a.disabled && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Soon
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
            {!a.disabled && (
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </>
        );

        return (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            {a.disabled ? (
              <div
                aria-disabled="true"
                title="Coming soon"
                className="group relative flex h-full cursor-not-allowed flex-col overflow-hidden rounded-2xl glass p-5 opacity-60"
              >
                {cardContent}
              </div>
            ) : (
              <Link
                href={a.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
              >
                {cardContent}
              </Link>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
