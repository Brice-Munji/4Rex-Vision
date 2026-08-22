"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import {
  Search,
  MoreHorizontal,
  Crown,
  CalendarPlus,
  ShieldX,
  RotateCcw,
  Ban,
  Eye,
  UserCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "./data-table";
import { StatusBadge, formatDate, relativeTime } from "./ui";
import { RelativeTime } from "./relative-time";
import { GrantProModal, type GrantMode } from "./grant-pro-modal";
import type { AdminUserRow, UserFilter } from "@/lib/admin/queries";

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "explorer", label: "Explorer" },
  { value: "pro", label: "Pro" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "high_usage", label: "High Usage" },
  { value: "new_users", label: "New Users" },
];

export function UsersTable({ initial }: { initial: AdminUserRow[] }) {
  const [rows, setRows] = React.useState<AdminUserRow[]>(initial);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<UserFilter>("all");
  const [loading, setLoading] = React.useState(false);
  const [menu, setMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);
  const [grant, setGrant] = React.useState<{
    mode: GrantMode;
    identifier: string;
    label: string;
  } | null>(null);
  const [view, setView] = React.useState<AdminUserRow | null>(null);

  const load = React.useCallback(async (s: string, f: UserFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s.trim()) params.set("search", s.trim());
      if (f !== "all") params.set("filter", f);
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setRows(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // debounced reload on search/filter change
  React.useEffect(() => {
    const t = setTimeout(() => load(search, filter), 300);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  React.useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  async function act(
    endpoint: string,
    body: Record<string, unknown>,
    successReload = true
  ) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      toast.success(data.message ?? "Done.");
      if (successReload) load(search, filter);
    } else {
      toast.error(data.message ?? data.error ?? "Action failed.");
    }
  }

  const columns: Column<AdminUserRow>[] = [
    {
      key: "username",
      header: "Username",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--a-text)]">{r.username}</span>
          {r.suspended && (
            <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-400">
              Suspended
            </span>
          )}
        </div>
      ),
    },
    { key: "email", header: "Email", cell: (r) => <span className="text-[var(--a-muted)]">{r.email}</span> },
    { key: "role", header: "Role", cell: (r) => <StatusBadge value={r.role} /> },
    { key: "plan", header: "Plan", cell: (r) => <StatusBadge value={r.plan} /> },
    {
      key: "sub",
      header: "Subscription",
      cell: (r) => <StatusBadge value={r.subscriptionStatus} />,
    },
    {
      key: "analyses",
      header: "Analyses Today",
      cell: (r) => <span className="tabular-nums text-[var(--a-text)]">{r.analysesToday}</span>,
    },
    {
      key: "last",
      header: "Last Active",
      cell: (r) => <span className="text-[var(--a-muted)]"><RelativeTime iso={r.lastActive} /></span>,
    },
    {
      key: "created",
      header: "Created",
      cell: (r) => <span className="text-[var(--a-muted)]">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenu((m) =>
              m?.id === r.id ? null : { id: r.id, x: rect.right, y: rect.bottom }
            );
          }}
          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--a-muted)] hover:bg-[var(--a-elev)] hover:text-[var(--a-text)]"
          aria-label="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const activeRow = rows.find((r) => r.id === menu?.id);

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--a-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--a-text)] outline-none placeholder:text-[var(--a-muted)] focus:border-[#3b82f6]"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--a-muted)]" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-[#3b82f6] bg-[#3b82f6]/12 text-[var(--a-text)]"
                  : "border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-muted)] hover:text-[var(--a-text)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        empty="No users match your filters."
        rowClassName={(r) => (r.suspended ? "opacity-60" : "")}
      />

      {/* Action menu (fixed-positioned) */}
      {menu && activeRow && (
        <div
          className="fixed z-[90] w-52 -translate-x-full rounded-xl border border-[#1f1f1f] bg-[#111111] p-1.5 shadow-2xl"
          style={{ left: menu.x, top: menu.y + 6 }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={Eye} onClick={() => { setView(activeRow); setMenu(null); }}>
            View User
          </MenuItem>
          <MenuItem
            icon={Crown}
            onClick={() => {
              setGrant({ mode: "grant", identifier: activeRow.email, label: activeRow.username });
              setMenu(null);
            }}
          >
            Grant Pro
          </MenuItem>
          <MenuItem
            icon={CalendarPlus}
            onClick={() => {
              setGrant({ mode: "extend", identifier: activeRow.email, label: activeRow.username });
              setMenu(null);
            }}
          >
            Extend Pro
          </MenuItem>
          <MenuItem
            icon={ShieldX}
            onClick={() => {
              act("/api/admin/revoke-pro", { identifier: activeRow.email });
              setMenu(null);
            }}
          >
            Revoke Pro
          </MenuItem>
          <MenuItem
            icon={RotateCcw}
            onClick={() => {
              act("/api/admin/reset-usage", { identifier: activeRow.email });
              setMenu(null);
            }}
          >
            Reset Daily Analyses
          </MenuItem>
          <div className="my-1 h-px bg-[#1f1f1f]" />
          <MenuItem
            icon={activeRow.suspended ? UserCheck : Ban}
            danger={!activeRow.suspended}
            onClick={() => {
              act("/api/admin/suspend", {
                identifier: activeRow.email,
                suspended: !activeRow.suspended,
              });
              setMenu(null);
            }}
          >
            {activeRow.suspended ? "Reactivate User" : "Suspend User"}
          </MenuItem>
        </div>
      )}

      <GrantProModal
        open={!!grant}
        mode={grant?.mode ?? "grant"}
        presetIdentifier={grant?.identifier}
        presetLabel={grant?.label}
        onClose={() => setGrant(null)}
        onDone={() => load(search, filter)}
      />

      {view && <UserDetails row={view} onClose={() => setView(null)} />}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#1a1a1a]",
        danger ? "text-rose-400" : "text-[#f5f5f5]"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function UserDetails({ row, onClose }: { row: AdminUserRow; onClose: () => void }) {
  const fields: [string, React.ReactNode][] = [
    ["Username", row.username],
    ["Email", row.email],
    ["Role", <StatusBadge key="r" value={row.role} />],
    ["Plan", <StatusBadge key="p" value={row.plan} />],
    ["Subscription", <StatusBadge key="s" value={row.subscriptionStatus} />],
    ["Source", row.subscriptionSource ?? "—"],
    ["Analyses today", row.analysesToday],
    ["Subscription ends", formatDate(row.subscriptionEnd)],
    ["Last active", relativeTime(row.lastActive)],
    ["Joined", formatDate(row.createdAt)],
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 text-[#f5f5f5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">{row.username}</h3>
        <dl className="space-y-2.5">
          {fields.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 border-b border-[#1a1a1a] pb-2.5 last:border-0">
              <dt className="text-xs uppercase tracking-wider text-[#a3a3a3]">{k}</dt>
              <dd className="text-right text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] py-2.5 text-sm text-[#a3a3a3] hover:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
