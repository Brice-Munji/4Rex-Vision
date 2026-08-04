import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center">
        {/* Light mode: dark "R" monogram. Dark mode: light "R" monogram. */}
        <img
          src="/images/logo-mark-light.png"
          alt="4RexVision AI"
          width={36}
          height={36}
          className="h-full w-full object-contain dark:hidden"
        />
        <img
          src="/images/logo-mark-dark.png"
          alt="4RexVision AI"
          width={36}
          height={36}
          aria-hidden="true"
          className="hidden h-full w-full object-contain dark:block"
        />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        4RexVision <span className="text-gradient">AI</span>
      </span>
    </div>
  );
}
