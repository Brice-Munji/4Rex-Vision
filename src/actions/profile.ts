"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import {
  profileSchema,
  preferencesSchema,
  changePasswordSchema,
} from "@/lib/validations";
import type { ActionState } from "@/actions/auth";

export async function updateProfile(values: unknown): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { ok: false, message: "Please fix the errors below.", fieldErrors };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      avatar: parsed.data.avatar || null,
    },
  });

  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}

export async function updatePreferences(values: unknown): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  const parsed = preferencesSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Invalid preferences." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  revalidatePath("/profile");
  return { ok: true, message: "Preferences saved." };
}

export async function changePassword(values: unknown): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { ok: false, message: "Please fix the errors below.", fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user?.passwordHash) {
    return { ok: false, message: "Password change unavailable for this account." };
  }

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!valid) {
    return {
      ok: false,
      message: "Current password is incorrect.",
      fieldErrors: { currentPassword: "Incorrect password" },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { ok: true, message: "Password changed successfully." };
}

export async function deleteAccount(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Not signed in." };

  await prisma.user.delete({ where: { id: session.user.id } });
  await signOut({ redirect: false });
  return { ok: true, message: "Account deleted." };
}
