import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crosshair, Crown, Lock, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { TrackedSetupsList } from "@/components/dashboard/tracked-setups-list";
import { getTrackedSetupsAccess } from "@/lib/rex/lifecycle-access";
import { listTrackedSetups } from "@/lib/rex/lifecycle";

export const metadata: Metadata = {
  title: "Tracked Setups · 4RexVision",
};

export const dynamic = "force-dynamic";

/** Small, proportionate locked state — NOT a redesign of Journal's bigger
 *  marketing preview (that page has stats/charts to tease; this one is a
 *  plain read-only list, so a short explainer card is all that's warranted). */
function TrackedSetupsLocked() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border glass p-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Crown className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-semibold">Tracked Setups is a Rex Pro feature</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Rex Pro automatically retains every directional Rex Trade Setup you generate and monitors what
        happens to it using your later chart uploads — so you can come back days later and see its
        current status. Upgrade to start tracking your setups.
      </p>
      <Link
        href="/billing"
        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
      >
        <Lock className="h-4 w-4" />
        Unlock with Rex Pro
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function TrackedSetupsPage() {
  const access = await getTrackedSetupsAccess();
  if (!access) redirect("/login");

  // Free users with no preserved tracked setups see the locked explainer —
  // a lapsed Pro with existing data still gets read-only access below.
  if (!access.canView) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<Crosshair className="h-5 w-5" />}
          title="Tracked Setups"
          description="Monitor what happens to a trade setup after it's generated."
        />
        <TrackedSetupsLocked />
      </div>
    );
  }

  const setups = await listTrackedSetups(access.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Crosshair className="h-5 w-5" />}
        title="Tracked Setups"
        description="Every generated trade setup, with its current lifecycle status and original levels — read-only."
      />
      <TrackedSetupsList setups={setups} />
    </div>
  );
}
