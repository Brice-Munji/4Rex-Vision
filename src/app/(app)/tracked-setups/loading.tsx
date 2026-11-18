import { Crosshair } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading state (Sprint 3) — Next.js renders this automatically
 * while the Server Component page.tsx awaits getTrackedSetupsAccess()/
 * listTrackedSetups(). Reuses the existing PageHeader + Skeleton primitives
 * (the same Skeleton building block used elsewhere in the app) rather than
 * introducing new loading UI, and mirrors the real page's eventual layout
 * (header + a handful of row-shaped placeholders) so there's no visible
 * jump once the real data arrives.
 */
export default function TrackedSetupsLoading() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Crosshair className="h-5 w-5" />}
        title="Tracked Setups"
        description="Every generated trade setup, with its current lifecycle status and original levels — read-only."
      />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
