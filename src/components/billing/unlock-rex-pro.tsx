"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCheckout } from "./checkout-provider";

/**
 * Primary "Unlock Rex Pro" call-to-action. Opens the app-wide checkout overlay
 * (owned by CheckoutProvider) so progress survives navigation + minimize.
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
  const { open } = useCheckout();
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(fullWidth && "w-full", className)}
      onClick={open}
    >
      <Sparkles className="h-4 w-4" />
      {label}
    </Button>
  );
}
