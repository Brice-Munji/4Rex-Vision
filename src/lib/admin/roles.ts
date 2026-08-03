import type { Role } from "@prisma/client";

/**
 * Emails that are always treated as super-admins, regardless of the DB `role`.
 * Bootstraps the owner (Brice) and survives DB resets. Edge-safe (no Prisma):
 * safe to import from middleware and the auth config.
 */
export const SUPER_ADMIN_EMAILS: string[] = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Resolve the effective role given the stored DB role + bootstrap allowlist. */
export function resolveRole(role: Role | null | undefined, email?: string | null): Role {
  if (role === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (isSuperAdminEmail(email)) return "SUPER_ADMIN";
  return "USER";
}

export function isSuperAdmin(
  user: { role?: Role | null; email?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  return resolveRole(user.role, user.email) === "SUPER_ADMIN";
}
