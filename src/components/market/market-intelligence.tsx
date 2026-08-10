"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { computeSessions } from "@/lib/market/sessions";
import { generateLiveInsight } from "@/lib/market/insight";
import type {
  CalendarPayload,
  CorrelationsPayload,
  ForexNewsPayload,
  SentimentPayload,
  SessionsPayload,
} from "@/lib/market/types";
import { LiveCalendarCard } from "./live-calendar-card";
import { ForexNewsCard } from "./forex-news-card";
import { SentimentCard } from "./sentiment-card";
import { SessionsCard } from "./sessions-card";
import { CorrelationCard } from "./correlation-card";
import { InsightCard } from "./insight-card";

// Live polling cadences.
const CALENDAR_MS = 15 * 60 * 1000; // 15 min
const NEWS_MS = 5 * 60 * 1000; // 5 min
const CORRELATIONS_MS = 30 * 60 * 1000; // 30 min
const SENTIMENT_MS = 60 * 1000; // reflects new analyses shortly after completion
const SESSIONS_MS = 30 * 1000; // local recalculation

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const column = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

/** Polling hook: fetch immediately, then on an interval; exposes `reload`. */
function usePoll<T>(url: string, intervalMs: number, onSuccess?: () => void) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: false });
  const savedOnSuccess = useRef(onSuccess);
  savedOnSuccess.current = onSuccess;

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as T;
      setState({ data: json, loading: false, error: false });
      savedOnSuccess.current?.();
    } catch {
      setState((s) => ({ data: s.data, loading: false, error: true }));
    }
  }, [url]);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return { ...state, reload: load };
}

export function MarketIntelligence() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const touch = useCallback(() => setLastUpdated(new Date()), []);

  const calendar = usePoll<CalendarPayload>("/api/market/calendar", CALENDAR_MS, touch);
  const news = usePoll<ForexNewsPayload>("/api/market/news", NEWS_MS, touch);
  const sentiment = usePoll<SentimentPayload>("/api/market/sentiment", SENTIMENT_MS, touch);
  const correlations = usePoll<CorrelationsPayload>("/api/market/correlations", CORRELATIONS_MS, touch);

  // Sessions computed locally from the browser clock (UTC-based).
  const [sessions, setSessions] = useState<SessionsPayload | null>(null);
  useEffect(() => {
    const tick = () => {
      setSessions(computeSessions(new Date()));
      setLastUpdated(new Date());
    };
    tick();
    const id = setInterval(tick, SESSIONS_MS);
    return () => clearInterval(id);
  }, []);

  // Rex Insight — from the live calendar + current session + Rex sentiment.
  const insight = useMemo(() => {
    if (!calendar.data || !sessions) return null;
    return generateLiveInsight(calendar.data.events, sessions, sentiment.data?.pairs ?? []);
  }, [calendar.data, sessions, sentiment.data]);

  const degraded =
    calendar.data?.source === "fallback" || news.data?.source === "fallback";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_28px_-10px_rgba(59,130,246,0.7)]">
            <Radio className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Market Intelligence</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Real-time trading context</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${degraded ? "bg-amber-400" : "bg-emerald-400"}`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${degraded ? "bg-amber-500" : "bg-emerald-500"}`}
            />
          </span>
          {degraded ? "Degraded" : "Live"} · updated{" "}
          <span className="font-medium text-foreground" suppressHydrationWarning>
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </span>
        </div>
      </div>

      {/* Primary 2-column layout */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2"
      >
        {/* LEFT */}
        <motion.div variants={column} className="flex flex-col gap-5">
          <LiveCalendarCard
            data={calendar.data}
            loading={calendar.loading}
            error={calendar.error}
            onRetry={calendar.reload}
          />
          <SessionsCard data={sessions} />
        </motion.div>

        {/* RIGHT */}
        <motion.div variants={column} className="flex flex-col gap-5">
          <ForexNewsCard
            data={news.data}
            loading={news.loading}
            error={news.error}
            onRetry={news.reload}
          />
          <InsightCard insight={insight} />
        </motion.div>
      </motion.div>

      {/* Secondary — Rex analytics (sentiment + correlation) */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rex Analytics
        </h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2"
        >
          <SentimentCard
            data={sentiment.data}
            loading={sentiment.loading}
            error={sentiment.error}
            onRetry={sentiment.reload}
          />
          <CorrelationCard
            data={correlations.data}
            loading={correlations.loading}
            error={correlations.error}
            onRetry={correlations.reload}
          />
        </motion.div>
      </div>
    </div>
  );
}
