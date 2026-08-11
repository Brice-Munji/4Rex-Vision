"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { GrantProModal } from "./grant-pro-modal";

export function GrantProButton() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Crown className="h-4 w-4" />
        Grant Rex Pro
      </button>
      <GrantProModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => router.refresh()}
      />
    </>
  );
}
