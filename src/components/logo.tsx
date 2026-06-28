import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4C6.5 4 2.7 8.4 1.5 10.6c-.4.7-.4 1.5 0 2.2C2.7 15 6.5 19 12 19s9.3-4 10.5-6.2c.4-.7.4-1.5 0-2.2C21.3 8.4 17.5 4 12 4Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="11.5" r="3.2" fill="currentColor" />
        </svg>
      </div>
      <span className="text-lg font-semibold tracking-tight">
        4RexVision <span className="text-gradient">AI</span>
      </span>
    </div>
  );
}
