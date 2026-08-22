"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/actions/auth";

export function ForgotForm() {
  const [pending, startTransition] = React.useTransition();
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await requestPasswordReset({ email });
      if (res.ok) {
        setSent(true);
      } else {
        setError(res.fieldErrors?.email ?? res.message ?? "Something went wrong.");
        toast.error(res.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10"
          >
            <MailCheck className="h-8 w-8 text-emerald-500" />
          </motion.div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Check your inbox</h1>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, we&apos;ve
            sent a link to reset your password. It expires in 1 hour.
          </p>
          <div className="mt-8 space-y-3">
            <Button
              variant="secondary"
              className="h-14 w-full"
              onClick={() => setSent(false)}
            >
              Use a different email
            </Button>
            <Button variant="ghost" className="h-14 w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
            <p className="mt-2 text-muted-foreground">
              No worries. Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="pl-10"
                  aria-invalid={!!error}
                  disabled={pending}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <Button type="submit" size="lg" className="h-14 w-full" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <Button variant="ghost" className="mt-6 h-14 w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
