import {
  LayoutDashboard,
  ScanSearch,
  BookOpen,
  History,
  Globe,
  TrendingUp,
  CreditCard,
  Settings,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Rex Pro feature — free users see a lock icon. */
  pro?: boolean;
}

/** Primary command-center navigation. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analyze Chart", href: "/analyze", icon: ScanSearch },
  { label: "Smart Journal", href: "/journal", icon: BookOpen, pro: true },
  { label: "Analysis History", href: "/history", icon: History },
  { label: "Market Intelligence", href: "/market", icon: Globe },
  { label: "AI Growth", href: "/growth", icon: TrendingUp },
  { label: "Subscription", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

/** Condensed set surfaced in the mobile bottom navigation. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analyze", href: "/analyze", icon: ScanSearch },
  { label: "Journal", href: "/journal", icon: BookOpen, pro: true },
  { label: "History", href: "/history", icon: History },
];
