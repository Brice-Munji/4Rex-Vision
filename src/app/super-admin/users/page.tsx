import { getUsers } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/super-admin/ui";
import { UsersTable } from "@/components/super-admin/users-table";
import { GrantProButton } from "@/components/super-admin/grant-pro-button";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers({ filter: "all" });
  return (
    <div>
      <AdminPageHeader
        title="Users"
        description="Search, filter, and manage every account on the platform."
        action={<GrantProButton />}
      />
      <UsersTable initial={users} />
    </div>
  );
}
