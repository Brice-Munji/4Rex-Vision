/**
 * Client-safe notification types & presentation config (no server imports),
 * shared by the API, the bell menu and the /notifications page.
 */

export type NotificationType =
  | "payment_success"
  | "pro_activated"
  | "pro_granted"
  | "pro_revoked"
  | "subscription_expiring"
  | "analysis_saved"
  | "journal_outcome"
  | "system_announcement"
  | "account_security";

export type NotificationTone =
  | "success" // green
  | "info" // blue
  | "warning" // orange
  | "error" // red
  | "journal"; // purple

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string; // ISO 8601
}

/** Tone (colour family) per notification type. */
export const NOTIFICATION_TONE: Record<NotificationType, NotificationTone> = {
  payment_success: "success",
  pro_activated: "success",
  pro_granted: "success",
  pro_revoked: "error",
  subscription_expiring: "warning",
  analysis_saved: "info",
  journal_outcome: "journal",
  system_announcement: "info",
  account_security: "error",
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  payment_success: "Payment",
  pro_activated: "Rex Pro",
  pro_granted: "Rex Pro",
  pro_revoked: "Rex Pro",
  subscription_expiring: "Subscription",
  analysis_saved: "Analysis",
  journal_outcome: "Journal",
  system_announcement: "Announcement",
  account_security: "Security",
};

export const NOTIFICATION_TYPES: NotificationType[] = [
  "payment_success",
  "pro_activated",
  "pro_granted",
  "pro_revoked",
  "subscription_expiring",
  "analysis_saved",
  "journal_outcome",
  "system_announcement",
  "account_security",
];

/** Compact relative time: "just now", "2m", "1h", "3d", then a short date. */
export function relativeTimeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toISOString().slice(0, 10);
}
