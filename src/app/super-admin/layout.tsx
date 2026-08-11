import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./admin.css";
import { getSuperAdmin } from "@/lib/admin/guard";
import { AdminShell } from "@/components/super-admin/admin-shell";

export const metadata: Metadata = {
  title: "Owner Command Center · 4RexVision AI",
  robots: { index: false, follow: false },
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side gate (defense in depth alongside middleware).
  const admin = await getSuperAdmin();
  if (!admin) redirect("/dashboard");

  const name =
    [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
    admin.email.split("@")[0];

  return (
    <AdminShell user={{ name, email: admin.email }}>{children}</AdminShell>
  );
}
