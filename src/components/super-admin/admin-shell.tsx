"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./nav";

export interface AdminShellUser {
  name: string;
  email: string;
}

export function AdminShell({
  user,
  children,
}: {
  user: AdminShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const current =
    ADMIN_NAV.find(
      (n) => pathname === n.href || (n.href !== "/super-admin" && pathname.startsWith(n.href))
    ) ?? ADMIN_NAV[0];

  const initials =
    user.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <div className="admin-scope flex min-h-screen w-full">
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--a-border)] bg-[var(--a-surface)] transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[260px]"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--a-border)] bg-[var(--a-surface)] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
            >
              <SidebarContent
                collapsed={false}
                pathname={pathname}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--a-border)] bg-[var(--a-bg)]/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--a-muted)]">
                Owner Command Center
              </p>
              <h2 className="text-sm font-semibold text-[var(--a-text)]">
                {current.label}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-1.5 text-xs text-[var(--a-muted)] transition-colors hover:text-[var(--a-text)] sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-[var(--a-text)]">{user.name}</p>
                <p className="text-[11px] text-[var(--a-muted)]">Super Admin</p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#3b82f6] text-xs font-bold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  collapsed,
  pathname,
  onClose,
  onToggleCollapse,
}: {
  collapsed: boolean;
  pathname: string;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-[var(--a-border)]",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        <Link href="/super-admin" className="flex items-center gap-2.5 overflow-hidden">
          {/* RexVision logo mark — admin portal is a fixed dark surface, so the
              dark-background (light) variant is used here. */}
          <img
            src="/images/logo-mark-dark.png"
            alt="4RexVision"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          {!collapsed && (
            <span className="whitespace-nowrap text-sm font-semibold text-[var(--a-text)]">
              4RexVision <span className="text-[var(--a-muted)]">Admin</span>
            </span>
          )}
        </Link>
        {onClose && (
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--a-muted)] hover:text-[var(--a-text)] lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {ADMIN_NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/super-admin" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-[#3b82f6]/12 text-[var(--a-text)]"
                  : "text-[var(--a-muted)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-[#3b82f6]" : ""
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {onToggleCollapse && (
        <div className="border-t border-[var(--a-border)] p-3">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--a-muted)] transition-colors hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
