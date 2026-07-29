import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Direction } from "@/lib/dashboard-data";

const styles: Record<Direction, { className: string; icon: React.ElementType }> = {
  Bullish: {
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    icon: TrendingUp,
  },
  Bearish: {
    className: "border-rose-500/20 bg-rose-500/10 text-rose-500",
    icon: TrendingDown,
  },
  Neutral: {
    className: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    icon: Minus,
  },
};

export function DirectionBadge({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  const s = styles[direction];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        s.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {direction}
    </span>
  );
}
