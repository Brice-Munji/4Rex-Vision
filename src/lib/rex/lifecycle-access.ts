import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProActive } from "@/lib/journal/access";
import { countTrackedSetups } from "./lifecycle";
import type { User } from "@prisma/client";

/**
 * Tracked Setups access (Sprint 1.1) — mirrors journal/access.ts's
 * getJournalAccess() exactly: a lapsed-Pro user keeps read-only access to
 * their OWN previously-tracked setups (never deleted), matching the Smart
 * Journal's own "data is never deleted; read-only once Pro lapses" rule.
 * Reuses isProActive() directly rather than re-deriving the plan/status
 * check.
 */
export interface TrackedSetupsAccess {
  user: User;
  /** Has at least one tracked setup (so a lapsed Pro can still view it). */
  hasData: boolean;
  /** May view the Tracked Setups page (active Pro OR has preserved data). */
  canView: boolean;
}

/** Resolve the caller's Tracked Setups access, or null if not signed in. */
export async function getTrackedSetupsAccess(): Promise<TrackedSetupsAccess | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  let user = await prisma.user.findUnique({ where: { id: session.user.id } });
  // Resilient to stale-JWT id drift (same as the admin/journal guards).
  if (!user && session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
    });
  }
  if (!user) return null;

  const activePro = isProActive(user);
  const hasData = activePro ? true : (await countTrackedSetups(user.id)) > 0;

  return { user, hasData, canView: activePro || hasData };
}
