import { redirect } from "next/navigation";

// Settings live alongside the profile for now.
export default function SettingsPage() {
  redirect("/profile");
}
