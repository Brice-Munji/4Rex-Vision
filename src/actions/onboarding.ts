"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { onboardingSchema } from "@/lib/validations";
import type { ActionState } from "@/actions/auth";

export async function completeOnboarding(values: unknown): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid selection.",
    };
  }

  const { experienceLevel, tradingStyle, favoritePairs, themePreference } =
    parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      experienceLevel,
      tradingStyle,
      favoritePairs,
      themePreference,
      onboardingComplete: true,
    },
  });

  return { ok: true, message: "Workspace ready." };
}
