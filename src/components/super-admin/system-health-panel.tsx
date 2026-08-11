"use client";

import * as React from "react";
import {
  Sparkles,
  Database,
  Gauge,
  AlertTriangle,
  ListOrdered,
  Users2,
  CircleAlert,
} from "lucide-react";
import { AdminCard, SectionTitle, formatDate } from "./ui";
import type { SystemHealth } from "@/lib/admin/queries";

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {ok && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      )}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-500"}`}
      />
    </span>
  );
}

function HealthCard({
  icon: Icon,
  label,
  value,
  status,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  status?: "online" | "offline";
  hint?: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--a-surface-2)] text-[var(--a-muted)]">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <span className="text-sm text-[var(--a-muted)]">{label}</span>
        </div>
        {status && <Dot ok={status === "online"} />}
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--a-text)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--a-muted)]">{hint}</p>}
    </AdminCard>
  );
}

export function SystemHealthPanel({ initial }: { initial: SystemHealth }) {
  const [data, setData] = React.useState<SystemHealth>(initial);

  React.useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/system-health", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } catch {
        /* ignore */
      }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HealthCard
          icon={Sparkles}
          label="Gemini Vision"
          value={data.gemini.status === "online" ? "Online" : "Offline"}
          status={data.gemini.status}
          hint={
            data.gemini.providers.length
              ? `Providers: ${data.gemini.providers.join(", ")}`
              : "No vision provider configured"
          }
        />
        <HealthCard
          icon={Database}
          label="Database"
          value={data.database.status === "online" ? "Online" : "Offline"}
          status={data.database.status}
          hint={`Ping ${data.database.latencyMs}ms`}
        />
        <HealthCard
          icon={Gauge}
          label="API Latency"
          value={`${data.apiLatencyMs}ms`}
          hint="DB round-trip"
        />
        <HealthCard
          icon={AlertTriangle}
          label="Error Rate"
          value={`${data.errorRate}%`}
          hint="Failed transactions · 24h"
        />
        <HealthCard
          icon={ListOrdered}
          label="Queue Size"
          value={data.queueSize}
          hint="Pending background jobs"
        />
        <HealthCard
          icon={Users2}
          label="Active Sessions"
          value={data.activeSessions}
          hint="Currently valid sessions"
        />
      </div>

      <AdminCard className="p-5">
        <SectionTitle>Recent Errors</SectionTitle>
        <div className="mt-4 space-y-2">
          {data.recentErrors.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-4 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              No errors reported. All systems nominal.
            </div>
          ) : (
            data.recentErrors.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-3"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--a-text)]">{e.message}</p>
                  <p className="text-xs text-[var(--a-muted)]">{formatDate(e.time, true)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminCard>
    </div>
  );
}
