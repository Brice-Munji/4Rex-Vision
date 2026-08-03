import "server-only";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/guard";
import type { User } from "@prisma/client";

export type GrantDuration = "7d" | "30d" | "90d" | "1y" | "lifetime";

const DURATION_DAYS: Record<Exclude<GrantDuration, "lifetime">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

const DURATION_LABEL: Record<GrantDuration, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
  lifetime: "Lifetime",
};

export interface ActionResult {
  ok: boolean;
  message: string;
  user?: { id: string; email: string };
}

/** Resolve a target user by id, email, or "username" (first/last name). */
async function resolveTarget(identifier: string): Promise<User | null> {
  const id = identifier.trim();
  if (!id) return null;
  const byId = await prisma.user.findUnique({ where: { id } });
  if (byId) return byId;
  const byEmail = await prisma.user.findUnique({
    where: { email: id.toLowerCase() },
  });
  if (byEmail) return byEmail;
  return prisma.user.findFirst({
    where: {
      OR: [
        { firstName: { equals: id, mode: "insensitive" } },
        { email: { contains: id, mode: "insensitive" } },
      ],
    },
  });
}

function endDateFor(duration: GrantDuration, from = new Date()): Date | null {
  if (duration === "lifetime") return null;
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + DURATION_DAYS[duration]);
  return d;
}

export async function grantPro(
  adminId: string,
  input: { identifier: string; duration: GrantDuration; reason?: string }
): Promise<ActionResult> {
  const target = await resolveTarget(input.identifier);
  if (!target) return { ok: false, message: "User not found." };

  const end = endDateFor(input.duration);
  await prisma.user.update({
    where: { id: target.id },
    data: {
      plan: "PROFESSIONAL",
      subscriptionStatus: "ACTIVE",
      subscriptionSource: "ADMIN",
      subscriptionStart: target.subscriptionStart ?? new Date(),
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
  });

  await logAdminAction({
    actorId: adminId,
    targetId: target.id,
    type: "GRANT_PRO",
    details: `Granted Pro · ${DURATION_LABEL[input.duration]}${
      input.reason ? ` · reason: ${input.reason}` : ""
    }`,
  });

  return {
    ok: true,
    message: `Rex Pro granted to ${target.email} (${DURATION_LABEL[input.duration]}).`,
    user: { id: target.id, email: target.email },
  };
}

export async function extendPro(
  adminId: string,
  input: { identifier: string; duration: GrantDuration }
): Promise<ActionResult> {
  const target = await resolveTarget(input.identifier);
  if (!target) return { ok: false, message: "User not found." };

  let end: Date | null;
  if (input.duration === "lifetime") {
    end = null;
  } else {
    const base =
      target.currentPeriodEnd && target.currentPeriodEnd > new Date()
        ? target.currentPeriodEnd
        : new Date();
    end = endDateFor(input.duration, base);
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      plan: "PROFESSIONAL",
      subscriptionStatus: "ACTIVE",
      subscriptionSource: target.subscriptionSource ?? "ADMIN",
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
  });

  await logAdminAction({
    actorId: adminId,
    targetId: target.id,
    type: "EXTEND_PRO",
    details: `Extended Pro · +${DURATION_LABEL[input.duration]}`,
  });

  return {
    ok: true,
    message: `Rex Pro extended for ${target.email}.`,
    user: { id: target.id, email: target.email },
  };
}

export async function revokePro(
  adminId: string,
  input: { identifier: string; reason?: string }
): Promise<ActionResult> {
  const target = await resolveTarget(input.identifier);
  if (!target) return { ok: false, message: "User not found." };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      subscriptionSource: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });

  await logAdminAction({
    actorId: adminId,
    targetId: target.id,
    type: "REVOKE_PRO",
    details: `Revoked Pro${input.reason ? ` · reason: ${input.reason}` : ""}`,
  });

  return {
    ok: true,
    message: `Rex Pro revoked for ${target.email}.`,
    user: { id: target.id, email: target.email },
  };
}

export async function resetUsage(
  adminId: string,
  input: { identifier: string }
): Promise<ActionResult> {
  const target = await resolveTarget(input.identifier);
  if (!target) return { ok: false, message: "User not found." };

  await prisma.user.update({
    where: { id: target.id },
    data: { dailyAnalysisCount: 0, analysisCountDate: new Date() },
  });

  await logAdminAction({
    actorId: adminId,
    targetId: target.id,
    type: "RESET_USAGE",
    details: "Reset daily analyses to 0",
  });

  return {
    ok: true,
    message: `Daily analyses reset for ${target.email}.`,
    user: { id: target.id, email: target.email },
  };
}

export async function setSuspended(
  adminId: string,
  input: { identifier: string; suspended: boolean }
): Promise<ActionResult> {
  const target = await resolveTarget(input.identifier);
  if (!target) return { ok: false, message: "User not found." };
  if (target.role === "SUPER_ADMIN") {
    return { ok: false, message: "Cannot suspend a super admin." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { suspended: input.suspended },
  });

  await logAdminAction({
    actorId: adminId,
    targetId: target.id,
    type: input.suspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
    details: input.suspended ? "Suspended user account" : "Reactivated user account",
  });

  return {
    ok: true,
    message: `${target.email} ${input.suspended ? "suspended" : "reactivated"}.`,
    user: { id: target.id, email: target.email },
  };
}
