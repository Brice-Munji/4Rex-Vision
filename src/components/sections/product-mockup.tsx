"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Gauge,
  Activity,
  ShieldAlert,
  CalendarClock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

function Sparkline() {
  return (
    <svg viewBox="0 0 320 90" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0 70 L40 60 L70 66 L100 40 L130 50 L160 28 L190 36 L220 18 L260 26 L300 8 L320 14"
        fill="none"
        stroke="rgb(34 211 238)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      <path
        d="M0 70 L40 60 L70 66 L100 40 L130 50 L160 28 L190 36 L220 18 L260 26 L300 8 L320 14 L320 90 L0 90 Z"
        fill="url(#area)"
      />
    </svg>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tracking-tight">{value}</span>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export function ProductMockup() {
  return (
    <div className="relative">
      {/* glow */}
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem]" />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="glass-strong relative rounded-3xl p-4 shadow-2xl shadow-black/20"
      >
        {/* window chrome */}
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-sky-400" />
            Analysis · EUR/USD · 15M
          </div>
        </div>

        {/* chart screenshot */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-foreground/80">Chart Screenshot</div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          </div>
          <div className="mt-3 h-24">
            <Sparkline />
          </div>
        </div>

        {/* metric grid */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat
            icon={TrendingUp}
            label="Bullish Probability"
            value="78%"
            sub="↑ uptrend"
            accent="text-emerald-400"
          />
          <Stat
            icon={Gauge}
            label="Confidence Score"
            value="92"
            sub="/ 100"
            accent="text-sky-400"
          />
        </div>

        {/* detected pattern */}
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-border bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-muted-foreground">Detected Pattern</span>
          </div>
          <span className="text-xs font-semibold text-sky-300">Ascending Triangle</span>
        </div>

        {/* AI analysis */}
        <div className="mt-2.5 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            AI Analysis
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-foreground/70">
            Price is consolidating above key support with rising momentum. A breakout
            above 1.0920 favors continuation toward 1.0985.
          </p>
        </div>

        {/* risk + news */}
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              Risk Assessment
            </div>
            <div className="mt-1.5 text-sm font-semibold text-amber-300">Moderate</div>
            <div className="mt-1 text-[10px] text-muted-foreground">R:R 1 : 2.4</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-rose-400" />
              High Impact News
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300">USD</span>
              CPI · 13:30
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">in 2h 14m</div>
          </div>
        </div>
      </motion.div>

      {/* floating badge */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="glass-strong absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-2xl px-4 py-2.5 shadow-xl sm:flex"
      >
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <div>
          <div className="text-xs font-semibold">Analysis Complete</div>
          <div className="text-[10px] text-muted-foreground">in 1.8 seconds</div>
        </div>
      </motion.div>
    </div>
  );
}
