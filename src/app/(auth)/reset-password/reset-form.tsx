"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, ShieldX, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { resetPassword } from "@/actions/auth";
import { resetPasswordSchema } from "@/lib/validations";

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [values, setValues] = React.useState({ password: "", confirmPassword: "" });

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Invalid link</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
          This password reset link is missing or malformed. Request a new one to
          continue.
        </p>
        <Button className="mt-8 w-full" asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ ...values, token });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await resetPassword({ ...values, token });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2200);
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.message ?? "Could not reset password.");
      }
    });
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10"
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </motion.div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Password updated</h1>
        <p className="mt-2 text-muted-foreground">
          Redirecting you to sign in…
        </p>
        <Button className="mt-8 w-full" asChild>
          <Link href="/login">Continue to sign in</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a strong password you haven&apos;t used before.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            value={values.password}
            onChange={(e) =>
              setValues((v) => ({ ...v, password: e.target.value }))
            }
            placeholder="Create a strong password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            disabled={pending}
          />
          <PasswordStrengthMeter password={values.password} />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            value={values.confirmPassword}
            onChange={(e) =>
              setValues((v) => ({ ...v, confirmPassword: e.target.value }))
            }
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            disabled={pending}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Updating…" : "Reset password"}
        </Button>
      </form>

      <Button variant="ghost" className="mt-6 w-full" asChild>
        <Link href="/login">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </Button>
    </motion.div>
  );
}
