import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Server-side current user from the database (fresh), cached per request. */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
});
