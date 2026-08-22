"use client";

import * as React from "react";
import { Loader2, Save, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  EXPERIENCE_OPTIONS,
  TRADING_STYLE_OPTIONS,
  CURRENCY_PAIRS,
} from "@/lib/constants";
import { updatePreferences } from "@/actions/profile";
import type {
  User,
  ExperienceLevel,
  TradingStyle,
} from "@prisma/client";

export function ProfilePreferences({ user }: { user: User }) {
  const [pending, startTransition] = React.useTransition();
  const [experience, setExperience] = React.useState<ExperienceLevel | null>(
    user.experienceLevel
  );
  const [style, setStyle] = React.useState<TradingStyle | null>(
    user.tradingStyle
  );
  const [pairs, setPairs] = React.useState<string[]>(user.favoritePairs ?? []);

  function togglePair(p: string) {
    setPairs((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePreferences({
        experienceLevel: experience ?? undefined,
        tradingStyle: style ?? undefined,
        favoritePairs: pairs,
      });
      if (res.ok) toast.success(res.message ?? "Preferences saved.");
      else toast.error(res.message ?? "Could not save preferences.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl glass p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Trading preferences</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tune how the AI frames your analysis.
      </p>

      {/* experience */}
      <div className="mt-6">
        <Label>Experience level</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={experience === opt.value}
              onClick={() => setExperience(opt.value)}
              label={opt.label}
            />
          ))}
        </div>
      </div>

      {/* style */}
      <div className="mt-6">
        <Label>Trading style</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TRADING_STYLE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={style === opt.value}
              onClick={() => setStyle(opt.value)}
              label={opt.label}
            />
          ))}
        </div>
      </div>

      {/* pairs */}
      <div className="mt-6">
        <Label>Favorite pairs</Label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CURRENCY_PAIRS.map((p) => (
            <Chip
              key={p}
              selected={pairs.includes(p)}
              onClick={() => togglePair(p)}
              label={p}
              compact
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save preferences
        </Button>
      </div>
    </form>
  );
}

function Chip({
  selected,
  onClick,
  label,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-all",
        compact ? "px-2 py-2.5" : "px-3 py-3",
        selected
          ? "border-sky-500/50 bg-sky-500/10 text-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-sky-500/30 hover:text-foreground"
      )}
    >
      {selected && <Check className="h-3.5 w-3.5 text-sky-500" strokeWidth={3} />}
      {label}
    </button>
  );
}
