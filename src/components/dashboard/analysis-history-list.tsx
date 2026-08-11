"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Upload, ScanSearch, RefreshCw } from "lucide-react";
import { DashSectionHeader } from "./section-header";
import { DirectionBadge } from "./direction-badge";
import { EmptyState } from "./empty-state";
import type { Direction } from "@/lib/dashboard-data";
import type { HistoryRecord } from "@/lib/rex/history";

const REFRESH_MS = 12_000;

function normalizeDirection(d: string | null): Direction {
  return d === "Bullish" || d === "Bearish" || d === "Neutral" ? d : "Neutral";
}

/** Deterministic absolute timestamp (UTC) — identical on server & client. */
function exactTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function HistoryCard({ record, index }: { record: HistoryRecord; index: number }) {
  // Relative time is computed client-side only (post-mount) to stay
  // hydration-safe; the exact UTC timestamp renders identically on both sides.
  const [rel, setRel] = React.useState<string | null>(null);
  React.useEffect(() => {
    setRel(relativeTime(record.createdAt));
    const id = setInterval(() => setRel(relativeTime(record.createdAt)), 30_000);
    return () => clearInterval(id);
  }, [record.createdAt]);

  const direction = normalizeDirection(record.direction);
  const confidence = record.confidence ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl glass transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
    >
      {record.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={record.imageUrl}
          alt={`${record.pair ?? "Chart"} analysis`}
          className="h-32 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-secondary/50">
          <ScanSearch className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{record.pair ?? "Unknown pair"}</span>
          {record.timeframe && (
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {record.timeframe}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <DirectionBadge direction={direction} />
          <span className="text-lg font-bold tracking-tight">{confidence}%</span>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>

        {(record.headline || record.summary) && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
            {record.headline || record.summary}
          </p>
        )}

        <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground/70">{exactTime(record.createdAt)}</span>
          {rel && <span className="text-muted-foreground/70">· {rel}</span>}
        </div>
      </div>
    </motion.div>
  );
}

export function AnalysisHistoryList({ initial }: { initial: HistoryRecord[] }) {
  const [records, setRecords] = React.useState<HistoryRecord[]>(initial);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/history", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { records: HistoryRecord[] };
      if (Array.isArray(data.records)) setRecords(data.records);
    } catch {
      // keep last-known list on transient errors
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-update: on mount, on an interval, and whenever the tab regains focus
  // (so a freshly-completed analysis appears the moment you open this page).
  React.useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    const onFocus = () => load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <div>
      <DashSectionHeader
        title="Recent Analyses"
        description="Your latest AI-generated chart reports — updates automatically."
        action={{ label: "Analyze a chart", href: "/analyze" }}
      />

      {records.length === 0 ? (
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
        <>
          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {records.length} {records.length === 1 ? "analysis" : "analyses"} · live
          </div>
          <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {records.map((r, i) => (
                <HistoryCard key={r.id} record={r} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
