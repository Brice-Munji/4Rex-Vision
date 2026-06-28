import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyClient } from "./verify-client";

export const metadata: Metadata = {
  title: "Verify email · 4RexVision AI",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyClient />
    </Suspense>
  );
}
