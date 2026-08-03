import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/admin/roles";
import type { User } from "@prisma/client";

/**
 * Authoritative super-admin check backed by a fresh DB read (never trusts the
 * JWT alone). Returns the admin user or null.
 */
export async function getSuperAdmin(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;
  return isSuperAdmin(user) ? user : null;
}

/**
 * Guard for admin API route handlers. Resolves to the admin user, or a
 * discriminated failure carrying the correct HTTP response (401 unauth / 403
 * forbidden) so callers can `if ("response" in gate) return gate.response`.
 */
export async function requireSuperAdmin(): Promise<
  { admin: User } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isSuperAdmin(user)) {
    return {
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { admin: user };
}

/** Write an entry to the admin audit trail. Best-effort; never throws. */
export async function logAdminAction(params: {
  actorId: string;
  targetId?: string | null;
  type: Parameters<typeof prisma.adminAction.create>[0]["data"]["type"];
  details?: string;
}): Promise<void> {
  try {
    await prisma.adminAction.create({
      data: {
        actorId: params.actorId,
        targetId: params.targetId ?? null,
        type: params.type,
        details: params.details,
      },
    });
  } catch {
    // Auditing must never break the primary action.
  }
}
