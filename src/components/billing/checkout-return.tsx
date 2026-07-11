"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RexProCheckout } from "./rex-pro-checkout";

/**
 * Resumes a checkout after a provider (e.g. Flutterwave hosted page) redirects
 * the user back to `/billing?ref=…`. Opens the modal straight into server-side
 * verification, then cleans the query param out of the URL.
 */
export function CheckoutReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ref = params.get("ref");
  const [open, setOpen] = React.useState(!!ref);

  if (!ref) return null;

  return (
    <RexProCheckout
      open={open}
      resumeReference={ref}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.replace(pathname);
      }}
    />
  );
}
