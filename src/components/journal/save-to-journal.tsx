"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, X, Loader2, Lock, Crown, ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RexReport as RexReportType } from "@/lib/rex/types";
import type { Plan } from "@prisma/client";
import { JOURNAL_EMOTIONS, JOURNAL_TAGS } from "@/lib/journal/constants";

function parseNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : null;
}

/** Auto-imported fields pulled straight from the analysis report. */
function importFromReport(report: RexReportType) {
  const levels = report.priceLevels ?? [];
  const find = (t: string) => levels.find((l) => l.type === t)?.value ?? null;
  return {
    pair: report.analysisContext?.instrument ?? report.pair,
    timeframe: report.timeframe,
    direction: report.bias?.bias ?? null,
    confidence: report.overallConfidence ?? null,
    entryPrice: parseNum(find("Entry")),
    stopLoss: parseNum(find("Invalidation")),
    takeProfit: parseNum(find("Take Profit")),
  };
}

export function SaveToJournalButton({
  report,
  plan,
}: {
  report: RexReportType;
  plan?: Plan;
}) {
  const [open, setOpen] = React.useState(false);
  const isPro = plan === "PROFESSIONAL" || plan === "ENTERPRISE";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
      >
        {isPro ? <BookOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        Save to Smart Journal
      </button>
      {open && (isPro ? (
        <SaveModal report={report} onClose={() => setOpen(false)} />
      ) : (
        <UpgradeModal onClose={() => setOpen(false)} />
      ))}
    </>
  );
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Crown className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Smart Journal is a Rex Pro feature</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Save analyses, track emotions and news risk, and see exactly what happened next —
          turn every analysis into a measurable trading journey.
        </p>
        <Link href="/billing" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          Unlock Smart Journal with Rex Pro <ArrowUpRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">Included in Rex Pro • $15.99/month</p>
      </div>
    </Overlay>
  );
}

function SaveModal({ report, onClose }: { report: RexReportType; onClose: () => void }) {
  const router = useRouter();
  const imported = React.useMemo(() => importFromReport(report), [report]);
  const [lotSize, setLotSize] = React.useState("");
  const [riskAmount, setRiskAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [emotions, setEmotions] = React.useState<Set<string>>(new Set());
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
          emotions: [...emotions],
          tags: [...tags],
        }),
      });
      const data = await res.json();
      if (res.ok && data.entry) {
        toast.success("Saved to Smart Journal.");
        onClose();
        router.push(`/journal/${data.entry.id}`);
      } else if (data.error === "forbidden") {
        toast.error("Your Rex Pro is inactive — reactivate to save trades.");
      } else {
        toast.error("Could not save to journal.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="h-5 w-5 text-primary" /> Save to Smart Journal
      </h2>
      {/* Auto-imported */}
      <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Auto-imported from analysis</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <Imp label="Pair" value={imported.pair} />
          <Imp label="Timeframe" value={imported.timeframe} />
          <Imp label="Direction" value={imported.direction} />
          <Imp label="Confidence" value={imported.confidence != null ? `${imported.confidence}%` : "—"} />
          <Imp label="Entry" value={imported.entryPrice} />
          <Imp label="Stop loss" value={imported.stopLoss} />
          <Imp label="Take profit" value={imported.takeProfit} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Lot size</span>
          <input value={lotSize} onChange={(e) => setLotSize(e.target.value)} inputMode="decimal" placeholder="e.g. 0.5" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Risk amount ($)</span>
          <input value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 50" className={inputCls} />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Note (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Your thesis for this trade…" className={inputCls} />
      </label>

      <Chips label="Emotions" options={[...JOURNAL_EMOTIONS]} selected={emotions} onToggle={(v) => setEmotions((p) => toggle(p, v))} />
      <Chips label="Tags" options={[...JOURNAL_TAGS]} selected={tags} onToggle={(v) => setTags((p) => toggle(p, v))} />

      <button onClick={submit} disabled={saving} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save trade
      </button>
    </Overlay>
  );
}

/* shared bits */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className="relative my-8 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="h-5 w-5" /></button>
        {children}
      </div>
    </div>
  );
}
function Imp({ label, value }: { label: string; value: React.ReactNode }) {
  return (<><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value ?? "—"}</span></>);
}
function Chips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.has(o);
          return (
            <button key={o} onClick={() => onToggle(o)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              on ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground")}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}
const inputCls = "w-full rounded-xl border border-input bg-card/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";
function toggle(set: Set<string>, v: string): Set<string> { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n; }
