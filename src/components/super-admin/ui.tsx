import * as React from "react";
import { cn } from "@/lib/utils";

/* Surfaces ---------------------------------------------------------------- */

export function AdminCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_10px_30px_-15px_rgba(0,0,0,0.7)]",
        className
      )}
      {...props}
    />
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--a-text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--a-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--a-muted)]">
      {children}
    </h2>
  );
}

/* Badges ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  success: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  online: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  trialing: "bg-sky-500/12 text-sky-400 border-sky-500/20",
  pending: "bg-amber-500/12 text-amber-400 border-amber-500/20",
  past_due: "bg-amber-500/12 text-amber-400 border-amber-500/20",
  failed: "bg-rose-500/12 text-rose-400 border-rose-500/20",
  offline: "bg-rose-500/12 text-rose-400 border-rose-500/20",
  canceled: "bg-zinc-500/12 text-zinc-400 border-zinc-500/20",
  inactive: "bg-zinc-500/12 text-zinc-400 border-zinc-500/20",
  refunded: "bg-fuchsia-500/12 text-fuchsia-400 border-fuchsia-500/20",
  admin: "bg-[#3b82f6]/12 text-[#3b82f6] border-[#3b82f6]/25",
  promo: "bg-fuchsia-500/12 text-fuchsia-400 border-fuchsia-500/20",
  payment: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20",
  super_admin: "bg-[#3b82f6]/12 text-[#3b82f6] border-[#3b82f6]/25",
  professional: "bg-[#3b82f6]/12 text-[#3b82f6] border-[#3b82f6]/25",
  pro: "bg-[#3b82f6]/12 text-[#3b82f6] border-[#3b82f6]/25",
  free: "bg-zinc-500/12 text-zinc-300 border-zinc-500/20",
  explorer: "bg-zinc-500/12 text-zinc-300 border-zinc-500/20",
  user: "bg-zinc-500/12 text-zinc-300 border-zinc-500/20",
};

const LABELS: Record<string, string> = {
  PROFESSIONAL: "Rex Pro",
  FREE: "Explorer",
  SUPER_ADMIN: "Super Admin",
  USER: "User",
};

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const key = value.toLowerCase();
  const style = STATUS_STYLES[key] ?? "bg-zinc-500/12 text-zinc-300 border-zinc-500/20";
  const label = LABELS[value] ?? value.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

/* Trend pill -------------------------------------------------------------- */

export function TrendPill({ pct, label }: { pct: number; label: string }) {
  const positive = pct >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        className={cn(
          "font-semibold",
          positive ? "text-emerald-400" : "text-rose-400"
        )}
      >
        {positive ? "+" : ""}
        {pct}%
      </span>
      <span className="text-[var(--a-muted)]">{label}</span>
    </span>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--a-border)] bg-[var(--a-surface-2)] px-6 py-12 text-center text-sm text-[var(--a-muted)]">
      {children}
    </div>
  );
}

/* Formatters -------------------------------------------------------------- */

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCurrency(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}
