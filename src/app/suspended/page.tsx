import type { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";
import { Logo } from "@/components/logo";
import { SuspendedActions } from "./suspended-actions";

export const metadata: Metadata = {
  title: "Account suspended · 4RexVision",
};

export default function SuspendedPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.06]" />
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <Ban className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
          Account suspended
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Your 4RexVision account has been suspended and you can&apos;t access the platform right
          now. If you believe this is a mistake, please contact support.
        </p>

        <SuspendedActions />

        <p className="mt-4 text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="/help" className="font-medium text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
