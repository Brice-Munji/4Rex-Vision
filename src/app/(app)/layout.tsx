import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AppHeader } from "@/components/app/app-header";
import { VerifyBanner } from "@/components/app/verify-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboardingComplete) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      {!user.emailVerified && <VerifyBanner />}
      <AppHeader user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
