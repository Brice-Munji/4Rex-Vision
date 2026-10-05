import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isProActive } from "@/lib/journal/access";
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";
import { CheckoutProvider } from "@/components/billing/checkout-provider";
import { DisableAnimations } from "@/components/dashboard/disable-animations";
import { RexCoachProvider } from "@/components/dashboard/coach/rex-coach";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Suspended accounts lose access to the app immediately (next navigation),
  // even if they still hold a valid session cookie.
  if (user.suspended) redirect("/suspended");
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
      showVerifyBanner={!user.emailVerified && !!user.passwordHash}
    >
      {/* Turn off all app animations right after login/sign-up (graphs opt out
          via the `allow-anim` class). */}
      <DisableAnimations />
      {/* Rex Coach is a Rex Pro feature — isPro is computed server-side here
          (authoritative) and the backend route re-checks it independently. */}
      <RexCoachProvider isPro={isProActive(user)}>
        <CheckoutProvider>{children}</CheckoutProvider>
      </RexCoachProvider>
    </DashboardShell>
  );
}
