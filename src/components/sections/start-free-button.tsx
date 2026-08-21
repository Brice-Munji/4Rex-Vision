"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Landing-page "Start Free" CTA — routes to the SIGN-UP page (/register), not
 * login, and shows a loading spinner while the navigation is in flight.
 *
 * Uses router.push inside a transition so `pending` stays true until the target
 * route resolves (a plain <Link> gives no pending signal on Next 15.1).
 */
export function StartFreeButton({
  className,
  label = "Start Free",
  href = "/register",
}: {
  className?: string;
  label?: string;
  href?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      className={cn("hover-zoom", className)}
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.push(href))}
    >
      {label}
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowRight className="h-4 w-4" />
      )}
    </Button>
  );
}
