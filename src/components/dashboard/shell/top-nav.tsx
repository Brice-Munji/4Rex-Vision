"use client";

import * as React from "react";
import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/app/user-nav";
import { NotificationsMenu } from "./notifications-menu";
import type { ShellUser } from "./sidebar";

function getGreeting(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

interface TopNavProps {
  user: ShellUser;
  onOpenMobileNav: () => void;
}

export function TopNav({ user, onOpenMobileNav }: TopNavProps) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const greeting = now ? getGreeting(now.getHours()) : "Welcome";
  const dateStr = now
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* mobile menu */}
        <button
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* greeting */}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight sm:text-base">
            {greeting}
            {user.firstName ? `, ${user.firstName}` : ""}
          </p>
          {dateStr && (
            <p className="truncate text-xs text-muted-foreground">{dateStr}</p>
          )}
        </div>

        {/* search */}
        <div className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search analyses, pairs…"
              className="h-10 w-full rounded-xl border border-input bg-card/50 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          >
            <Search className="h-5 w-5" />
          </button>
          <NotificationsMenu />
          <ThemeToggle />
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}
