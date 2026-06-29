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
    gradient: "from-sky-500 to-cyan-400",
  },
  {
    label: "Ask AI",
    description: "Get market insights on demand",
    href: "/analyze?mode=ask",
    icon: Sparkles,
    gradient: "from-indigo-500 to-sky-500",
  },
  {
    label: "Trading Journal",
    description: "Review and refine your trades",
    href: "/journal",
    icon: BookOpen,
    gradient: "from-amber-500 to-orange-400",
  },
  {
    label: "Analysis History",
    description: "Browse past AI reports",
    href: "/history",
    icon: History,
    gradient: "from-emerald-500 to-cyan-400",
  },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((a, i) => (
        <motion.div
          key={a.label}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href={a.href}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30"
          >
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                a.gradient
              )}
            >
              <a.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold">{a.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              Open
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
