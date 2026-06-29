"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Target, CheckCheck, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JOURNAL_STATS } from "@/lib/dashboard-data";

const stats = [
  {
    label: "Win Rate",
    value: `${JOURNAL_STATS.winRate}%`,
    icon: Target,
    accent: "text-emerald-500 bg-emerald-500/10",
  },
  {
    label: "Trades Reviewed",
    value: JOURNAL_STATS.tradesReviewed,
    icon: CheckCheck,
    accent: "text-sky-500 bg-sky-500/10",
  },
  {
    label: "AI Suggestions",
    value: JOURNAL_STATS.aiSuggestions,
    icon: Lightbulb,
    accent: "text-amber-500 bg-amber-500/10",
  },
];

export function JournalPreview() {
  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <BookOpen className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold">Trading Journal</h2>
        </div>
      </div>

      {/* stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center"
          >
            <span
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${s.accent}`}
            >
              <s.icon className="h-4 w-4" />
            </span>
            <div className="mt-2 text-xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* recent notes */}
      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent Notes
        </p>
        <div className="mt-2 space-y-2">
          {JOURNAL_STATS.recentNotes.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3"
            >
              <span className="mt-0.5 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold">
                {n.pair}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-foreground/90">{n.note}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{n.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button variant="secondary" className="mt-5 w-full" asChild>
        <Link href="/journal">
          Open Journal
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
