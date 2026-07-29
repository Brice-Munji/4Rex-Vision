"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { THEME_OPTIONS } from "@/lib/constants";
import { updatePreferences } from "@/actions/profile";
import type { User, ThemePreference } from "@prisma/client";

const icons: Record<string, React.ElementType> = {
  DARK: Moon,
  LIGHT: Sun,
  SYSTEM: Monitor,
};

export function ProfileAppearance({ user }: { user: User }) {
  const { setTheme } = useTheme();
  const [pending, startTransition] = React.useTransition();
  const [pref, setPref] = React.useState<ThemePreference>(user.themePreference);

  function choose(value: ThemePreference) {
    setPref(value);
    setTheme(value.toLowerCase());
  }

  function save() {
    startTransition(async () => {
      const res = await updatePreferences({ themePreference: pref });
      if (res.ok) toast.success("Theme preference saved.");
      else toast.error(res.message ?? "Could not save.");
    });
  }

  return (
    <div className="rounded-3xl glass p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how 4RexVision AI looks on this device.
      </p>

      <div className="mt-6">
        <Label>Theme</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = icons[opt.value];
            const selected = pref === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => choose(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all",
                  selected
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-card/40 hover:border-primary/30"
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save preference
        </Button>
      </div>
    </div>
  );
}
