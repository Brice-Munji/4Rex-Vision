/**
 * Shared, read-only presentation helpers for Trade Setup Lifecycle
 * Monitoring. Pure UI mapping (icons/colors/labels) only — no business
 * logic, no data fetching, no mutation. Used by BOTH the in-modal
 * LifecyclePanel (rex-trade-setup.tsx) and the Tracked Setups page, so the
 * visual meaning of a lifecycle state is defined in exactly one place.
 */
import {
  type LucideIcon,
  Gauge,
  Crosshair,
  Target,
  Ban,
  Check,
  ShieldAlert,
  Minus,
} from "lucide-react";
import type { LifecycleState } from "@/lib/rex/setup-lifecycle";

export const LIFECYCLE_META: Record<
  LifecycleState,
  { icon: LucideIcon; className: string; label: string; emphasize?: string }
> = {
  ACTIVE: { icon: Gauge, className: "border-[#2a2a2a] bg-[#161616] text-[#A3A3A3]", label: "Active" },
  APPROACHING_ENTRY: {
    icon: Crosshair,
    className: "border-amber-500/40 bg-amber-500/15 text-amber-400",
    label: "Approaching entry",
  },
  ENTRY_ZONE_REACHED: {
    icon: Target,
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    label: "Entry zone reached",
  },
  ENTRY_MISSED: {
    icon: Ban,
    className: "border-rose-500/40 bg-rose-500/15 text-rose-400",
    label: "Entry missed",
    emphasize: "DON'T CHASE",
  },
  TARGET_APPROACHING: {
    icon: Target,
    className: "border-amber-500/40 bg-amber-500/15 text-amber-400",
    label: "Target approaching",
  },
  TP1_HIT: { icon: Check, className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400", label: "TP1 hit" },
  TP2_HIT: { icon: Check, className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400", label: "TP2 hit" },
  INVALIDATED: {
    icon: ShieldAlert,
    className: "border-rose-500/40 bg-rose-500/15 text-rose-400",
    label: "Invalidated",
  },
  UNVERIFIED: {
    icon: Minus,
    className: "border-[#2a2a2a] bg-[#161616] text-[#7A7A7A]",
    label: "Unverified",
  },
};

/** Resolve metadata for a state, falling back to UNVERIFIED's neutral
 *  styling for any unrecognized value rather than guessing a confirmed one. */
export function lifecycleMeta(state: LifecycleState | string) {
  return LIFECYCLE_META[state as LifecycleState] ?? LIFECYCLE_META.UNVERIFIED;
}

/** Light display rounding only (never used for any trading decision) — caps
 *  floating-point noise on a parsed chart price without pair-specific precision. */
export function formatLifecyclePrice(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "—";
  return String(Number(price.toFixed(5)));
}
