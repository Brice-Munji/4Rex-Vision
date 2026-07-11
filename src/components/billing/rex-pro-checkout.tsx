"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Loader2,
  Sparkles,
  Lock,
  PartyPopper,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REX_PRO } from "@/lib/payments/catalog";
import type { PaymentMethodId } from "@/lib/payments/types";
import { startRexProCheckout, confirmRexProCheckout } from "@/actions/payments";

type Step = "select" | "processing" | "success" | "failed";

const POLL_INTERVAL = 1800;
const MAX_POLLS = 40; // ~72s window for a mobile-money approval

/** The curated benefits shown in checkout ("less is better"). */
const CHECKOUT_BENEFITS = [
  "Unlimited AI Analyses",
  "Unlimited AI Chat",
  "Unlimited Trading Journal",
  "Advanced RAE",
  "Multi-Timeframe Analysis",
  "AI Trading Coach",
  "PDF Reports",
  "Priority AI Processing",
];

/** Presentation for the four checkout rails (maps to catalog method ids). */
interface MethodCard {
  id: PaymentMethodId;
  name: string;
  sub: string;
  glyph: string;
  needsPhone?: boolean;
}

const METHODS: MethodCard[] = [
  {
    id: "mtn_momo",
    name: "MTN Mobile Money",
    sub: "Recommended for Cameroon",
    glyph: "📱",
    needsPhone: true,
  },
  {
    id: "orange_money",
    name: "Orange Money",
    sub: "Fast & Secure",
    glyph: "📱",
    needsPhone: true,
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    sub: "Cards • Bank • Mobile Money",
    glyph: "🌍",
  },
  {
    id: "card",
    name: "Visa / Mastercard",
    sub: "International Cards",
    glyph: "💳",
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function RexProCheckout({
  open,
  onOpenChange,
  resumeReference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the modal opens straight into verification for this reference
   * (used when a provider redirects the user back to /billing?ref=…). */
  resumeReference?: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = React.useState<Step>("select");
  const [method, setMethod] = React.useState<PaymentMethodId>("mtn_momo");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const activeRef = React.useRef(true);

  const selected = METHODS.find((m) => m.id === method);
  const needsPhone = !!selected?.needsPhone;

  React.useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  // Reset to the picker whenever the modal is (re)opened — unless we're resuming
  // a provider redirect, in which case jump straight to verification.
  const resumedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setPhone("");
    if (resumeReference && resumedRef.current !== resumeReference) {
      resumedRef.current = resumeReference;
      setStep("processing");
      pollUntilSettled(resumeReference);
    } else if (!resumeReference) {
      setStep("select");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumeReference]);

  function close() {
    if (step === "processing") return; // don't cancel mid-verification
    onOpenChange(false);
  }

  async function pollUntilSettled(reference: string) {
    for (let i = 0; i < MAX_POLLS; i++) {
      if (!activeRef.current) return;
      const res = await confirmRexProCheckout(reference);
      if (!res.ok) {
        setStep("failed");
        return;
      }
      if (res.status === "success") {
        await update({ plan: REX_PRO.plan }).catch(() => {});
        router.refresh();
        setStep("success");
        return;
      }
      if (res.status === "failed") {
        setStep("failed");
        return;
      }
      await sleep(POLL_INTERVAL);
    }
    setStep("failed"); // timed out waiting for approval
  }

  async function handlePay() {
    setError(null);
    if (needsPhone && phone.replace(/\D/g, "").length < 8) {
      setError("Enter the phone number linked to your mobile money account.");
      return;
    }
    setStep("processing");
    const started = await startRexProCheckout(method, needsPhone ? phone : undefined);
    if (!activeRef.current) return;

    if (!started.ok) {
      setStep("failed");
      return;
    }
    if (started.mode === "redirect") {
      window.location.href = started.redirectUrl;
      return;
    }
    await pollUntilSettled(started.reference);
  }

  const wide = step === "select";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-3 sm:p-6"
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-lg" onClick={close} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative my-auto w-full overflow-hidden rounded-[28px] glass-strong shadow-2xl shadow-black/50 ring-1 ring-white/10",
              wide ? "max-w-4xl" : "max-w-lg"
            )}
          >
            {/* ambient glow */}
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-sky-500/25 blur-[90px]" />
              <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-cyan-400/15 blur-[90px]" />
            </div>

            {step !== "processing" && (
              <button
                onClick={close}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <AnimatePresence mode="wait">
              {step === "select" && (
                <FadeSwap key="select">
                  <div className="grid md:grid-cols-2">
                    <SummaryPane />
                    <PaymentPane
                      method={method}
                      setMethod={setMethod}
                      needsPhone={needsPhone}
                      phone={phone}
                      setPhone={setPhone}
                      error={error}
                      onPay={handlePay}
                    />
                  </div>
                </FadeSwap>
              )}

              {step === "processing" && (
                <FadeSwap key="processing">
                  <ProcessingScreen needsPhone={needsPhone} />
                </FadeSwap>
              )}

              {step === "success" && (
                <FadeSwap key="success">
                  <SuccessScreen
                    onStart={() => {
                      onOpenChange(false);
                      router.push("/analyze");
                    }}
                    onDashboard={() => {
                      onOpenChange(false);
                      router.push("/dashboard");
                    }}
                  />
                </FadeSwap>
              )}

              {step === "failed" && (
                <FadeSwap key="failed">
                  <FailedScreen
                    onRetry={() => {
                      setError(null);
                      handlePay();
                    }}
                    onChoose={() => {
                      setError(null);
                      setStep("select");
                    }}
                  />
                </FadeSwap>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FadeSwap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------ LEFT COLUMN ------------------------------- */

function SummaryPane() {
  return (
    <div className="relative flex flex-col justify-between gap-8 border-b border-white/10 bg-gradient-to-br from-sky-500/10 via-transparent to-cyan-400/5 p-7 sm:p-9 md:border-b-0 md:border-r">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500 dark:text-sky-300">
          <Sparkles className="h-3.5 w-3.5" />
          Rex Pro
        </div>

        <div className="mt-5 flex items-end gap-1.5">
          <span className="text-5xl font-bold tracking-tight">{REX_PRO.priceLabel}</span>
          <span className="mb-1.5 text-sm text-muted-foreground">/month</span>
        </div>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Monthly Subscription
        </p>

        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Your personal AI Forex Analyst with unlimited market intelligence.
        </p>
      </div>

      <ul className="grid gap-2.5">
        {CHECKOUT_BENEFITS.map((b, i) => (
          <motion.li
            key={b}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
            className="flex items-center gap-2.5 text-sm"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-sm shadow-emerald-500/30">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="text-foreground/90">{b}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ RIGHT COLUMN ------------------------------ */

function PaymentPane({
  method,
  setMethod,
  needsPhone,
  phone,
  setPhone,
  error,
  onPay,
}: {
  method: PaymentMethodId;
  setMethod: (m: PaymentMethodId) => void;
  needsPhone: boolean;
  phone: string;
  setPhone: (p: string) => void;
  error: string | null;
  onPay: () => void;
}) {
  return (
    <div className="p-7 sm:p-9">
      <h2 className="text-base font-semibold">Choose Payment Method</h2>

      <div className="mt-4 space-y-2.5">
        {METHODS.map((m) => {
          const isSel = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                "group relative flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-200",
                isSel
                  ? "border-sky-500/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(14,165,233,0.5),0_8px_30px_-8px_rgba(14,165,233,0.5)]"
                  : "border-border/60 bg-card/40 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-secondary/40"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-colors",
                  isSel ? "bg-sky-500/20" : "bg-secondary"
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
                  isSel ? "border-sky-500 bg-sky-500 text-white" : "border-border"
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
              inputMode="tel"
              placeholder="e.g. 6 71 23 45 67"
              className="mt-1.5 w-full rounded-xl border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/30"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order summary */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-medium">Rex Pro</p>
            <p className="text-xs text-muted-foreground">Monthly</p>
          </div>
          <span className="font-medium">{REX_PRO.priceLabel}</span>
        </div>
        <div className="my-3 h-px bg-border/60" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Total Today</span>
          <span className="text-lg font-bold">{REX_PRO.priceLabel}</span>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          No hidden fees · Cancel anytime
        </p>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {/* Primary CTA with glow */}
      <div className="group relative mt-5">
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 opacity-40 blur-lg transition-opacity duration-300 group-hover:opacity-70 motion-safe:animate-pulse" />
        <Button
          size="lg"
          onClick={onPay}
          className="relative w-full rounded-2xl text-base"
        >
          <Sparkles className="h-4 w-4" />
          Unlock Rex Pro
        </Button>
      </div>

      {/* Security */}
      <div className="mt-5 rounded-2xl border border-border/50 bg-card/30 p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold">
          <Lock className="h-3.5 w-3.5 text-emerald-500" />
          Secure Checkout
        </p>
        <p className="mt-1 text-xs text-muted-foreground">256-bit SSL Encryption</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Payments processed securely. We never store your payment credentials.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ STATUS SCREENS ---------------------------- */

function ProcessingScreen({ needsPhone }: { needsPhone: boolean }) {
  return (
    <div className="px-8 py-14 text-center">
      <div className="relative mx-auto h-20 w-20">
        <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-500/10">
          <Loader2 className="h-9 w-9 animate-spin text-sky-500" />
        </div>
      </div>
      <h2 className="mt-6 text-xl font-bold tracking-tight">
        {needsPhone ? "Approve the payment on your phone" : "Confirming your payment"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {needsPhone
          ? "We sent a prompt to your mobile money line. Enter your PIN to approve — Rex Pro unlocks the moment it's confirmed."
          : "Securely verifying your payment. This only takes a moment."}
      </p>
    </div>
  );
}

function SuccessScreen({
  onStart,
  onDashboard,
}: {
  onStart: () => void;
  onDashboard: () => void;
}) {
  return (
    <div className="px-8 py-12 text-center">
      <div className="relative mx-auto h-24 w-24">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 rounded-full bg-emerald-500/25 blur-2xl"
        />
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 12, delay: 0.05 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-xl shadow-emerald-500/40"
        >
          <PartyPopper className="h-11 w-11 text-white" />
        </motion.div>
      </div>

      <h2 className="mt-7 text-2xl font-bold tracking-tight">🎉 Welcome to Rex Pro!</h2>
      <div className="mx-auto mt-3 max-w-sm space-y-1 text-sm text-muted-foreground">
        <p>Your subscription is now active.</p>
        <p>Unlimited AI analysis has been unlocked.</p>
        <p>Your AI Trading Coach is ready.</p>
      </div>

      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2.5 sm:flex-row">
        <Button size="lg" className="flex-1 rounded-2xl" onClick={onStart}>
          <Sparkles className="h-4 w-4" />
          Start My Next Analysis
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 rounded-2xl"
          onClick={onDashboard}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

function FailedScreen({
  onRetry,
  onChoose,
}: {
  onRetry: () => void;
  onChoose: () => void;
}) {
  return (
    <div className="px-8 py-12 text-center">
      <div className="relative mx-auto h-20 w-20">
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl" />
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
    </div>
  );
}
