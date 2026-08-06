"use client";

import {
  CreditCard,
  Crown,
  BadgeCheck,
  ShieldX,
  CalendarClock,
  ScanLine,
  BookOpen,
  Megaphone,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTIFICATION_TONE, type NotificationTone, type NotificationType } from "@/lib/notifications/types";

const ICONS: Record<NotificationType, LucideIcon> = {
  payment_success: CreditCard,
  pro_activated: BadgeCheck,
  pro_granted: Crown,
  pro_revoked: ShieldX,
  subscription_expiring: CalendarClock,
  analysis_saved: ScanLine,
  journal_outcome: BookOpen,
  system_announcement: Megaphone,
  account_security: ShieldAlert,
};

// green=success · blue=info · orange=warning · red=error · purple=journal
const TONE_CLASS: Record<NotificationTone, string> = {
  success: "bg-emerald-500/10 text-emerald-500",
  info: "bg-sky-500/10 text-sky-500",
  warning: "bg-amber-500/10 text-amber-500",
  error: "bg-rose-500/10 text-rose-500",
  journal: "bg-violet-500/10 text-violet-400",
};

export function NotificationIcon({
  type,
  className,
  size = "h-9 w-9",
}: {
  type: NotificationType;
  className?: string;
  size?: string;
}) {
  const Icon = ICONS[type] ?? Megaphone;
  const tone = TONE_CLASS[NOTIFICATION_TONE[type] ?? "info"];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        size,
        tone,
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
