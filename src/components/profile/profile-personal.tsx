"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Save, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/profile";
import type { User } from "@prisma/client";

export function ProfilePersonal({ user }: { user: User }) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [firstName, setFirstName] = React.useState(user.firstName ?? "");
  const [lastName, setLastName] = React.useState(user.lastName ?? "");
  const [avatar, setAvatar] = React.useState(user.avatar ?? "");

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    "U";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await updateProfile({ firstName, lastName, avatar });
      if (res.ok) {
        toast.success(res.message ?? "Profile updated.");
        await update({ firstName, lastName, avatar: avatar || null });
        router.refresh();
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.message ?? "Could not update profile.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl glass p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Personal information</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Update your name and profile picture.
      </p>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 ring-2 ring-border">
          {avatar && <AvatarImage src={avatar} alt="Avatar preview" />}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="avatar">Avatar URL</Label>
          <div className="relative">
            <ImageIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://…/avatar.png"
              className="pl-10"
              disabled={pending}
              aria-invalid={!!errors.avatar}
            />
          </div>
          {errors.avatar && (
            <p className="text-xs text-red-500">{errors.avatar}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Paste an image URL. File uploads land with billing & storage.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={pending}
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={pending}
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          {user.emailVerified
            ? "Your email is verified."
            : "Your email is not verified yet."}
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
