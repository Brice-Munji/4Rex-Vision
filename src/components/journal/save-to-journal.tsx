"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/lib/toast";
import {
  BookOpen,
  X,
  Loader2,
  Lock,
  Crown,
  ArrowUpRight,
  Check,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RexReport as RexReportType } from "@/lib/rex/types";
import type { Plan } from "@prisma/client";
import type { TradeSetupResult } from "@/lib/rex/trade-setup";
import { JOURNAL_TAGS, type NewsRisk } from "@/lib/journal/constants";

/* ── Fixed premium dark palette (the modal is always a dark trading surface,
      independent of the app's light/dark theme, per the design spec). ──────── */
const PANEL = "bg-[#111111] border border-[#1F1F1F]";
const TEXT = "text-[#F5F5F5]";
const MUTED = "text-[#A3A3A3]";
const INPUT =
  "w-full rounded-xl border border-[#1F1F1F] bg-[#111111] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none transition-colors placeholder:text-[#565656] focus:border-[#3B82F6]/70 focus:ring-2 focus:ring-[#3B82F6]/20";

function parseNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : null;
}

export interface ImportedTradeFields {
  pair: string;
  timeframe: string | null;
  direction: string | null;
  confidence: number | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  /** The structural invalidation ZONE string (e.g. "4169.410 – 4170.590"),
   *  present only when a validated setup backs these numbers — the numeric
   *  `stopLoss` above is that zone's center, not an exact stop (same
   *  convention as the Rex Trade Setup modal's own save path). */
  invalidationZone: string | null;
  /**
   * "validated-setup" — entry/stopLoss/takeProfit came from a generated,
   * APA-validated `DirectionalSetup` (1:2 R:R, anti-chase, confluence gates
   * already applied) — the SAME numbers the Rex Trade Setup modal would save.
   * "raw-levels" — no validated setup exists yet; these are the chart's own
   * unvalidated Entry/Invalidation/Take Profit price levels, shown so a user
   * can still journal the analysis itself (legitimate analysis-only use),
   * but they must never be presented as an APA-validated trade plan.
   */
  source: "validated-setup" | "raw-levels";
}

/**
 * Auto-imported trade fields for the journal. When a validated
 * `DirectionalSetup` has already been generated for this report (via the Rex
 * Trade Setup card/modal), its entry/invalidation/target-1 numbers are reused
 * verbatim — the SAME values that setup's own "Save to Smart Journal" button
 * saves — so both save paths are always consistent and neither bypasses the
 * APA engine's 1:2 R:R / anti-chase / confluence validation. Only when no
 * validated setup exists does this fall back to the chart's raw price
 * levels, clearly flagged via `source` so the UI never implies those raw
 * numbers were validated.
 */
export function importFromReport(
  report: RexReportType,
  tradeSetup?: TradeSetupResult | null
): ImportedTradeFields {
  const pair = report.analysisContext?.instrument ?? report.pair;
  const timeframe = report.timeframe;
  const direction = report.bias?.bias ?? null;
  const confidence = report.overallConfidence ?? null;

  if (tradeSetup?.kind === "directional") {
    return {
      pair,
      timeframe,
      direction,
      confidence,
      entryPrice: tradeSetup.entryMid,
      stopLoss: tradeSetup.invalidationMid,
      takeProfit: tradeSetup.target1Mid,
      invalidationZone: tradeSetup.invalidationZone,
      source: "validated-setup",
    };
  }

  const levels = report.priceLevels ?? [];
  const find = (t: string) => levels.find((l) => l.type === t)?.value ?? null;
  return {
    pair,
    timeframe,
    direction,
    confidence,
    entryPrice: parseNum(find("Entry")),
    stopLoss: parseNum(find("Invalidation")),
    takeProfit: parseNum(find("Take Profit")),
    invalidationZone: null,
    source: "raw-levels",
  };
}

/** Derive a lightweight news-risk preview from the report's economic events. */
function deriveNewsRisk(report: RexReportType): NewsRisk | null {
  const events = report.economic ?? [];
  if (!events.length) return null;
  if (events.some((e) => e.impact === "High")) return "HIGH";
  if (events.some((e) => e.impact === "Medium")) return "MEDIUM";
  return "LOW";
}

