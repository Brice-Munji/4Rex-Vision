"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar, type ShellUser } from "./sidebar";
import { TopNav } from "./top-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { VerifyBanner } from "@/components/app/verify-banner";

interface DashboardShellProps {
  user: ShellUser;
  showVerifyBanner?: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  showVerifyBanner,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Restore persisted collapse preference.
  React.useEffect(() => {
    const stored = window.localStorage.getItem("sidebar-collapsed");
    if (stored) setCollapsed(stored === "1");
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => {
      window.localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }, []);

  // Close the mobile drawer on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border/60 bg-card/40 backdrop-blur-xl transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <Sidebar user={user} collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border/60 bg-card/95 backdrop-blur-xl lg:hidden"
            >
              <Sidebar
                user={user}
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64"
        )}
      >
        <TopNav user={user} onOpenMobileNav={() => setMobileOpen(true)} />
        {showVerifyBanner && <VerifyBanner />}

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-7xl"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
