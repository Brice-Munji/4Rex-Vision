import { ShieldCheck, Sparkles, CreditCard, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SUPER_ADMIN_EMAILS } from "@/lib/admin/roles";
import { isVisionConfigured, configuredProviders } from "@/lib/rex/vision-providers";
import { AdminPageHeader, AdminCard, SectionTitle, StatusBadge } from "@/components/super-admin/ui";
import { AnnouncementComposer } from "@/components/super-admin/announcement-composer";

export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shown = name.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default async function SettingsPage() {
  const [admins, providers, geminiOn] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { email: true, firstName: true, lastName: true },
    }),
    Promise.resolve(configuredProviders()),
    Promise.resolve(isVisionConfigured()),
  ]);

  const paymentsConfigured =
    !!process.env.FLUTTERWAVE_SECRET_KEY || !!process.env.STRIPE_SECRET_KEY;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between border-b border-[var(--a-border)] py-3 last:border-0">
      <span className="text-sm text-[var(--a-muted)]">{label}</span>
      <span className="text-sm text-[var(--a-text)]">{value}</span>
    </div>
  );

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="Platform access, integrations, and configuration."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnnouncementComposer />

        <AdminCard className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#3b82f6]" />
            <SectionTitle>Access Control</SectionTitle>
          </div>
          <Row label="Super admins (DB)" value={admins.length} />
          <Row
            label="Bootstrap emails"
            value={SUPER_ADMIN_EMAILS.length ? SUPER_ADMIN_EMAILS.length : "None"}
          />
          <div className="mt-4 space-y-2">
            {admins.map((a) => (
              <div
                key={a.email}
                className="flex items-center justify-between rounded-lg bg-[var(--a-surface-2)] px-3 py-2"
              >
                <span className="text-sm text-[var(--a-text)]">
                  {[a.firstName, a.lastName].filter(Boolean).join(" ") || a.email.split("@")[0]}
                </span>
                <span className="text-xs text-[var(--a-muted)]">{maskEmail(a.email)}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-[#3b82f6]" />
            <SectionTitle>Integrations</SectionTitle>
          </div>
          <Row
            label="Gemini Vision"
            value={<StatusBadge value={geminiOn ? "online" : "offline"} />}
          />
          <Row
            label="Active vision providers"
            value={providers.length ? providers.join(", ") : "None"}
          />
          <Row
            label="Payments"
            value={<StatusBadge value={paymentsConfigured ? "online" : "offline"} />}
          />
          <Row label="Database" value={<StatusBadge value="online" />} />
        </AdminCard>

        <AdminCard className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-[#3b82f6]" />
            <SectionTitle>Subscription Defaults</SectionTitle>
          </div>
          <Row label="Pro plan label" value="Rex Pro" />
          <Row label="Admin grant durations" value="7d · 30d · 90d · 1y · Lifetime" />
          <Row label="Grant source tag" value={<StatusBadge value="admin" />} />
        </AdminCard>

        <AdminCard className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#3b82f6]" />
            <SectionTitle>Notes</SectionTitle>
          </div>
          <p className="text-sm leading-relaxed text-[var(--a-muted)]">
            Grant, extend, revoke, reset, and suspend actions are all recorded in the
            Audit Logs. To add or remove a super admin, update the user&apos;s{" "}
            <code className="rounded bg-[var(--a-surface-2)] px-1.5 py-0.5 text-xs text-[var(--a-text)]">
              role
            </code>{" "}
            or the{" "}
            <code className="rounded bg-[var(--a-surface-2)] px-1.5 py-0.5 text-xs text-[var(--a-text)]">
              SUPER_ADMIN_EMAILS
            </code>{" "}
            environment variable.
          </p>
        </AdminCard>
      </div>
    </div>
  );
}
