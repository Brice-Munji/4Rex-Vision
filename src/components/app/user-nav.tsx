"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User as UserIcon,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlanBadge } from "@/components/app/plan-badge";
import { logoutUser } from "@/actions/login";
import type { Plan } from "@prisma/client";

interface UserNavProps {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatar: string | null;
    plan: Plan;
  };
}

const menu = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/profile", icon: UserIcon },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Trader";
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    "U";

  function handleLogout() {
    setLoggingOut(true);
    logoutUser().finally(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-2xl border border-transparent p-1 pr-2 transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-9 w-9">
            {user.avatar && <AvatarImage src={user.avatar} alt={fullName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight">
              {fullName}
            </span>
            <span className="block text-xs leading-tight text-muted-foreground">
              {user.email}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar className="h-10 w-10">
            {user.avatar && <AvatarImage src={user.avatar} alt={fullName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{fullName}</div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="px-3 pb-2">
          <PlanBadge plan={user.plan} />
        </div>

        <DropdownMenuSeparator />

        {menu.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>
              <item.icon />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
          className="text-red-500 focus:text-red-500 [&_svg]:text-red-500"
        >
          {loggingOut ? (
            <Loader2 className="animate-spin" />
          ) : (
            <LogOut />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
