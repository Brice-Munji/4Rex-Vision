"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, BookOpen, History, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRexCoach, CoachLogoMark } from "@/components/dashboard/coach/rex-coach";

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
    description: "Chat with Rex Coach about your activity",
    icon: CoachLogoMark,
    gradient: "bg-primary/10",
    action: "coach" as const,
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
  const coach = useRexCoach();
  const cardClass =
    "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl glass p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((a, i) => {
        const isCoach = a.action === "coach";
        const cardContent = (
          <>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110",
                a.gradient
              )}
            >
              <a.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 flex items-center gap-2 font-semibold">
              {a.label}
              {isCoach && !coach.isPro && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  Pro
                </span>
              )}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              Open
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
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
            {a.action === "coach" ? (
              <button type="button" onClick={coach.open} className={cardClass}>
                {cardContent}
              </button>
            ) : (
              <Link href={a.href!} className={cardClass}>
                {cardContent}
              </Link>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
