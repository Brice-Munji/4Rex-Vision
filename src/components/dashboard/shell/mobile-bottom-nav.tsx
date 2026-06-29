"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_ITEMS } from "./nav-items";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1.5">
        {MOBILE_NAV_ITEMS.slice(0, 2).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {/* center upload action */}
        <div className="flex justify-center">
          <Link
            href="/analyze"
            aria-label="Analyze chart"
            className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/40 transition-transform active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>

        {MOBILE_NAV_ITEMS.slice(2, 4).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: (typeof MOBILE_NAV_ITEMS)[number];
  pathname: string;
}) {
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
        active ? "text-sky-500 dark:text-sky-400" : "text-muted-foreground"
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
