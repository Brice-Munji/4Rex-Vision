"use client";

import { CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { ProgressRing } from "./progress-ring";
import { DISCIPLINE } from "@/lib/billing-data";

export function DisciplineScore() {
  return (
    <div className="rounded-3xl glass p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Shield className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-semibold">Trading Discipline</h2>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-col items-center">
          <ProgressRing value={DISCIPLINE.score} size={120} stroke={10}>
            <div className="text-center">
              <div className="text-2xl font-bold">{DISCIPLINE.grade}</div>
              <div className="text-[11px] text-muted-foreground">{DISCIPLINE.score}/100</div>
            </div>
          </ProgressRing>
          <span className="mt-2 text-xs text-muted-foreground">Overall grade</span>
        </div>

        <div className="grid flex-1 gap-5 sm:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Strengths
            </h3>
            <ul className="mt-2 space-y-1.5">
              {DISCIPLINE.strengths.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
              <AlertCircle className="h-4 w-4" />
              Needs improvement
            </h3>
            <ul className="mt-2 space-y-1.5">
              {DISCIPLINE.needsWork.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
