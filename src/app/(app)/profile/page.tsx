import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { PlanBadge } from "@/components/app/plan-badge";

export const metadata: Metadata = {
  title: "Profile · 4RexVision",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile & settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account, trading preferences and security.
          </p>
        </div>
        <PlanBadge plan={user.plan} className="ml-auto" />
      </div>

      <ProfileTabs user={user} />
    </div>
  );
}
