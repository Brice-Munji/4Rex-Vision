"use client";

import { User as UserIcon, SlidersHorizontal, Palette, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePersonal } from "./profile-personal";
import { ProfilePreferences } from "./profile-preferences";
import { ProfileAppearance } from "./profile-appearance";
import { ProfileSecurity } from "./profile-security";
import { ProfileDanger } from "./profile-danger";
import type { User } from "@prisma/client";

export function ProfileTabs({ user }: { user: User }) {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="flex w-full flex-wrap sm:w-auto">
        <TabsTrigger value="account">
          <UserIcon />
          <span className="hidden sm:inline">Account</span>
        </TabsTrigger>
        <TabsTrigger value="preferences">
          <SlidersHorizontal />
          <span className="hidden sm:inline">Preferences</span>
        </TabsTrigger>
        <TabsTrigger value="appearance">
          <Palette />
          <span className="hidden sm:inline">Appearance</span>
        </TabsTrigger>
        <TabsTrigger value="security">
          <Shield />
          <span className="hidden sm:inline">Security</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <ProfilePersonal user={user} />
      </TabsContent>
      <TabsContent value="preferences">
        <ProfilePreferences user={user} />
      </TabsContent>
      <TabsContent value="appearance">
        <ProfileAppearance user={user} />
      </TabsContent>
      <TabsContent value="security">
        <div className="space-y-6">
          <ProfileSecurity />
          <ProfileDanger />
        </div>
      </TabsContent>
    </Tabs>
  );
}
