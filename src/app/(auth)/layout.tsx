import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthArtwork } from "@/components/auth/auth-artwork";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-background p-3 lg:p-4">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-4 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-2">
        {/* Left brand artwork */}
        <AuthArtwork />

        {/* Right content */}
        <div className="relative flex flex-col rounded-3xl border border-border bg-card p-6 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile logo */}
          <div className="mt-8 flex justify-center lg:hidden">
            <Logo />
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-md">{children}</div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} 4RexVision AI · See Beyond the Charts.
          </p>
        </div>
      </div>
    </div>
  );
}
