import { getPayments } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/super-admin/ui";
import { PaymentsTable } from "@/components/super-admin/payments-table";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await getPayments({});
  const providers = [...new Set(payments.map((p) => p.provider))];
  return (
    <div>
      <AdminPageHeader
        title="Payments"
        description="Every checkout attempt across all payment providers."
      />
      <PaymentsTable initial={payments} providers={providers} />
    </div>
  );
}
