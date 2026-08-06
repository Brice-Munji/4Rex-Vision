import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const metadata: Metadata = {
  title: "Notifications · 4RexVision AI",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Bell className="h-5 w-5" />}
        title="Notifications"
        description="Payments, Rex Pro changes, analyses and announcements — all in one place."
      />
      <NotificationsView />
    </div>
  );
}
