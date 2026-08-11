"use client";

import * as React from "react";
import { toast } from "sonner";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import type { JournalEntryDTO } from "@/lib/journal/constants";

export function CloseTradeModal({
  entry,
  onClose,
  onClosed,
}: {
  entry: JournalEntryDTO;
  onClose: () => void;
  onClosed: (updated: JournalEntryDTO) => void;
}) {
  const [exitPrice, setExitPrice] = React.useState("");
  const [resultAmount, setResultAmount] = React.useState("");
  const [resultR, setResultR] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Live preview of the computed R multiple from the exit price.
  const previewR = React.useMemo(() => {
    const ex = parseFloat(exitPrice);
    if (resultR) return parseFloat(resultR);
    if (!isFinite(ex) || entry.entryPrice == null || entry.stopLoss == null) return null;
    const risk = Math.abs(entry.entryPrice - entry.stopLoss);
    if (risk <= 0) return null;
    const dir = entry.direction === "Bearish" ? -1 : 1;
    return Math.round(((ex - entry.entryPrice) * dir) / risk * 100) / 100;
  }, [exitPrice, resultR, entry]);

  const outcome =
    previewR == null ? null : previewR > 0.05 ? "WIN" : previewR < -0.05 ? "LOSS" : "BREAKEVEN";

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/${entry.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exitPrice: exitPrice ? parseFloat(exitPrice) : null,
          resultAmount: resultAmount ? parseFloat(resultAmount) : null,
          resultR: resultR ? parseFloat(resultR) : null,
          note: note || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.entry) {
        toast.success("Trade closed.");
        onClosed(data.entry);
        onClose();
      } else {
        toast.error(data.error === "forbidden" ? "Rex Pro required." : "Could not close trade.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Close {entry.pair} trade
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Record how the trade finished.</p>

        <div className="mt-4 space-y-3">
          <Field label="Exit price">
            <input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} inputMode="decimal" placeholder="e.g. 1.0925" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Result amount ($)">
              <input value={resultAmount} onChange={(e) => setResultAmount(e.target.value)} inputMode="decimal" placeholder="optional" className={inputCls} />
            </Field>
            <Field label="Result R (override)">
              <input value={resultR} onChange={(e) => setResultR(e.target.value)} inputMode="decimal" placeholder="auto" className={inputCls} />
            </Field>
          </div>
          <Field label="Note">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What did you learn?" className={inputCls} />
          </Field>

          {outcome && (
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-sm">
              Auto-calculated:{" "}
              <span className={outcome === "WIN" ? "text-emerald-400" : outcome === "LOSS" ? "text-rose-400" : "text-amber-400"}>
                {outcome} · {previewR! >= 0 ? "+" : ""}{previewR}R
              </span>
            </div>
          )}
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Close trade
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-card/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
