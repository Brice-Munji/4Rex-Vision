"use client";

import { motion } from "framer-motion";
import {
  Gauge,
  CalendarClock,
  Clock,
  Cpu,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MARKET_SENTIMENT,
  HIGH_IMPACT_EVENTS,
  SESSIONS,
  MOST_ACTIVE_SESSION,
  type MarketSentiment,
} from "@/lib/dashboard-data";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={item}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function CardHead({
  icon: Icon,
  label,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </div>
  );
}

const sentimentMeta: Record<
  MarketSentiment,
  { color: string; icon: React.ElementType; bar: string }
> = {
  Bullish: { color: "text-emerald-500", icon: TrendingUp, bar: "from-emerald-500 to-emerald-400" },
  Neutral: { color: "text-amber-500", icon: Minus, bar: "from-amber-500 to-amber-400" },
  Bearish: { color: "text-rose-500", icon: TrendingDown, bar: "from-rose-500 to-rose-400" },
};

export function MarketOverview() {
  const sm = sentimentMeta[MARKET_SENTIMENT.value];
  const SmIcon = sm.icon;
  const currencyCounts = HIGH_IMPACT_EVENTS.reduce<Record<string, number>>(
    (acc, e) => ({ ...acc, [e.currency]: (acc[e.currency] ?? 0) + 1 }),
    {}
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* 1 — Market sentiment */}
      <Card>
        <CardHead icon={Gauge} label="Market Sentiment" accent="bg-sky-500/10 text-sky-500" />
        <div className="mt-4 flex items-center gap-2">
          <SmIcon className={cn("h-6 w-6", sm.color)} />
          <span className={cn("text-2xl font-bold", sm.color)}>
            {MARKET_SENTIMENT.value}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
          <div className="relative mt-1.5 h-2 rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${MARKET_SENTIMENT.score}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("h-full rounded-full bg-gradient-to-r", sm.bar)}
            />
          </div>
        </div>
      </Card>

      {/* 2 — High impact events */}
      <Card>
        <CardHead
          icon={CalendarClock}
          label="Today's High Impact"
          accent="bg-rose-500/10 text-rose-500"
        />
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold">{HIGH_IMPACT_EVENTS.length}</span>
          <span className="text-sm text-muted-foreground">events</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(currencyCounts).map(([cur, count]) => (
            <span
              key={cur}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/40 px-2 py-1 text-[11px] font-semibold"
            >
              <span className="text-rose-400">{cur}</span>
              <span className="text-muted-foreground">×{count}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* 3 — Most active session */}
      <Card>
        <CardHead icon={Clock} label="Most Active Session" accent="bg-indigo-500/10 text-indigo-400" />
        <div className="mt-4 text-2xl font-bold">{MOST_ACTIVE_SESSION}</div>
        <div className="mt-3 space-y-1.5">
          {SESSIONS.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-14 shrink-0 text-[11px]",
                  s.active ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {s.name}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.volumePct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    s.active
                      ? "bg-gradient-to-r from-sky-500 to-cyan-400"
                      : "bg-muted-foreground/30"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4 — AI status */}
      <Card>
        <CardHead icon={Cpu} label="AI Status" accent="bg-emerald-500/10 text-emerald-500" />
        <div className="mt-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-2xl font-bold text-emerald-500">Online</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          All systems operational. Ready to analyze your charts.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Ready
        </div>
      </Card>
    </motion.div>
  );
}
