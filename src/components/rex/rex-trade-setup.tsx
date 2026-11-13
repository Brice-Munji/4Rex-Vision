"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/lib/toast";
import {
  Sparkles,
  Crown,
  Lock,
  X,
  Loader2,
  Check,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Crosshair,
  Ban,
  ArrowUpRight,
  BookOpen,
  Gauge,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RexReport as RexReportType } from "@/lib/rex/types";
import type { Plan } from "@prisma/client";
import {
  SETUP_DISCLAIMER,
  NEWS_BLOCK_WINDOW_MIN,
  type SetupBias,
  type SetupNewsRisk,
  type SetupQuality,
  type TradeSetupInput,
  type TradeSetupResult,
  type DirectionalSetup,
  type NeutralSetup,
} from "@/lib/rex/trade-setup";
import {
  computePositionSize,
  DEFAULT_RISK_PERCENT,
  type PositionSizeResult,
} from "@/lib/rex/position-size";
import { hasLowerTimeframeAvailable } from "@/lib/rex/sniper-entry";

/**
 * Presentation-only status label over the EXISTING TradeSetupResult.kind —
 * no new APA/setup logic, just a clearer READY / WAITING / NO SETUP framing
 * for the scalping results UI.
 */
function setupStatusLabel(kind: TradeSetupResult["kind"]): "READY" | "WAITING" | "NO SETUP" {
  if (kind === "directional") return "READY";
  if (kind === "neutral") return "WAITING";
  return "NO SETUP"; // "none" | "blocked"
}
const STATUS_META: Record<"READY" | "WAITING" | "NO SETUP", string> = {
  READY: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  WAITING: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  "NO SETUP": "border-[#2a2a2a] bg-[#161616] text-[#A3A3A3]",
};

/* Fixed premium dark palette — the modal is always a dark trading surface,
   independent of the app's light/dark theme (matches Save to Smart Journal). */
const PANEL = "bg-[#111111] border border-[#1F1F1F]";
const TEXT = "text-[#F5F5F5]";
const MUTED = "text-[#A3A3A3]";

function buildInput(report: RexReportType): TradeSetupInput {
  return {
    pair: report.analysisContext?.instrument ?? report.pair,
    timeframe: report.timeframe,
    bias: report.bias?.bias ?? null,
    confidence: report.overallConfidence ?? null,
    currentPrice: report.currentPrice ?? null,
    priceLevels: (report.priceLevels ?? []).map((l) => ({ type: l.type, value: l.value })),
    economicImpacts: (report.economic ?? []).map((e) => e.impact),
    // Titles + impacts drive the high-impact-news BLOCK (never direction/zones).
    economicEvents: (report.economic ?? []).map((e) => ({ title: e.title, impact: e.impact })),
    // APA structure signals — the setup is derived from these, not from news.
    trend: report.trend
      ? { direction: report.trend.direction, strength: report.trend.strength }
      : null,
    evidence: (report.evidence ?? []).map((e) => ({
      key: e.key,
      label: e.label,
      explanation: e.explanation,
    })),
    // 1M scalping support — the user's own recent higher-timeframe bias for
    // this pair, when the analysis found one. Context only; absent (null) is
    // expected and handled on most analyses (only ever populated for M1).
    higherTimeframeContext: report.higherTimeframeContext
      ? {
          timeframe: report.higherTimeframeContext.timeframe,
          bias: report.higherTimeframeContext.bias,
        }
      : null,
  };
}

/* ── Post-analysis CTA card ────────────────────────────────────────────────── */

