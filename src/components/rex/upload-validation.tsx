"use client";

import { ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/dashboard/progress-ring";
import type { UploadValidation } from "@/lib/rex/types";

export function UploadValidationSummary({
  validation,
}: {
  validation: UploadValidation;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        validation.reliable
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      )}
    >
      <div className="flex items-center gap-2">
        {validation.reliable ? (
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <span className="text-sm font-medium">
          {validation.reliable
            ? "Chart looks clear"
            : "Chart quality could be better"}
        </span>
        <span className="ml-auto text-sm font-semibold tabular-nums">
          {validation.overall}%
        </span>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {validation.checks.map((c) => (
          <div key={c.key}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-medium tabular-nums">{c.score}%</span>
            </div>
            <ProgressBar
              value={c.score}
              className="mt-1 h-1.5"
              barClassName={cn(!c.ok && "from-amber-500 to-orange-500")}
            />
          </div>
        ))}
      </div>

      {validation.message && (
        <p className="mt-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          {validation.message}
        </p>
      )}
    </div>
  );
}
