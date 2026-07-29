import Link from "next/link";
import { Zap, Infinity as InfinityIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface UsageMeterProps {
  used: number;
  limit: number;
  unlimited: boolean;
  plan: string;
}

export function UsageMeter({ used, limit, unlimited, plan }: UsageMeterProps) {
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);

  return (
    <div className="rounded-3xl glass p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Daily Analyses</h3>
            <p className="text-xs text-muted-foreground">{plan} plan</p>
          </div>
        </div>
      </div>

      {unlimited ? (
        <div className="mt-5 flex items-center gap-2 text-foreground">
          <InfinityIcon className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Unlimited</span>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight">
              {used}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {limit}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {remaining} left today
            </span>
          </div>
          <Progress value={pct} className="mt-3" />
          {remaining === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              You&apos;ve used all of today&apos;s analyses. Resets at 00:00 UTC.
            </p>
          )}
          <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
            <Link href="/billing">Upgrade for unlimited</Link>
          </Button>
        </>
      )}
    </div>
  );
}
