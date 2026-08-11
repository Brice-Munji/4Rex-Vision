import {
  LayoutDashboard,
  Users,
  BadgeCheck,
  Activity,
  BarChart3,
  CreditCard,
  ScrollText,
  HeartPulse,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
  { label: "Users", href: "/super-admin/users", icon: Users },
  { label: "Pro Subscribers", href: "/super-admin/pro-subscribers", icon: BadgeCheck },
  { label: "Analysis Activity", href: "/super-admin/analysis-activity", icon: Activity },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { label: "Payments", href: "/super-admin/payments", icon: CreditCard },
  { label: "Audit Logs", href: "/super-admin/audit-logs", icon: ScrollText },
  { label: "System Health", href: "/super-admin/system-health", icon: HeartPulse },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
];
