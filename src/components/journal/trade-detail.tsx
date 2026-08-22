"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  ArrowLeft, Brain, Newspaper, CalendarClock, StickyNote, Activity,
  Target, Tag as TagIcon, Save, RefreshCw, CheckCircle2, Lock, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CloseTradeModal } from "./close-trade-modal";
import {
  RESULT_STYLE, NEWS_STYLE, JOURNAL_EMOTIONS, JOURNAL_TAGS,
  type JournalEntryDTO,
} from "@/lib/journal/constants";

export function TradeDetail({
  entry: initial,
  canEdit,
}: {
  entry: JournalEntryDTO;
  canEdit: boolean;
}) {
  const [entry, setEntry] = React.useState(initial);
  const [note, setNote] = React.useState(initial.traderNote ?? "");
  const [emotions, setEmotions] = React.useState<Set<string>>(new Set(initial.emotions));
  const [tags, setTags] = React.useState<Set<string>>(new Set(initial.tags));
  const [saving, setSaving] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  const dirty =
    note !== (entry.traderNote ?? "") ||
    !setEq(emotions, new Set(entry.emotions)) ||
    !setEq(tags, new Set(entry.tags));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traderNote: note, emotions: [...emotions], tags: [...tags] }),
      });
      const data = await res.json();
      if (res.ok && data.entry) { setEntry(data.entry); toast.success("Saved."); }
      else toast.error(data.error === "forbidden" ? "Rex Pro required." : "Could not save.");
    } finally { setSaving(false); }
  }

  async function check() {
    setChecking(true);
    try {
      const res = await fetch(`/api/journal/${entry.id}/check-outcome`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.entry) { setEntry(data.entry); toast.success("Outcome updated."); }
      else toast.error(data.error === "forbidden" ? "Rex Pro required." : "Could not check outcome.");
    } finally { setChecking(false); }
  }

  const rs = RESULT_STYLE[entry.resultType];
  const isOpen = entry.resultType === "OPEN";

  return (
    <div className="space-y-6">
      <Link href="/journal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Smart Journal
      </Link>

      {!canEdit && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm text-amber-200"><Lock className="h-4 w-4 shrink-0" /> Read-only — reactivate Rex Pro to edit this trade.</p>
          <Link href="/billing" className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black">Reactivate</Link>
        </div>
      )}

      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{entry.pair}</h1>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", rs.className)}>{rs.label}</span>
          {entry.resultR != null && (
            <span className={cn("text-lg font-bold", entry.resultR >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {entry.resultR >= 0 ? "+" : ""}{entry.resultR}R
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isOpen && (
              <button onClick={() => setClosing(true)} className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">Close Trade</button>
            )}
            <button onClick={check} disabled={checking} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60">
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> Check Outcome
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. Trade Overview */}
        <Section icon={<Target className="h-4 w-4" />} title="Trade Overview">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <Row label="Direction" value={entry.direction ?? "—"} />
            <Row label="Timeframe" value={entry.timeframe ?? "—"} />
            <Row label="Entry" value={fmt(entry.entryPrice)} />
            <Row label="Stop loss" value={fmt(entry.stopLoss)} />
            <Row label="Take profit" value={fmt(entry.takeProfit)} />
            <Row label="Lot size" value={fmt(entry.lotSize)} />
            <Row label="Risk amount" value={entry.riskAmount != null ? `$${entry.riskAmount}` : "—"} />
            <Row label="Result amount" value={entry.resultAmount != null ? `$${entry.resultAmount}` : "—"} />
          </dl>
        </Section>

        {/* 2. Rex Analysis */}
        <Section icon={<Brain className="h-4 w-4" />} title="Rex Analysis">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI confidence</span>
              <span className="font-semibold">{entry.confidence != null ? `${entry.confidence}%` : "—"}</span>
            </div>
            {entry.confidence != null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${entry.confidence}%` }} />
              </div>
            )}
            {entry.analysisId ? (
              <Link href="/history" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View source analysis <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">Logged manually — no linked analysis.</p>
            )}
          </div>
        </Section>

        {/* 3. Trader Notes */}
        <Section icon={<StickyNote className="h-4 w-4" />} title="Trader Notes">
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)} rows={4} disabled={!canEdit}
            placeholder={canEdit ? "What was your thesis? How did you feel?" : "No notes."}
            className="w-full resize-none rounded-xl border border-input bg-card/50 px-3 py-2 text-sm outline-none focus:border-primary/60 disabled:opacity-70"
          />
        </Section>

        {/* 4. Emotions */}
        <Section icon={<Activity className="h-4 w-4" />} title="Emotions">
          <div className="flex flex-wrap gap-2">
            {JOURNAL_EMOTIONS.map((em) => {
              const on = emotions.has(em);
              return (
                <button key={em} disabled={!canEdit}
                  onClick={() => setEmotions((p) => toggle(p, em))}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                    on ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground")}>
                  {em}
                </button>
              );
            })}
          </div>
        </Section>

        {/* 5. News Context */}
        <Section icon={<Newspaper className="h-4 w-4" />} title="News Context">
          {entry.newsRisk ? (
            <div className="space-y-2">
              <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold", NEWS_STYLE[entry.newsRisk].className)}>
                {NEWS_STYLE[entry.newsRisk].label}
              </span>
              <p className="text-sm text-muted-foreground">
                {entry.newsRisk === "HIGH"
                  ? "High-impact news was scheduled close to this trade — elevated volatility risk."
                  : entry.newsRisk === "MEDIUM"
                  ? "Moderate news exposure around this trade's window."
                  : "No major economic events near this trade."}
              </p>
            </div>
          ) : <p className="text-sm text-muted-foreground">No news data.</p>}
        </Section>

        {/* 6. What Happened Next */}
        <Section icon={<CalendarClock className="h-4 w-4" />} title="What Happened Next">
          {entry.outcome ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <Row label="Target reached" value={entry.outcome.targetReached == null ? "—" : entry.outcome.targetReached ? "Yes" : "No"} />
              <Row label="Accuracy score" value={entry.outcome.accuracyScore != null ? `${entry.outcome.accuracyScore}%` : "—"} />
              <Row label="Max favorable" value={fmt(entry.outcome.mfe)} />
              <Row label="Max adverse" value={fmt(entry.outcome.mae)} />
              <Row label="Time to target" value={entry.outcome.timeToTargetMins != null ? `${entry.outcome.timeToTargetMins}m` : "—"} />
              <div className="col-span-2 text-xs text-muted-foreground">{entry.outcome.note}</div>
            </dl>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p>Run a check to compare your plan with the actual move.</p>
              {canEdit && (
                <button onClick={check} disabled={checking} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                  <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} /> Check Outcome
                </button>
              )}
            </div>
          )}
        </Section>

        {/* 7. Outcome / Tags */}
        <Section icon={<TagIcon className="h-4 w-4" />} title="Tags & Outcome" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {JOURNAL_TAGS.map((t) => {
              const on = tags.has(t);
              return (
                <button key={t} disabled={!canEdit}
                  onClick={() => setTags((p) => toggle(p, t))}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                    on ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground")}>
                  {t}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      {canEdit && dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      )}

      {closing && (
        <CloseTradeModal entry={entry} onClose={() => setClosing(false)} onClosed={(u) => setEntry(u)} />
      )}
    </div>
  );
}

/* helpers */
function Section({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card/50 p-5", className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (<><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></>);
}
function fmt(n: number | null): string { return n == null ? "—" : String(n); }
function toggle(set: Set<string>, v: string): Set<string> { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n; }
function setEq(a: Set<string>, b: Set<string>): boolean { return a.size === b.size && [...a].every((x) => b.has(x)); }
