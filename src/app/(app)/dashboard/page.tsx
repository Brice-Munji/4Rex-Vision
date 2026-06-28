import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  Upload,
  Rocket,
  BookOpen,
  Newspaper,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/app/plan-badge";
import { UsageMeter } from "@/components/app/usage-meter";

export const metadata: Metadata = {
  title: "Dashboard · 4RexVision AI",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const usage = await getUsageSummary(user);

  return (
    <div className="space-y-8">
      {/* greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user.firstName ?? "Trader"}
            </h1>
            <PlanBadge plan={user.plan} />
          </div>
          <p className="mt-1 text-muted-foreground">
            Your AI trading workspace is ready. Upload a chart to begin.
          </p>
        </div>
        <Button size="lg" disabled>
          <Upload className="h-4 w-4" />
          Upload Screenshot
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* primary empty state */}
        <div className="lg:col-span-2">
          <div className="relative flex h-full min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-3xl glass p-10 text-center">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-[100px]" />
              <div className="absolute inset-0 bg-grid mask-radial opacity-[0.2]" />
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="relative mt-6 text-xl font-semibold">
              No analyses yet
            </h2>
            <p className="relative mt-2 max-w-sm text-sm text-muted-foreground">
              Your AI analysis engine is being prepared. Soon you&apos;ll drop a
              chart screenshot here and receive a full professional breakdown in
              seconds.
            </p>
            <div className="relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-600 dark:text-sky-300">
              <Rocket className="h-3.5 w-3.5" />
              AI analysis coming soon
            </div>
          </div>
        </div>

        {/* usage + quick links */}
        <div className="space-y-6">
          <UsageMeter
            used={usage.used}
            limit={usage.limit}
            unlimited={usage.unlimited}
            plan={PLAN_LABELS[user.plan]}
          />

          <div className="rounded-3xl glass p-6">
            <h3 className="text-sm font-semibold">Quick links</h3>
            <div className="mt-4 space-y-2">
              {[
                { label: "Trading Journal", icon: BookOpen, href: "/dashboard" },
                { label: "Economic News", icon: Newspaper, href: "/dashboard" },
                { label: "Edit Profile", icon: ArrowRight, href: "/profile" },
              ].map((q) => (
                <Link
                  key={q.label}
                  href={q.href}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors hover:bg-secondary"
                >
                  <q.icon className="h-4 w-4 text-muted-foreground" />
                  {q.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
