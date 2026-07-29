"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MailWarning, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resendVerification } from "@/actions/verify";

export function VerifyBanner() {
  const [hidden, setHidden] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function resend() {
    startTransition(async () => {
      const res = await resendVerification();
      if (res.ok) toast.success(res.message ?? "Verification email sent.");
      else toast.error(res.message ?? "Could not send email.");
    });
  }

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-b border-amber-500/20 bg-amber-500/10"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
            <MailWarning className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="flex-1 text-amber-700 dark:text-amber-300">
              Please verify your email to secure your account.
            </p>
            <button
              onClick={resend}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-700 underline-offset-2 transition-colors hover:underline disabled:opacity-60 dark:text-amber-200"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Resend email
            </button>
            <button
              onClick={() => setHidden(true)}
              aria-label="Dismiss"
              className="rounded-lg p-1 text-amber-600/70 transition-colors hover:text-amber-700 dark:text-amber-300/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
