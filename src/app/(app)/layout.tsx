import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";
import { CheckoutProvider } from "@/components/billing/checkout-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboardingComplete) redirect("/onboarding");

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
      }}
      showVerifyBanner={!user.emailVerified}
    >
      <CheckoutProvider>{children}</CheckoutProvider>
    </DashboardShell>
  );
}
