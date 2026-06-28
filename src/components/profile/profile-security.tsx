"use client";

import * as React from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { changePassword } from "@/actions/profile";
import { changePasswordSchema } from "@/lib/validations";

export function ProfileSecurity() {
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [values, setValues] = React.useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const formRef = React.useRef<HTMLFormElement>(null);

  function set(field: keyof typeof values, v: string) {
    setValues((s) => ({ ...s, [field]: v }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse(values);
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
      const res = await changePassword(values);
      if (res.ok) {
        toast.success(res.message ?? "Password changed.");
        setValues({ currentPassword: "", password: "", confirmPassword: "" });
        formRef.current?.reset();
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.message ?? "Could not change password.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-3xl glass p-6 sm:p-8"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Password</h2>
          <p className="text-sm text-muted-foreground">
            Use a strong, unique password.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <PasswordInput
            id="currentPassword"
            value={values.currentPassword}
            onChange={(e) => set("currentPassword", e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            disabled={pending}
          />
          {errors.currentPassword && (
            <p className="text-xs text-red-500">{errors.currentPassword}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <PasswordInput
              id="confirmNewPassword"
              value={values.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              disabled={pending}
            />
          </div>
        </div>
        <PasswordStrengthMeter password={values.password} />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password}</p>
        )}
        {errors.confirmPassword && (
          <p className="text-xs text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </div>
    </form>
  );
}
