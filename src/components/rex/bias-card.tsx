"use client";

import { Scale, ArrowUpRight, ArrowDownRight, PauseCircle } from "lucide-react";
import { RexSection } from "./rex-section";
import { BiasPill } from "./rex-visuals";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { cn } from "@/lib/utils";
import type { BiasSection, SuggestedDirection } from "@/lib/rex/types";

const directionMeta: Record<
  SuggestedDirection,
  { icon: React.ElementType; className: string }
> = {
  "Buy Favored": { icon: ArrowUpRight, className: "text-emerald-500 bg-emerald-500/10" },
  "Sell Favored": { icon: ArrowDownRight, className: "text-rose-500 bg-rose-500/10" },
  Wait: { icon: PauseCircle, className: "text-amber-500 bg-amber-500/10" },
  "Wait For Confirmation": { icon: PauseCircle, className: "text-sky-500 bg-sky-500/10" },
};

export function BiasCard({ bias, delay }: { bias: BiasSection; delay?: number }) {
  const dir = directionMeta[bias.suggestedDirection];
  const DirIcon = dir.icon;

  return (
    <RexSection
      sectionNo={2}
      title="Market Bias"
      icon={<Scale className="h-5 w-5" />}
      delay={delay}
    >
      <div className="rounded-3xl glass p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <ProgressRing value={bias.confidence} size={92} stroke={9}>
              <div className="text-center">
                <div className="text-xl font-bold">{bias.confidence}%</div>
                <div className="text-[10px] text-muted-foreground">confidence</div>
              </div>
            </ProgressRing>
            <div>
              <span className="text-xs text-muted-foreground">Current bias</span>
              <div className="mt-1.5">
                <BiasPill bias={bias.bias} />
              </div>
            </div>
          </div>

          <div className="hidden h-16 w-px bg-border sm:block" />

          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Suggested direction</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", dir.className)}>
                <DirIcon className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold">{bias.suggestedDirection}</span>
            </div>
          </div>
        </div>

        <p className="mt-5 rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4 text-sm leading-relaxed text-foreground/80">
          {bias.summary}
        </p>
      </div>
    </RexSection>
  );
}
