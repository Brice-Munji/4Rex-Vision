"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NAV_ITEMS } from "./nav-items";
import { PLAN_DISPLAY_NAMES } from "@/lib/constants";
import type { Plan } from "@prisma/client";

export interface ShellUser {
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
  plan: Plan;
}

interface SidebarProps {
  user: ShellUser;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ user, collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Trader";
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    "U";

  return (
    <div className="flex h-full flex-col">
      {/* brand + collapse */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border/60",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {collapsed ? (
          <Link href="/dashboard" aria-label="4RexVision AI" onClick={onNavigate}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" aria-label="4RexVision AI" onClick={onNavigate}>
            <Logo />
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:block"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mt-3 hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:block"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-xl border border-primary/30 bg-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  active && "text-primary"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* footer: plan + user */}
      <div className="shrink-0 space-y-3 border-t border-border/60 p-3">
        {!collapsed ? (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-primary/5 p-4">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Current plan
            </div>
            <div className="mt-1 text-base font-semibold">
              {PLAN_DISPLAY_NAMES[user.plan]}
            </div>
            <Link
              href="/billing"
              onClick={onNavigate}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all"
            >
              Upgrade
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <Link
            href="/billing"
            onClick={onNavigate}
            title="Upgrade plan"
            className="flex items-center justify-center rounded-xl bg-primary p-2.5 text-primary-foreground shadow-sm"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}

        <Link
          href="/profile"
          onClick={onNavigate}
          title={collapsed ? fullName : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            {user.avatar && <AvatarImage src={user.avatar} alt={fullName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{fullName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {user.email}
              </div>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
