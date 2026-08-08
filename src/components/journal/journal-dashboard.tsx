"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  TrendingUp, Target, Layers, DoorOpen, Trophy, Clock3, Search,
  Lock, RefreshCw, CheckCircle2, Sparkles, ArrowUpRight, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CloseTradeModal } from "./close-trade-modal";
import {
  RESULT_STYLE, NEWS_STYLE, DIRECTIONS, RESULT_TYPES, TIMEFRAMES, NEWS_RISKS,
  type JournalEntryDTO, type JournalStats,
} from "@/lib/journal/constants";

interface Payload { entries: JournalEntryDTO[]; stats: JournalStats; canEdit: boolean }

const EMPTY_STATS: JournalStats = {
  totalTrades: 0, openTrades: 0, closedTrades: 0, wins: 0, losses: 0,
  winRate: 0, avgR: 0, bestPair: null, bestSession: null, cumulativeR: [],
};

export function JournalDashboard({ initialCanEdit }: { initialCanEdit: boolean }) {
  const [entries, setEntries] = React.useState<JournalEntryDTO[]>([]);
  const [stats, setStats] = React.useState<JournalStats>(EMPTY_STATS);
  const [canEdit, setCanEdit] = React.useState(initialCanEdit);
  const [loading, setLoading] = React.useState(true);
  const [closing, setClosing] = React.useState<JournalEntryDTO | null>(null);
  const [checking, setChecking] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [result, setResult] = React.useState("");
  const [direction, setDirection] = React.useState("");
  const [timeframe, setTimeframe] = React.useState("");
  const [newsRisk, setNewsRisk] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (result) p.set("result", result);
      if (direction) p.set("direction", direction);
      if (timeframe) p.set("timeframe", timeframe);
      if (newsRisk) p.set("newsRisk", newsRisk);
      const res = await fetch(`/api/journal?${p.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: Payload = await res.json();
      setEntries(data.entries);
      setStats(data.stats);
      setCanEdit(data.canEdit);
    } finally {
      setLoading(false);
    }
  }, [search, result, direction, timeframe, newsRisk]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function checkOutcome(id: string) {
    setChecking(id);
    try {
      const res = await fetch(`/api/journal/${id}/check-outcome`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.entry) {
        toast.success("What Happened Next is ready.");
        setEntries((prev) => prev.map((e) => (e.id === id ? data.entry : e)));
      } else {
        toast.error(data.error === "forbidden" ? "Rex Pro required." : "Could not check outcome.");
      }
    } finally {
      setChecking(null);
    }
  }

  const kpis = [
    { icon: TrendingUp, label: "Win Rate", value: `${stats.winRate}%`, sub: `${stats.wins}W · ${stats.losses}L` },
    { icon: Target, label: "Average R", value: `${stats.avgR >= 0 ? "+" : ""}${stats.avgR}R`, sub: "per closed trade", accent: stats.avgR >= 0 ? "text-emerald-400" : "text-rose-400" },
    { icon: Layers, label: "Total Trades", value: String(stats.totalTrades), sub: `${stats.closedTrades} closed` },
    { icon: DoorOpen, label: "Open Trades", value: String(stats.openTrades), sub: "in progress" },
    { icon: Trophy, label: "Best Pair", value: stats.bestPair ?? "—", sub: "by net R" },
    { icon: Clock3, label: "Best Session", value: stats.bestSession ?? "—", sub: "by net R" },
  ];

  const hasFilters = !!(search || result || direction || timeframe || newsRisk);

  return (
    <div className="space-y-6">
      {!canEdit && <ReadOnlyBanner />}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <k.icon className="h-3.5 w-3.5 text-primary" />
              {k.label}
            </div>
            <div className={cn("mt-2 text-2xl font-bold tracking-tight", k.accent)}>{k.value}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Cumulative R chart */}
      <div className="rounded-2xl border border-border bg-card/50 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> Cumulative R
        </div>
        <CumulativeChart data={stats.cumulativeR} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by pair…" className="h-10 w-full rounded-xl border border-input bg-card/50 pl-9 pr-3 text-sm outline-none focus:border-primary/60" />
        </div>
        <Select value={result} onChange={setResult} placeholder="All results" options={RESULT_TYPES} />
        <Select value={direction} onChange={setDirection} placeholder="All directions" options={DIRECTIONS} />
        <Select value={timeframe} onChange={setTimeframe} placeholder="All timeframes" options={[...TIMEFRAMES]} />
        <Select value={newsRisk} onChange={setNewsRisk} placeholder="All news risk" options={NEWS_RISKS} />
      </div>

      {/* Trades */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card/40" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        hasFilters ? (
          <div className="rounded-2xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No trades match your filters.
          </div>
        ) : (
          <EmptyState />
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((e, i) => (
            <TradeCard
              key={e.id}
              entry={e}
              index={i}
              canEdit={canEdit}
              checking={checking === e.id}
              onClose={() => setClosing(e)}
              onCheck={() => checkOutcome(e.id)}
            />
          ))}
        </div>
      )}

      {closing && (
        <CloseTradeModal
          entry={closing}
          onClose={() => setClosing(null)}
          onClosed={(u) => { setEntries((prev) => prev.map((e) => (e.id === u.id ? u : e))); load(); }}
        />
      )}
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────── */

function TradeCard({
  entry, index, canEdit, checking, onClose, onCheck,
}: {
  entry: JournalEntryDTO; index: number; canEdit: boolean; checking: boolean;
  onClose: () => void; onCheck: () => void;
}) {
  const rs = RESULT_STYLE[entry.resultType];
  const isOpen = entry.resultType === "OPEN";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      className="flex flex-col rounded-2xl border border-border bg-card/50 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{entry.pair}</span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", rs.className)}>{rs.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {entry.timeframe && <Tag>{entry.timeframe}</Tag>}
        {entry.direction && <Tag>{entry.direction}</Tag>}
        {entry.newsRisk && (
          <span className={cn("rounded-md border px-1.5 py-0.5", NEWS_STYLE[entry.newsRisk].className)}>{NEWS_STYLE[entry.newsRisk].label}</span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          {entry.resultR != null ? (
            <span className={cn("text-xl font-bold", entry.resultR >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {entry.resultR >= 0 ? "+" : ""}{entry.resultR}R
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Open position</span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">{entry.createdAt.slice(0, 10)}</span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        <Link href={`/journal/${entry.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          {isOpen && canEdit && (
            <button onClick={onClose} className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Close
            </button>
          )}
          {canEdit && (
            <button onClick={onCheck} disabled={checking} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">
              {checking ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Check Outcome
            </button>
          )}
          {!canEdit && <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>
      </div>
    </motion.div>
  );
}

function CumulativeChart({ data }: { data: { date: string; r: number }[] }) {
  if (data.length < 2) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Close a few trades to see your cumulative R curve.</div>;
  }
  const vals = data.map((d) => d.r);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.r - min) / range) * 100;
    return `${x},${y}`;
  });
  const zeroY = 100 - ((0 - min) / range) * 100;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
      <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#1F1F1F" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,100 ${pts.join(" ")} 100,100`} fill="#3B82F6" fillOpacity="0.08" stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke="#3B82F6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-amber-200">
          Your Rex Pro subscription is inactive. Reactivate to continue tracking and analyzing your trades. Your journal data is safe and read-only.
        </p>
      </div>
      <Link href="/billing" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5">
        Reactivate Rex Pro <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border glass p-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BookOpen className="h-7 w-7" />
      </span>
      <div>
        <h3 className="text-lg font-semibold">Your trading story starts here.</h3>
        <p className="mt-1 text-sm text-muted-foreground">Save an analysis to log your first trade and start measuring your edge.</p>
      </div>
      <Link href="/analyze" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
        <CheckCircle2 className="h-4 w-4" /> Save your first analysis
      </Link>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-secondary px-1.5 py-0.5 text-muted-foreground">{children}</span>;
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: readonly string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl border border-input bg-card/50 px-3 text-sm outline-none focus:border-primary/60">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
