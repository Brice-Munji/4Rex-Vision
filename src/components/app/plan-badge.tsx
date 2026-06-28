import { Crown, Sparkles, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_LABELS } from "@/lib/constants";
import type { Plan } from "@prisma/client";

const styles: Record<Plan, { className: string; icon: React.ElementType }> = {
  FREE: {
    className: "border-border bg-secondary text-muted-foreground",
    icon: Sparkles,
  },
  PROFESSIONAL: {
    className:
      "border-transparent bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-sm shadow-sky-500/30",
    icon: Crown,
  },
  ENTERPRISE: {
    className:
      "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-sm shadow-indigo-500/30",
    icon: Building2,
  },
};

export function PlanBadge({
  plan,
  className,
  showIcon = true,
}: {
  plan: Plan;
  className?: string;
  showIcon?: boolean;
}) {
  const s = styles[plan];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        s.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {PLAN_LABELS[plan]}
    </span>
  );
}
