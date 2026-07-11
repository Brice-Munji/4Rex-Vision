"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RexProCheckout } from "./rex-pro-checkout";

/**
 * Primary "Unlock Rex Pro" call-to-action. Owns the checkout modal so it can be
 * dropped anywhere (billing page, dashboard, usage limit prompts).
 */
export function UnlockRexProButton({
  label = "Unlock Rex Pro",
  className,
  variant,
  size = "lg",
  fullWidth,
}: {
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  fullWidth?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(fullWidth && "w-full", className)}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        {label}
      </Button>
      <RexProCheckout open={open} onOpenChange={setOpen} />
    </>
  );
}
