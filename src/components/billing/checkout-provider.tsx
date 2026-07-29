"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { REX_PRO } from "@/lib/payments/catalog";
import type { PaymentMethodId } from "@/lib/payments/types";
import { startRexProCheckout, confirmRexProCheckout } from "@/actions/payments";
import { RexProCheckoutOverlay, type CheckoutStep } from "./rex-pro-checkout";
import { MinimizedCheckout } from "./minimized-checkout";

interface CheckoutContextValue {
  /** Open (or resume) the checkout overlay. */
  open: () => void;
  isOpen: boolean;
  isMinimized: boolean;
}

const CheckoutContext = React.createContext<CheckoutContextValue | null>(null);

export function useCheckout(): CheckoutContextValue {
  const ctx = React.useContext(CheckoutContext);
  if (!ctx) {
    throw new Error("useCheckout must be used within <CheckoutProvider>.");
  }
  return ctx;
}

const POLL_INTERVAL = 1800;
const MAX_POLLS = 40; // ~72s window for a mobile-money approval

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * App-wide checkout state. Mounted once in the (app) layout so the overlay
 * survives route navigation, supports minimize-to-widget, and never loses the
 * user's progress. All payment logic lives here; the overlay is presentational.
 */
export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { update } = useSession();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [step, setStep] = React.useState<CheckoutStep>("select");
  const [method, setMethod] = React.useState<PaymentMethodId>("mtn_momo");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pollUntilSettled = React.useCallback(
    async (reference: string) => {
      for (let i = 0; i < MAX_POLLS; i++) {
        if (!mounted.current) return;
        const res = await confirmRexProCheckout(reference);
        if (!res.ok) {
          setStep("failed");
          setIsMinimized(false);
          return;
        }
        if (res.status === "success") {
          await update({ plan: REX_PRO.plan }).catch(() => {});
          router.refresh(); // reflect the new plan on the current page (no redirect)
          setStep("success");
          setIsMinimized(false); // surface the celebration even if minimized
          return;
        }
        if (res.status === "failed") {
          setStep("failed");
          setIsMinimized(false);
          return;
        }
        await sleep(POLL_INTERVAL);
      }
      setStep("failed"); // timed out waiting for approval
      setIsMinimized(false);
    },
    [router, update]
  );

  // Resume a checkout after a provider (e.g. Flutterwave) redirects back with ?ref=.
  const resumedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && resumedRef.current !== ref) {
      resumedRef.current = ref;
      setIsOpen(true);
      setIsMinimized(false);
      setStep("processing");
      pollUntilSettled(ref);
      // Strip the query param without a navigation.
      params.delete("ref");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : "")
      );
    }
  }, [pollUntilSettled]);

  const handlePay = React.useCallback(async () => {
    setError(null);
    const needsPhone =
      method === "mtn_momo" || method === "orange_money";
    if (needsPhone && phone.replace(/\D/g, "").length < 8) {
      setError("Enter the phone number linked to your mobile money account.");
      return;
    }
    setStep("processing");
    const started = await startRexProCheckout(method, needsPhone ? phone : undefined);
    if (!mounted.current) return;

    if (!started.ok) {
      setStep("failed");
      return;
    }
    if (started.mode === "redirect") {
      window.location.href = started.redirectUrl;
      return;
    }
    await pollUntilSettled(started.reference);
  }, [method, phone, pollUntilSettled]);

  const open = React.useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const minimize = React.useCallback(() => setIsMinimized(true), []);
  const resume = React.useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  // Full close — resets progress. Used by "Continue Trading" and widget dismiss.
  const closeFully = React.useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setStep("select");
    setError(null);
    setPhone("");
    setMethod("mtn_momo");
  }, []);

  const value = React.useMemo<CheckoutContextValue>(
    () => ({ open, isOpen, isMinimized }),
    [open, isOpen, isMinimized]
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}

      <RexProCheckoutOverlay
        open={isOpen && !isMinimized}
        step={step}
        method={method}
        setMethod={setMethod}
        phone={phone}
        setPhone={setPhone}
        error={error}
        onPay={handlePay}
        onMinimize={minimize}
        onRetry={() => {
          setError(null);
          handlePay();
        }}
        onChoose={() => {
          setError(null);
          setStep("select");
        }}
        onContinue={closeFully}
      />

      <MinimizedCheckout
        open={isOpen && isMinimized}
        step={step}
        onResume={resume}
        onDismiss={closeFully}
      />
    </CheckoutContext.Provider>
  );
}
