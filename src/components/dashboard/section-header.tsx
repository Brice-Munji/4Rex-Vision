import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface DashSectionHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function DashSectionHeader({
  title,
  description,
  action,
}: DashSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-sky-500 transition-colors hover:text-sky-400"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
