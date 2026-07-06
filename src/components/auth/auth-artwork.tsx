import Image from "next/image";
import Link from "next/link";

/**
 * Left-side brand artwork for the auth pages (login / sign up / etc.).
 * Displays the 4RexVision AI hero image, full-bleed on a matching dark panel.
 */
export function AuthArtwork() {
  return (
    <div className="relative hidden h-full min-h-[600px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950/50 to-slate-950 lg:flex">
      {/* ambient glows for depth behind the artwork */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-sky-500/20 blur-[110px]" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-[110px]" />
      </div>

      <Link
        href="/"
        aria-label="4RexVision AI home"
        className="relative flex h-full w-full items-center justify-center p-6 xl:p-10"
      >
        <Image
          src="/auth-hero.png"
          alt="4RexVision AI — See Beyond the Charts. AI-powered analysis, real-time market insights, economic intelligence and risk-aware decisions."
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-contain"
        />
      </Link>
    </div>
  );
}
