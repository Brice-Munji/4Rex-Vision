"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, Upload, ScanSearch } from "lucide-react";
import { DashSectionHeader } from "./section-header";
import { DirectionBadge } from "./direction-badge";
import { EmptyState } from "./empty-state";
import { RECENT_ANALYSES, type AnalysisItem } from "@/lib/dashboard-data";

export function RecentAnalyses({
  items = RECENT_ANALYSES,
}: {
  items?: AnalysisItem[];
}) {
  return (
    <div>
      <DashSectionHeader
        title="Recent Analyses"
        description="Your latest AI-generated chart reports."
        action={{ label: "View all", href: "/history" }}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<ScanSearch className="h-8 w-8" />}
          title="No analyses yet."
          description="Upload your first chart and let AI uncover what others might miss."
          action={{
            label: "Upload Screenshot",
            href: "/analyze",
            icon: <Upload className="h-4 w-4" />,
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link
                href="/history"
                className="group flex h-full flex-col rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">{a.pair}</span>
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {a.timeframe}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <DirectionBadge direction={a.direction} />
                  <span className="text-lg font-bold tracking-tight">
                    {a.confidence}%
                  </span>
                </div>

                {/* confidence bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${a.confidence}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {a.timeAgo}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-500">
                    View Report
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
