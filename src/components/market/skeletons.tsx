import { Skeleton } from "@/components/ui/skeleton";

/** Rows of shimmering placeholders shared by every card while data loads. */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-14 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-2.5 w-1/2 rounded" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-3.5 w-full rounded" />
      <Skeleton className="h-3.5 w-11/12 rounded" />
      <Skeleton className="h-3.5 w-2/3 rounded" />
    </div>
  );
}
