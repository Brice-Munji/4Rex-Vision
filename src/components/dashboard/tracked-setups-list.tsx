"use client";

/**
 * Tracked Setups (Sprint 1.1) — read-only list of the user's own
 * TradeSetupLifecycleDTO rows, newest generated first. Purely presentational:
 * all data is passed in already-fetched from the Server Component page
 * (no client fetch, no mutation, nothing here can change a setup's state).
 * Reuses the EXISTING Accordion primitive (components/ui/accordion.tsx),
 * DirectionBadge and EmptyState rather than introducing new UI components.
 */
import * as React from "react";
import { Crosshair, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DirectionBadge } from "./direction-badge";
import { EmptyState } from "./empty-state";
import { lifecycleMeta, formatLifecyclePrice } from "@/components/rex/lifecycle-display";
import type { TradeSetupLifecycleDTO } from "@/lib/rex/setup-lifecycle";

/** Deterministic absolute timestamp (UTC) — same convention as
 *  analysis-history-list.tsx's own exactTime, for visual consistency. */
function exactTime(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(iso)) + " UTC"
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function TrackedSetupRow({ setup }: { setup: TradeSetupLifecycleDTO }) {
  const meta = lifecycleMeta(setup.state);
  const Icon = meta.icon;

  return (
    <AccordionItem value={setup.id}>
      <AccordionTrigger>
        <div className="flex flex-1 flex-wrap items-center gap-2.5 pr-3 text-left sm:gap-3">
          <span className="font-semibold text-foreground">{setup.pair}</span>
          <DirectionBadge direction={setup.bias} />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
              meta.className
            )}
          >
            <Icon className="h-3 w-3" />
            {meta.emphasize ?? meta.label}
          </span>
          <span className="text-xs text-muted-foreground sm:ml-auto">
            Generated {exactTime(setup.generatedAt)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Entry zone (original)" value={setup.entryZone} />
          <DetailRow label="Stop loss / invalidation (original)" value={setup.invalidationZone} />
          <DetailRow label="Take profit 1 (original)" value={setup.target1} />
          <DetailRow label="Take profit 2 (original)" value={setup.target2} />
          <DetailRow label="Risk:Reward (original)" value={setup.riskReward} />
          <DetailRow label="Timeframe" value={setup.timeframe ?? "Unknown"} />
          <DetailRow label="Price at generation" value={formatLifecyclePrice(setup.priceAtGeneration)} />
          <DetailRow label="Latest verified price" value={formatLifecyclePrice(setup.lastPrice)} />
          <DetailRow
            label="Last monitoring check"
            value={setup.lastCheckedAt ? exactTime(setup.lastCheckedAt) : "No follow-up upload yet"}
          />
        </div>

        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Lifecycle history
          </p>
          {setup.observations.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {setup.observations.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{exactTime(o.observedAt)}</span>
                  <span className="font-mono tabular-nums text-foreground">{formatLifecyclePrice(o.price)}</span>
                  <span className="font-medium text-foreground">{lifecycleMeta(o.state).label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No monitoring checks recorded yet — this updates automatically the next time you analyze a{" "}
              {setup.pair} chart. Rex has no live price feed, so status only advances on a new upload.
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function TrackedSetupsList({ setups }: { setups: TradeSetupLifecycleDTO[] }) {
  if (setups.length === 0) {
    return (
      <EmptyState
        icon={<Crosshair className="h-7 w-7" />}
        title="No tracked setups yet"
        description="Every directional Rex Trade Setup you generate is automatically tracked here, and its status updates as you analyze new charts for that pair."
        action={{ label: "Analyze a chart", href: "/analyze", icon: <ArrowUpRight className="h-4 w-4" /> }}
      />
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {setups.map((s) => (
        <TrackedSetupRow key={s.id} setup={s} />
      ))}
    </Accordion>
  );
}
