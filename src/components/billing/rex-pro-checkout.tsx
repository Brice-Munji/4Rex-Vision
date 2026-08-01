"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  Sparkles,
  Lock,
  PartyPopper,
  AlertTriangle,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REX_PRO } from "@/lib/payments/catalog";
import type { PaymentMethodId } from "@/lib/payments/types";

export type CheckoutStep = "select" | "processing" | "success" | "failed";

/** Curated benefits shown in checkout ("less is better"). */
const CHECKOUT_BENEFITS = [
  "Unlimited AI Analyses",
  "Unlimited AI Chat",
  "Advanced RAE",
  "AI Trading Coach",
  "Multi-Timeframe Analysis",
  "Unlimited Journal",
  "PDF Reports",
];

/** Features listed on the success screen. */
const UNLOCKED = [
  "Unlimited AI Analysis",
  "AI Trading Coach",
  "Advanced RAE",
  "Unlimited Journal",
  "Priority AI Processing",
];

interface MethodCard {
  id: PaymentMethodId;
  name: string;
  sub: string;
  glyph: string;
  needsPhone?: boolean;
}

const METHODS: MethodCard[] = [
  { id: "mtn_momo", name: "MTN Mobile Money", sub: "Recommended for Cameroon", glyph: "📱", needsPhone: true },
  { id: "orange_money", name: "Orange Money", sub: "Fast & Secure", glyph: "📱", needsPhone: true },
  { id: "flutterwave", name: "Flutterwave", sub: "Cards • Mobile Money • Bank", glyph: "🌍" },
  { id: "card", name: "Visa / Mastercard", sub: "International Cards", glyph: "💳" },
];

export interface CheckoutOverlayProps {
  open: boolean;
  step: CheckoutStep;
  method: PaymentMethodId;
  setMethod: (m: PaymentMethodId) => void;
  phone: string;
  setPhone: (p: string) => void;
  error: string | null;
  onPay: () => void;
  onMinimize: () => void;
  onRetry: () => void;
  onChoose: () => void;
  onContinue: () => void;
}

