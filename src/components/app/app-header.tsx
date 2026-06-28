import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/app/user-nav";
import type { User } from "@prisma/client";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Profile", href: "/profile" },
];

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <UserNav
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              avatar: user.avatar,
              plan: user.plan,
            }}
          />
        </div>
      </div>
    </header>
  );
}
