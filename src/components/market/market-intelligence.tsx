"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { computeSessions } from "@/lib/market/sessions";
import { generateInsight } from "@/lib/market/insight";
import type {
  CorrelationsPayload,
  NewsPayload,
  SentimentPayload,
  SessionsPayload,
} from "@/lib/market/types";
import { NewsCard } from "./news-card";
import { SentimentCard } from "./sentiment-card";
import { SessionsCard } from "./sessions-card";
import { CorrelationCard } from "./correlation-card";
import { InsightCard } from "./insight-card";

// Lightweight polling cadences (no websockets for MVP).
const NEWS_MS = 15 * 60 * 1000; // 15 min
const CORRELATIONS_MS = 30 * 60 * 1000; // 30 min
const SENTIMENT_MS = 60 * 1000; // reflects new analyses shortly after completion
const SESSIONS_MS = 30 * 1000; // local recalculation

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/**
 * Small polling hook: fetches immediately, then on an interval. Exposes a
 * `reload` for the per-card retry buttons.
 */
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

  const news = usePoll<NewsPayload>("/api/market/news", NEWS_MS, touch);
  const sentiment = usePoll<SentimentPayload>("/api/market/sentiment", SENTIMENT_MS, touch);
  const correlations = usePoll<CorrelationsPayload>("/api/market/correlations", CORRELATIONS_MS, touch);

  // Sessions are computed locally from the browser clock (UTC-based).
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

  // Rex Insight — derived on the client from live correlation + sentiment data.
  const insight = useMemo(() => {
    if (!correlations.data || !sentiment.data) return null;
    return generateInsight(correlations.data.pairs, sentiment.data.pairs);
  }, [correlations.data, sentiment.data]);

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
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Last updated{" "}
          <span className="font-medium text-foreground" suppressHydrationWarning>
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </span>
        </div>
      </div>

      {/* 2×2 intelligence grid */}
      <motion.div
        variants={grid}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 lg:grid-cols-2"
      >
        <NewsCard data={news.data} loading={news.loading} error={news.error} onRetry={news.reload} />
        <SentimentCard
          data={sentiment.data}
          loading={sentiment.loading}
          error={sentiment.error}
          onRetry={sentiment.reload}
        />
        <SessionsCard data={sessions} />
        <CorrelationCard
          data={correlations.data}
          loading={correlations.loading}
          error={correlations.error}
          onRetry={correlations.reload}
        />
      </motion.div>

      {/* Full-width Rex Insight */}
      <InsightCard insight={insight} />
    </div>
  );
}