export function RexTradeSetupCard({
  report,
  plan,
  onSetupGenerated,
}: {
  report: RexReportType;
  plan?: Plan;
  /** Fired with the generated setup so the parent (e.g. PDF export) can use it. */
  onSetupGenerated?: (setup: TradeSetupResult) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isPro = plan === "PROFESSIONAL" || plan === "ENTERPRISE";
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_28px_-8px_rgba(59,130,246,0.7)]">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-foreground">Rex Trade Setup</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  <Crown className="h-3 w-3" /> Pro
                </span>
              </div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Turn this analysis into structured trade-planning zones — entry, invalidation, targets,
                R:R and setup quality.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5",
              isPro
                ? "bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_rgba(59,130,246,0.6)]"
                : "border border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {isPro ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            Generate Rex Trade Setup
            {!isPro && <span className="text-[10px] font-bold">(PRO)</span>}
          </button>
        </div>
      </motion.div>

      {isPro ? (
        <SetupModal open={open} report={report} onClose={close} onSetupGenerated={onSetupGenerated} />
      ) : (
        <UpgradeModal open={open} onClose={close} />
      )}
    </>
  );
}

/* ── Generate + display modal (Pro) ────────────────────────────────────────── */

function SetupModal({
  open,
  report,
  onClose,
  onSetupGenerated,
}: {
  open: boolean;
  report: RexReportType;
  onClose: () => void;
  onSetupGenerated?: (setup: TradeSetupResult) => void;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<
    | { status: "idle" | "loading" }
    | { status: "error"; code?: number; message: string }
    | { status: "done"; result: TradeSetupResult }
  >({ status: "idle" });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  // Captured the moment a directional result lands — Sniper Entry's own
  // expiry check is measured from here, never from a server-persisted
  // timestamp (no such record exists; the setup only lives in this state).
  const [generatedAtIso, setGeneratedAtIso] = React.useState<string | null>(null);

  // Generate once per open.
  React.useEffect(() => {
    if (!open) {
      setState({ status: "idle" });
      setSaved(false);
      setGeneratedAtIso(null);
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/rex/trade-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildInput(report)),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          // Surface a meaningful reason instead of a vague failure. A 403 means
          // the subscription isn't active (the gate is preserved server-side).
          const message =
            res.status === 403
              ? "Your Rex Pro isn't active — reactivate Rex Pro to generate trade setups."
              : res.status === 401
                ? "Your session has expired. Please sign in again."
                : res.status === 429
                  ? "You're generating setups too quickly. Please wait a moment and try again."
                  : "Rex couldn't generate the setup just now. Please try again.";
          if (!cancelled) setState({ status: "error", code: res.status, message });
          return;
        }

        const result = data?.setup as TradeSetupResult | undefined;
        if (!result || typeof result.kind !== "string") {
          if (!cancelled)
            setState({
              status: "error",
              message: "Rex returned an unexpected response. Please try again.",
            });
          return;
        }
        if (!cancelled) {
          setState({ status: "done", result });
          setGeneratedAtIso(new Date().toISOString());
          onSetupGenerated?.(result);
        }
      } catch {
        if (!cancelled)
          setState({
            status: "error",
            message: "Couldn't reach Rex. Check your connection and try again.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, report]);

  const setup = state.status === "done" ? state.result : null;
  const directional = setup && setup.kind === "directional" ? setup : null;

  async function saveToJournal() {
    if (!directional) return;
    setSaving(true);
    try {
      const note = [
        `Rex Trade Setup (APA) — ${directional.setupType}`,
        `Quality ${directional.qualityScore}/100 (${directional.qualityLabel}) · R:R ${directional.riskReward} (TP1) / ${directional.riskReward2} (TP2)`,
        `Entry zone: ${directional.entryZone} (pullbacks/retests into this zone are normal)`,
        `Stop Loss / Invalidation (structural): ${directional.invalidationZone}`,
        `TP1 — ${directional.target1Label}: ${directional.target1}`,
        `TP2 — ${directional.target2Label}: ${directional.target2}`,
        `Confluence: ${directional.confluence.join(", ") || "—"}`,
        "",
        `Lower-timeframe confirmation:`,
        ...directional.lowerTimeframeConfirmation.map((c) => `• ${c}`),
        "",
        directional.invalidationExplainer,
        `News risk (warning only): ${directional.newsRisk}`,
        "",
        SETUP_DISCLAIMER,
      ].join("\n");

      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: report.id ?? null, // links the original analysis + chart screenshot
          pair: report.analysisContext?.instrument ?? report.pair,
          timeframe: report.timeframe,
          direction: directional.bias,
          confidence: report.overallConfidence ?? null,
          entryPrice: directional.entryMid,
          stopLoss: directional.invalidationMid,
          takeProfit: directional.target1Mid,
          traderNote: note,
          tags: ["Rex Setup", `Setup ${directional.quality}`],
          emotions: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.entry) {
        setSaved(true);
        toast.success("Trade setup saved to Smart Journal", {
          position: "top-right",
          description: `${report.pair} · ${directional.bias} · ${directional.quality}`,
        });
        router.refresh();
      } else if (data.error === "forbidden") {
        toast.error("Your Rex Pro is inactive — reactivate to save.");
      } else {
        toast.error("Could not save to journal.");
      }
    } catch {
      toast.error("Could not save to journal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="rex-setup-title" busy={saving}>
      <ModalHeader
        title="Rex Trade Setup"
        subtitle="Advanced Price Action trade-planning zones, aligned to your analysis bias."
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
        {state.status === "loading" && <SetupSkeleton />}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <p className="max-w-sm text-sm text-[#A3A3A3]">{state.message}</p>
            {state.code === 403 && (
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f74e6]"
              >
                Reactivate Rex Pro <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {setup && (
          <span
            className={cn(
              "mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
              STATUS_META[setupStatusLabel(setup.kind)]
            )}
          >
            {setupStatusLabel(setup.kind)}
          </span>
        )}

        {setup && setup.kind === "blocked" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <p className="max-w-sm text-base font-bold text-[#F5F5F5]">{setup.reason}</p>
              <p className="max-w-sm text-sm text-[#A3A3A3]">{setup.newsStatus}</p>
              <p className="max-w-sm text-xs text-[#7A7A7A]">
                Rex won&apos;t create a new setup within {NEWS_BLOCK_WINDOW_MIN} minutes of a
                high-impact event, or predict its reaction. Previously saved setups stay in your
                Smart Journal — Rex resumes generating once the event has passed.
              </p>
            </div>
          </div>
        )}

        {setup && setup.kind === "none" && (
          <div className="space-y-4">
            <NewsWarning level={setup.newsRisk} />
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
                <Ban className="h-5 w-5" />
              </span>
              <p className="max-w-sm text-sm font-medium text-[#F5F5F5]">{setup.reason}</p>
            </div>
          </div>
        )}

        {setup && setup.kind === "neutral" && <NeutralBody setup={setup} />}
        {setup && setup.kind === "directional" && (
          <>
            <DirectionalBody setup={setup} pair={report.analysisContext?.instrument ?? report.pair} />
            {generatedAtIso && (
              <div className="mt-5">
                <SniperEntryPanel
                  pair={report.analysisContext?.instrument ?? report.pair}
                  timeframe={report.timeframe}
                  bias={setup.bias}
                  entryZone={setup.entryZone}
                  invalidationMid={setup.invalidationMid}
                  generatedAtIso={generatedAtIso}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-[#1F1F1F] px-6 py-4 sm:px-7">
        <p className="text-[11px] leading-relaxed text-[#A3A3A3]">{SETUP_DISCLAIMER}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#1F1F1F] bg-[#111111] px-5 text-sm font-semibold text-[#A3A3A3] transition-colors hover:text-[#F5F5F5]"
          >
            Close
          </button>
          {directional && (
            <button
              type="button"
              onClick={saveToJournal}
              disabled={saving || saved}
              className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.6)] transition-colors hover:bg-[#2f74e6] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              {saved ? "Saved to Journal" : "Save to Smart Journal"}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Setup body ────────────────────────────────────────────────────────────── */

const BIAS_META: Record<SetupBias, { text: string; icon: React.ElementType; label: string }> = {
  Bullish: { text: "text-emerald-400", icon: TrendingUp, label: "Bullish bias" },
  Bearish: { text: "text-rose-400", icon: TrendingDown, label: "Bearish bias" },
  Neutral: { text: "text-amber-400", icon: Minus, label: "Neutral bias" },
};

const QUALITY_META: Record<SetupQuality, string> = {
  "A+": "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  A: "border-primary/40 bg-primary/15 text-[#8fbaff]",
  B: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  C: "border-[#2a2a2a] bg-[#161616] text-[#A3A3A3]",
};

const NEWS_META: Record<SetupNewsRisk, string> = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

const NEWS_MESSAGE: Record<SetupNewsRisk, string> = {
  High: "Major economic event approaching — expect volatility. This is a risk warning only; it does not change the technical setup.",
  Medium: "Medium-impact news is on the calendar. Warning only — the APA setup is unchanged.",
  Low: "No high-impact news nearby. The setup is driven purely by price-action structure.",
};

/** News is a RISK WARNING only — never a reason to trade or a direction driver. */
function NewsWarning({ level }: { level: SetupNewsRisk }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl border px-4 py-3", NEWS_META[level])}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wide">News {level}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#A3A3A3]">{NEWS_MESSAGE[level]}</p>
      </div>
    </div>
  );
}

function DirectionalBody({ setup, pair }: { setup: DirectionalSetup; pair: string }) {
  const bias = BIAS_META[setup.bias];
  const BiasIcon = bias.icon;
  return (
    <div className="space-y-5">
      {/* News is a warning only — shown first, never affects the setup below */}
      <NewsWarning level={setup.newsRisk} />

      {/* Top badges (no news here — direction/quality come from APA only) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-[#1F1F1F] bg-[#111111] px-3 py-1 text-sm font-semibold", bias.text)}>
          <BiasIcon className="h-4 w-4" />
          {setup.bias} setup
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold", QUALITY_META[setup.quality])}>
          Quality {setup.qualityScore}/100 · {setup.qualityLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1F1F1F] bg-[#111111] px-3 py-1 text-sm font-semibold text-[#F5F5F5]">
          <Gauge className="h-4 w-4 text-primary" /> R:R {setup.riskReward} · TP2 {setup.riskReward2}
        </span>
      </div>

      {/* Setup type + news status */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-[#A3A3A3]">{setup.setupType}</p>
        <p className="text-xs text-[#7A7A7A]">News: {setup.newsStatus}</p>
        {setup.estimatedHoldingHorizon && (
          <p className="text-xs text-[#7A7A7A]">{setup.estimatedHoldingHorizon}</p>
        )}
      </div>

      {/* Zones */}
      <div className="space-y-2.5">
        <ZoneRow
          icon={Crosshair}
          accent="text-primary"
          label="Entry zone"
          value={setup.entryZone}
          hint="Pullbacks & retests into this zone are normal"
        />
        <ZoneRow
          icon={Ban}
          accent="text-rose-400"
          label="Stop Loss / Invalidation"
          value={setup.invalidationZone}
          hint="Structural — not an exact stop-loss"
        />
        <ZoneRow
          icon={Target}
          accent="text-emerald-400"
          label="TP1"
          value={setup.target1}
          hint={setup.target1Label}
        />
        <ZoneRow
          icon={Target}
          accent="text-emerald-400"
          label="TP2"
          value={setup.target2}
          hint={setup.target2Label}
        />
      </div>

      {/* Entry-freshness caveat — only when the anti-chase check couldn't run
          (chart's current price wasn't readable). Never silently presented as
          a fully execution-validated entry in that case. */}
      {!setup.anticChaseChecked && setup.entryFreshnessWarning && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-300">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{setup.entryFreshnessWarning}</span>
        </div>
      )}

      {/* Structural-invalidation + trade-management framing (educational, no buy/sell) */}
      <div className={cn("space-y-2 rounded-2xl p-4", PANEL)}>
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[#F5F5F5]">
          <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          <span>{setup.invalidationExplainer}</span>
        </p>
        <p className="text-[12px] leading-relaxed text-[#A3A3A3]">{setup.managementNote}</p>
      </div>

      {/* Lower-timeframe confirmation for scalping — conditions to watch, not signals */}
      {setup.lowerTimeframeConfirmation.length > 0 && (
        <div className={cn("rounded-2xl p-4", PANEL)}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Lower-timeframe confirmation (scalping)
          </p>
          <ul className="mt-2 space-y-1.5">
            {setup.lowerTimeframeConfirmation.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#F5F5F5]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1M scalping support — higher-timeframe context (available or not) */}
      {setup.higherTimeframeNote && (
        <div className={cn("rounded-2xl p-4", PANEL)}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
            Higher-timeframe context
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#F5F5F5]">
            {setup.higherTimeframeNote}
          </p>
        </div>
      )}

      {/* APA confluence the grade is built on */}
      {setup.confluence.length > 0 && (
        <div className={cn("rounded-2xl p-4", PANEL)}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
            APA confluence
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {setup.confluence.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-full border border-[#1F1F1F] bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-[#8fbaff]"
              >
                <Check className="h-3 w-3" /> {f}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[#A3A3A3]">{setup.rationale}</p>
        </div>
      )}

      {/* Account risk — position sizing against THIS setup's own validated
          entry/invalidation. User-supplied balance/risk % only; never
          invented. */}
      <PositionSizeCalculator pair={pair} entryMid={setup.entryMid} invalidationMid={setup.invalidationMid} />
    </div>
  );
}

/** Account-risk position sizing for the current validated setup. Balance and
 *  risk % are user inputs only (default 0.5% risk) — never chart data. */
function PositionSizeCalculator({
  pair,
  entryMid,
  invalidationMid,
}: {
  pair: string;
  entryMid: number;
  invalidationMid: number;
}) {
  const [balance, setBalance] = React.useState("");
  const [riskPercent, setRiskPercent] = React.useState(String(DEFAULT_RISK_PERCENT));

  const result: PositionSizeResult | null = React.useMemo(() => {
    const bal = parseFloat(balance);
    const risk = parseFloat(riskPercent);
    if (!isFinite(bal) || bal <= 0) return null;
    return computePositionSize({
      pair,
      accountBalance: bal,
      riskPercent: isFinite(risk) ? risk : undefined,
      entryPrice: entryMid,
      invalidationPrice: invalidationMid,
    });
  }, [pair, balance, riskPercent, entryMid, invalidationMid]);

  return (
    <div className={cn("space-y-3 rounded-2xl p-4", PANEL)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
        Account risk — position size
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#7A7A7A]">Account balance</span>
          <input
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 10000"
            className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-2.5 py-2 text-sm text-[#F5F5F5] outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-[#7A7A7A]">Risk % per trade</span>
          <input
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-2.5 py-2 text-sm text-[#F5F5F5] outline-none focus:border-primary/60"
          />
        </label>
      </div>
      {result && (
        <div className="text-[12px] leading-relaxed">
          {result.ok ? (
            <>
              <p className="font-semibold text-[#F5F5F5]">
                {result.lots.toFixed(2)} lots · risking ${result.riskAmount.toFixed(2)} ({result.stopPips.toFixed(1)} pips stop)
              </p>
              <p className="mt-1 text-[#7A7A7A]">{result.note}</p>
            </>
          ) : (
            <p className="text-amber-400/90">{result.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Rex Sniper Entry — optional lower-timeframe EXECUTION CONFIRMATION ────
 * An ADDITIONAL confirmation layer on top of the setup above — it never
 * changes the entry/invalidation/targets/bias/R:R/quality shown above (this
 * panel only ever renders its OWN separate result below itself; it never
 * writes back into the setup state). Local duplicate of rex-analyzer.tsx's
 * tiny fileToBase64 helper (not exported there) to keep this feature fully
 * self-contained. */
function sniperFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

type SniperApiResult =
  | { state: "WAITING"; reason: string }
  | { state: "CONFIRMED"; reason: string; evidence: string[] }
  | { state: "INVALIDATED"; reason: string };

const SNIPER_STATUS_META: Record<SniperApiResult["state"], string> = {
  WAITING: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  CONFIRMED: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
  INVALIDATED: "border-rose-500/40 bg-rose-500/15 text-rose-400",
};

function SniperEntryPanel({
  pair,
  timeframe,
  bias,
  entryZone,
  invalidationMid,
  generatedAtIso,
}: {
  pair: string;
  timeframe: string;
  bias: "Bullish" | "Bearish";
  entryZone: string;
  invalidationMid: number;
  generatedAtIso: string;
}) {
  const [state, setState] = React.useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; result: SniperApiResult }
  >({ status: "idle" });
  const inputRef = React.useRef<HTMLInputElement>(null);

  // An M1-originated setup has no genuinely lower timeframe to confirm with
  // in this app's supported set — don't offer the panel at all.
  if (!hasLowerTimeframeAvailable(timeframe)) return null;

  async function onFile(file: File) {
    setState({ status: "loading" });
    try {
      const base64 = await sniperFileToBase64(file);
      const res = await fetch("/api/rex/sniper-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          original: { pair, timeframe, bias, entryZone, invalidationMid, generatedAtIso },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          res.status === 429
            ? "You're checking Sniper Entry too quickly. Please wait a moment and try again."
            : res.status === 403
              ? "Your Rex Pro isn't active — reactivate Rex Pro to use Sniper Entry."
              : res.status === 401
                ? "Your session has expired. Please sign in again."
                : "Rex couldn't check Sniper Entry just now. Please try again.";
        setState({ status: "error", message });
        return;
      }
      if (!data?.result?.state) {
        setState({ status: "error", message: "Rex returned an unexpected response. Please try again." });
        return;
      }
      setState({ status: "done", result: data.result as SniperApiResult });
    } catch {
      setState({ status: "error", message: "Couldn't reach Rex. Check your connection and try again." });
    }
  }

  return (
    <div className={cn("space-y-3 rounded-2xl p-4", PANEL)}>
      <div className="flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Check Sniper Entry (optional)
        </p>
      </div>
      <p className="text-[12px] leading-relaxed text-[#A3A3A3]">
        An additional confirmation step for this setup — it never changes the entry, stop,
        targets or quality above. Upload a fresh M5 or M1 screenshot of the SAME pair ({pair}) and
        Rex will check whether price has genuinely retested the entry zone with a{" "}
        {bias.toLowerCase()}-aligned rejection and lower-timeframe structure shift. Rex can only
        read what you upload here — it does not watch live candles on its own, so check back with
        a fresh screenshot later if conditions aren&apos;t met yet.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state.status === "loading"}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-[#F5F5F5] transition-colors hover:border-primary/50 disabled:opacity-60"
      >
        {state.status === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        Upload M5 / M1 confirmation chart
      </button>

      {state.status === "error" && <p className="text-[12px] text-rose-400">{state.message}</p>}

      {state.status === "done" && (
        <div className="space-y-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
              SNIPER_STATUS_META[state.result.state]
            )}
          >
            {state.result.state === "CONFIRMED" && <Check className="h-3.5 w-3.5" />}
            {state.result.state === "INVALIDATED" && <Ban className="h-3.5 w-3.5" />}
            {state.result.state === "WAITING" && <ShieldAlert className="h-3.5 w-3.5" />}
            {state.result.state}
          </span>
          <p className="text-[12px] leading-relaxed text-[#F5F5F5]">{state.result.reason}</p>
          {state.result.state === "CONFIRMED" && state.result.evidence.length > 0 && (
            <ul className="mt-1 space-y-1">
              {state.result.evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-[#A3A3A3]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NeutralBody({ setup }: { setup: NeutralSetup }) {
  return (
    <div className="space-y-5">
      <NewsWarning level={setup.newsRisk} />

      <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <Minus className="h-5 w-5" />
        </span>
        <p className="text-base font-bold text-[#F5F5F5]">Neutral Market</p>
        <p className="text-sm text-[#A3A3A3]">No directional setup available.</p>
      </div>

      {(setup.upperZone || setup.lowerZone) && (
        <div className="space-y-2.5">
          {setup.upperZone && (
            <ZoneRow icon={ArrowUpRight} accent="text-emerald-400" label="Upper breakout / watch" value={setup.upperZone} />
          )}
          {setup.lowerZone && (
            <ZoneRow icon={TrendingDown} accent="text-rose-400" label="Lower breakout / watch" value={setup.lowerZone} />
          )}
          {setup.keyResistance && (
            <ZoneRow icon={Target} accent="text-[#A3A3A3]" label="Key resistance" value={setup.keyResistance} />
          )}
          {setup.keySupport && (
            <ZoneRow icon={Target} accent="text-[#A3A3A3]" label="Key support" value={setup.keySupport} />
          )}
        </div>
      )}

      {setup.requiredConfirmation.length > 0 && (
        <div className={cn("rounded-2xl p-4", PANEL)}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
            APA confirmation required first
          </p>
          <ul className="mt-2 space-y-1.5">
            {setup.requiredConfirmation.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#F5F5F5]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ZoneRow({
  icon: Icon,
  accent,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-2xl p-4", PANEL)}>
      <span className="flex items-center gap-2.5 text-sm">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A0A0A]", accent)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex flex-col">
          <span className={MUTED}>{label}</span>
          {hint && <span className="text-[11px] text-[#7A7A7A]">{hint}</span>}
        </span>
      </span>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", TEXT)}>{value}</span>
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[64, 80, 72, 88].map((w, i) => (
          <div key={i} className="h-8 animate-pulse rounded-full bg-white/[0.06]" style={{ width: w }} />
        ))}
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}

/* ── Upgrade modal (free users) ────────────────────────────────────────────── */

function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="rex-setup-upgrade" maxWidth="max-w-[440px]">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-[#A3A3A3] transition-colors hover:bg-[#1a1a1a] hover:text-[#F5F5F5]"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="px-7 py-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6]">
          <Crown className="h-6 w-6" />
        </span>
        <h2 id="rex-setup-upgrade" className={cn("mt-4 text-lg font-semibold", TEXT)}>
          Rex Trade Setup is a Rex Pro feature
        </h2>
        <p className={cn("mt-2 text-sm", MUTED)}>
          Convert every analysis into structured entry, invalidation and target zones with an R:R
          estimate and setup quality — then save it straight to your Smart Journal.
        </p>
        <Link
          href="/billing"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition-colors hover:bg-[#2f74e6]"
        >
          Unlock with Rex Pro <ArrowUpRight className="h-4 w-4" />
        </Link>
        <p className={cn("mt-3 text-xs", MUTED)}>Included in Rex Pro • $15.99/month</p>
      </div>
    </ModalShell>
  );
}

/* ── Centered modal shell (portal + animation + a11y) ──────────────────────── */

function ModalShell({
  open,
  onClose,
  children,
  labelledBy,
  maxWidth = "max-w-[560px]",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  maxWidth?: string;
  busy?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, busy]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onMouseDown={() => {
            if (!busy) onClose();
          }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[rgba(0,0,0,0.72)] p-4 backdrop-blur-[10px]"
        >
          <motion.div
            key="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "relative flex max-h-[90vh] w-[92vw] flex-col overflow-hidden rounded-[28px] border border-[#1F1F1F] bg-[#0B0B0B]",
              "shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_24px_80px_rgba(0,0,0,0.65)]",
              maxWidth
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-[#1F1F1F] px-6 py-5 sm:px-7">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] shadow-[0_0_28px_-10px_rgba(59,130,246,0.8)]">
        <Target className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="rex-setup-title" className={cn("text-lg font-bold tracking-tight", TEXT)}>
          {title}
        </h2>
        <p className={cn("mt-0.5 text-sm", MUTED)}>{subtitle}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#A3A3A3] transition-colors hover:bg-[#1a1a1a] hover:text-[#F5F5F5]"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