export function SaveToJournalButton({
  report,
  plan,
  tradeSetup,
}: {
  report: RexReportType;
  plan?: Plan;
  /** The last generated Rex Trade Setup for this report, when one exists
   *  (lifted from the same state the Rex Trade Setup card/modal populates).
   *  Passing it lets this button reuse the validated entry/SL/TP instead of
   *  re-deriving them from raw chart levels. Safe to omit — falls back to
   *  the raw-levels path, unchanged. */
  tradeSetup?: TradeSetupResult | null;
}) {
  const [open, setOpen] = React.useState(false);
  const isPro = plan === "PROFESSIONAL" || plan === "ENTERPRISE";
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
      >
        {isPro ? <BookOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        Save to Smart Journal
      </button>
      {isPro ? (
        <SaveModal open={open} report={report} tradeSetup={tradeSetup} onClose={close} />
      ) : (
        <UpgradeModal open={open} onClose={close} />
      )}
    </>
  );
}

/* ── The save modal ───────────────────────────────────────────────────────── */

function SaveModal({
  open,
  report,
  tradeSetup,
  onClose,
}: {
  open: boolean;
  report: RexReportType;
  tradeSetup?: TradeSetupResult | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const imported = React.useMemo(() => importFromReport(report, tradeSetup), [report, tradeSetup]);
  const newsRisk = React.useMemo(() => deriveNewsRisk(report), [report]);
  const [lotSize, setLotSize] = React.useState("");
  const [riskAmount, setRiskAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [tags, setTags] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...imported,
          analysisId: report.id ?? null,
          lotSize: parseNum(lotSize),
          riskAmount: parseNum(riskAmount),
          traderNote: note || null,
          tags: [...tags],
          emotions: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.entry) {
        onClose();
        // Top-right success toast.
        toast.success("Trade saved to Smart Journal", {
          position: "top-right",
          description: `${imported.pair ?? "Setup"} · ${imported.timeframe ?? ""}`.trim(),
        });
        // Refresh journal count / history in the background (no navigation).
        router.refresh();
      } else if (data.error === "forbidden") {
        toast.error("Your Rex Pro is inactive — reactivate to save trades.");
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
    <ModalShell open={open} onClose={onClose} labelledBy="save-journal-title" saving={saving}>
      {/* Header */}
      <ModalHeader
        title="Save to Smart Journal"
        subtitle="Capture this setup before it disappears."
        onClose={onClose}
      />

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 sm:px-7">
        {/* Section 1 — Auto-imported */}
        <section>
          <SectionLabel>Auto-imported from analysis</SectionLabel>
          <div className={cn("mt-2.5 rounded-2xl p-4", PANEL)}>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3.5">
              <Imp label="Pair" value={imported.pair} />
              <Imp label="Timeframe" value={imported.timeframe} />
              <Imp
                label="Direction"
                value={imported.direction}
                tone={directionTone(imported.direction)}
              />
              <Imp
                label="Confidence"
                value={imported.confidence != null ? `${imported.confidence}%` : null}
              />
              <Imp label="Entry" value={imported.entryPrice} />
              <Imp
                label="Stop loss"
                value={imported.stopLoss}
                hint={imported.invalidationZone ? `Zone: ${imported.invalidationZone}` : undefined}
              />
              <Imp label="Take profit" value={imported.takeProfit} />
            </div>
            {imported.source === "validated-setup" ? (
              <p className="mt-3 text-[11px] leading-relaxed text-emerald-400/90">
                Entry, stop loss and take profit are from your validated Rex Trade Setup (1:2+
                R:R and anti-chase already checked) — the same values its own save uses.
              </p>
            ) : (
              imported.entryPrice != null && (
                <p className="mt-3 text-[11px] leading-relaxed text-amber-400/90">
                  These are the chart&apos;s raw price levels — Rex hasn&apos;t validated them as a
                  trade setup (no R:R or anti-chase check). Generate a Rex Trade Setup above for a
                  validated entry, stop loss and take profit.
                </p>
              )
            )}
          </div>
        </section>

        {/* Section 2 — Trade details */}
        <section>
          <div className="flex items-center justify-between">
            <SectionLabel>Trade details</SectionLabel>
            {newsRisk && <NewsRiskBadge level={newsRisk} />}
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Lot size">
              <input
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 0.50"
                className={INPUT}
              />
            </Field>
            <Field label="Risk amount ($)">
              <input
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 50"
                className={INPUT}
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {[...JOURNAL_TAGS].map((t) => {
                  const on = tags.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTags((p) => toggle(p, t))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-[#3B82F6]/50 bg-[#3B82F6]/15 text-[#8fbaff]"
                          : "border-[#1F1F1F] bg-[#111111] text-[#A3A3A3] hover:text-[#F5F5F5]"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Trader note">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Your thesis, execution plan, or what you're watching…"
                className={cn(INPUT, "resize-none")}
              />
            </Field>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-[#1F1F1F] px-6 py-4 sm:px-7">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#1F1F1F] bg-[#111111] px-5 text-sm font-semibold text-[#A3A3A3] transition-colors hover:text-[#F5F5F5] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.6)] transition-colors hover:bg-[#2f74e6] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Trade
        </button>
      </div>
    </ModalShell>
  );
}

/* ── Upgrade (non-Pro) modal ──────────────────────────────────────────────── */

function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="upgrade-journal-title" maxWidth="max-w-[440px]">
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
        <h2 id="upgrade-journal-title" className={cn("mt-4 text-lg font-semibold", TEXT)}>
          Smart Journal is a Rex Pro feature
        </h2>
        <p className={cn("mt-2 text-sm", MUTED)}>
          Save analyses, track news risk, and see exactly what happened next — turn every
          analysis into a measurable trading journey.
        </p>
        <Link
          href="/billing"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] text-sm font-semibold text-white transition-colors hover:bg-[#2f74e6]"
        >
          Unlock Smart Journal with Rex Pro <ArrowUpRight className="h-4 w-4" />
        </Link>
        <p className={cn("mt-3 text-xs", MUTED)}>Included in Rex Pro • $15.99/month</p>
      </div>
    </ModalShell>
  );
}

/* ── Centered modal shell: backdrop + card + a11y + animation ──────────────── */

function ModalShell({
  open,
  onClose,
  children,
  labelledBy,
  maxWidth = "max-w-[680px]",
  saving = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  maxWidth?: string;
  saving?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Lock body scroll + ESC to close while open.
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

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
            if (!saving) onClose();
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
        <BookOpen className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="save-journal-title" className={cn("text-lg font-bold tracking-tight", TEXT)}>
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

/* ── Small building blocks ────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">{children}</p>
  );
}

function directionTone(direction: string | null): string | undefined {
  if (direction === "Bullish") return "text-emerald-400";
  if (direction === "Bearish") return "text-rose-400";
  if (direction === "Neutral") return "text-amber-400";
  return undefined;
}

function Imp({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  /** Small muted caption shown under the value, e.g. the structural zone a
   *  validated stop-loss number is the center of. */
  hint?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-sm", MUTED)}>{label}</span>
      <span className="flex flex-col items-end">
        <span className={cn("text-right text-sm font-semibold", empty ? "text-[#565656]" : tone ?? TEXT)}>
          {empty ? "—" : value}
        </span>
        {!empty && hint && <span className="text-[10px] text-[#7A7A7A]">{hint}</span>}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={cn("mb-1.5 block text-xs font-medium", MUTED)}>{label}</span>
      {children}
    </label>
  );
}

const NEWS_RISK_STYLES: Record<NewsRisk, string> = {
  HIGH: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

function NewsRiskBadge({ level }: { level: NewsRisk }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        NEWS_RISK_STYLES[level]
      )}
    >
      <ShieldAlert className="h-3 w-3" />
      News risk: {level}
    </span>
  );
}

function toggle(set: Set<string>, v: string): Set<string> {
  const n = new Set(set);
  if (n.has(v)) n.delete(v);
  else n.add(v);
  return n;
}