export function RexProCheckoutOverlay({
  open,
  step,
  method,
  setMethod,
  phone,
  setPhone,
  error,
  onPay,
  onMinimize,
  onRetry,
  onChoose,
  onContinue,
}: CheckoutOverlayProps) {
  const busy = step === "processing";
  const needsPhone = !!METHODS.find((m) => m.id === method)?.needsPhone;

  // Lock body scroll while the overlay is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto sm:items-center sm:p-6"
        >
          {/* Backdrop — blur + ~60% dark. Click preserves progress (minimizes). */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            onClick={busy ? undefined : onMinimize}
          />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-[850px] overflow-hidden rounded-t-[24px] shadow-2xl shadow-black/60 ring-1 ring-border glass-strong sm:rounded-[24px]"
          >
            {/* ambient glow */}
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full" />
              <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full" />
            </div>

            <div className="max-h-[92vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === "success" ? (
                  <SuccessView key="success" onContinue={onContinue} />
                ) : step === "failed" ? (
                  <FailedView key="failed" onRetry={onRetry} onChoose={onChoose} />
                ) : (
                  <CheckoutView
                    key="checkout"
                    busy={busy}
                    method={method}
                    setMethod={setMethod}
                    needsPhone={needsPhone}
                    phone={phone}
                    setPhone={setPhone}
                    error={error}
                    onPay={onPay}
                    onMinimize={onMinimize}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Checkout view ----------------------------- */

function CheckoutView({
  busy,
  method,
  setMethod,
  needsPhone,
  phone,
  setPhone,
  error,
  onPay,
  onMinimize,
}: {
  busy: boolean;
  method: PaymentMethodId;
  setMethod: (m: PaymentMethodId) => void;
  needsPhone: boolean;
  phone: string;
  setPhone: (p: string) => void;
  error: string | null;
  onPay: () => void;
  onMinimize: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="relative border-b border-border px-7 py-6 sm:px-9">
        <button
          onClick={onMinimize}
          aria-label="Minimize"
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500 dark:text-sky-300">
          <Sparkles className="h-3.5 w-3.5" />
          Unlock Rex Pro
        </div>
        <div className="mt-3 flex items-end gap-1.5">
          <span className="text-4xl font-bold tracking-tight">{REX_PRO.priceLabel}</span>
          <span className="mb-1 text-sm text-muted-foreground">/month</span>
        </div>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Become a Rex Pro Trader and unlock unlimited AI-powered market intelligence.
        </p>
      </div>

      {/* Body */}
      <div className="grid gap-7 p-7 sm:px-9 md:grid-cols-2">
        {/* Benefits */}
        <div>
          <h3 className="text-sm font-semibold">What&apos;s included</h3>
          <ul className="mt-4 grid gap-2.5">
            {CHECKOUT_BENEFITS.map((b, i) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                className="flex items-center gap-2.5 text-sm"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 shadow-sm">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-foreground/90">{b}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Payment methods + summary */}
        <div>
          <h3 className="text-sm font-semibold">Choose Payment Method</h3>
          <div
            className={cn(
              "mt-4 space-y-2.5 transition-opacity",
              busy && "pointer-events-none opacity-60"
            )}
          >
            {METHODS.map((m) => {
              const isSel = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "group flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-200",
                    isSel
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/60 bg-card/40 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-colors",
                      isSel ? "bg-primary/10" : "bg-secondary"
                    )}
                  >
                    {m.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.sub}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                      isSel ? "border-primary bg-primary text-white" : "border-border"
                    )}
                  >
                    {isSel && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile-money phone */}
          <AnimatePresence>
            {needsPhone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="mt-4 block text-xs font-medium text-muted-foreground">
                  Mobile money number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={busy}
                  inputMode="tel"
                  placeholder="e.g. 6 71 23 45 67"
                  className="mt-1.5 w-full rounded-xl border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Order summary */}
          <div className="mt-5 rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">Rex Pro</p>
                <p className="text-xs text-muted-foreground">Monthly Subscription</p>
              </div>
              <span className="font-medium">{REX_PRO.priceLabel}</span>
            </div>
            <div className="my-3 h-px bg-border/60" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Today</span>
              <span className="text-lg font-bold">{REX_PRO.priceLabel}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Cancel anytime · No hidden fees
            </p>
          </div>
        </div>
      </div>

      {/* Primary action + security (full width) */}
      <div className="px-7 pb-7 sm:px-9">
        {error && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-rose-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        <div className="group relative">
          <div
            className={cn(
              "absolute -inset-0.5 rounded-2xl transition-opacity duration-300",
              busy ? "opacity-30" : "group-hover:opacity-70"
            )}
          />
          <Button
            size="lg"
            onClick={onPay}
            disabled={busy}
            className="relative h-14 w-full rounded-2xl text-base"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Unlock Rex Pro
              </>
            )}
          </Button>
        </div>

        <div className="mt-5 rounded-2xl border border-border/50 bg-card/30 p-4 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            Secure Checkout
          </p>
          <p className="mt-1 text-xs text-muted-foreground">256-bit SSL Encryption</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Payments processed securely. Your payment information is never stored on
            our servers.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Success view ------------------------------ */

function SuccessView({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-8 py-12 text-center sm:px-12"
    >
      <div className="relative mx-auto h-24 w-24">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full"
        />
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 12, delay: 0.05 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-emerald-500/10 shadow-sm"
        >
          <PartyPopper className="h-11 w-11 text-emerald-400" />
        </motion.div>
      </div>

      <h2 className="mt-7 text-2xl font-bold tracking-tight">🎉 Welcome to Rex Pro!</h2>
      <p className="mt-2 text-sm font-medium text-foreground/90">Congratulations!</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your subscription is now active. The following features are now unlocked:
      </p>

      <ul className="mx-auto mt-6 grid max-w-xs gap-2 text-left">
        {UNLOCKED.map((u, i) => (
          <motion.li
            key={u}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="flex items-center gap-2.5 text-sm"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/90">{u}</span>
          </motion.li>
        ))}
      </ul>

      <div className="mx-auto mt-8 max-w-xs">
        <Button size="lg" className="w-full rounded-2xl" onClick={onContinue}>
          <Sparkles className="h-4 w-4" />
          Continue Trading
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Failed view ------------------------------- */

function FailedView({
  onRetry,
  onChoose,
}: {
  onRetry: () => void;
  onChoose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-8 py-12 text-center sm:px-12"
    >
      <div className="relative mx-auto h-20 w-20">
        <div className="absolute inset-0 rounded-full" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-9 w-9" />
        </div>
      </div>

      <h2 className="mt-6 text-xl font-bold tracking-tight">
        We couldn&apos;t complete your payment.
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        No worries. Please try again or choose another payment method.
      </p>

      <div className="mx-auto mt-7 flex max-w-sm flex-col gap-2.5 sm:flex-row">
        <Button size="lg" className="flex-1 rounded-2xl" onClick={onRetry}>
          Try Again
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 rounded-2xl"
          onClick={onChoose}
        >
          Choose Another Method
        </Button>
      </div>
    </motion.div>
  );
}
