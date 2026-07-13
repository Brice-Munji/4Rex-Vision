"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  History,
  BookOpen,
  Newspaper,
  GraduationCap,
  CalendarClock,
  Lightbulb,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UnlockRexProButton } from "@/components/billing/unlock-rex-pro";
import { REX_PRO } from "@/lib/payments/catalog";

/** Next UTC midnight — matches the backend's daily reset boundary. */
function nextUtcMidnight(): Date {
  const n = new Date();
  return new Date(
    Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0h 0m 0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

const ACTIONS = [
  { label: "Review previous analyses", href: "/history", icon: History },
  { label: "Open Trading Journal", href: "/journal", icon: BookOpen },
  { label: "View Market News", href: "/market", icon: Newspaper },
  { label: "Read Coach Rex lessons", href: "/help", icon: GraduationCap },
  { label: "Check economic calendar", href: "/market", icon: CalendarClock },
  { label: "Learn trading concepts", href: "/help", icon: Lightbulb },
];

const PRO_BENEFITS = [
  "Unlimited AI analyses",
  "Unlimited Journal",
  "Unlimited AI Chat",
  "Advanced RAE",
  "Multi-Timeframe Analysis",
  "Coach Rex",
  "Economic Intelligence",
];

export function WhatsNext({
  open,
  onClose,
  resetAt,
}: {
  open: boolean;
  onClose: () => void;
  /** ISO reset time from the backend; falls back to next UTC midnight. */
  resetAt?: string | null;
}) {
  const target = React.useMemo(
    () => (resetAt ? new Date(resetAt) : nextUtcMidnight()),
    [resetAt]
  );
  const [remaining, setRemaining] = React.useState(() => target.getTime() - Date.now());

  // Live countdown, updates every second while open.
  React.useEffect(() => {
    if (!open) return;
    setRemaining(target.getTime() - Date.now());
    const t = setInterval(() => setRemaining(target.getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, target]);

  // Lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const countdown = formatCountdown(remaining);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end justify-center overflow-y-auto sm:items-center sm:p-6"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-t-[24px] shadow-2xl shadow-black/60 ring-1 ring-white/10 glass-strong sm:rounded-[24px]"
          >
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-sky-500/25 blur-[90px]" />
              <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-cyan-400/15 blur-[90px]" />
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="max-h-[92vh] overflow-y-auto p-7 sm:p-9">
              {/* Header */}
              <h2 className="max-w-md text-2xl font-bold tracking-tight">
                You&apos;ve completed today&apos;s free analyses.
              </h2>

              {/* Rex personality */}
              <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4">
                <p className="text-sm leading-relaxed text-foreground/90">
                  👋 Nice work today. You&apos;ve already completed all 3 free
                  analyses included with Rex Explorer.
                  <br />
                  While you&apos;re waiting, why not review your previous trades or
                  explore today&apos;s economic events? Whenever you&apos;re ready,
                  Rex Pro unlocks unlimited analysis and advanced AI tools.
                </p>
              </div>

              {/* Countdown */}
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Free Analysis In</p>
                    <p className="font-mono text-lg font-bold tabular-nums">{countdown}</p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Resets automatically
                </span>
              </div>

              {/* What can I do now? */}
              <h3 className="mt-7 text-sm font-semibold">What can I do now?</h3>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {ACTIONS.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3.5 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-secondary/40"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sky-500">
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{a.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>

              {/* Unlock Rex Pro */}
              <div className="relative mt-7 overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-transparent to-cyan-400/5 p-5">
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-md shadow-sky-500/30">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="flex items-end gap-1.5">
                    <h3 className="text-lg font-bold tracking-tight">Unlock Rex Pro</h3>
                    <span className="mb-0.5 text-sm text-muted-foreground">
                      {REX_PRO.priceLabel}/month
                    </span>
                  </div>
                </div>

                <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {PRO_BENEFITS.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
                      <span className="text-foreground/90">{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  <UnlockRexProButton fullWidth />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
