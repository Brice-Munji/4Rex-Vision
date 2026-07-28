"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, ShieldX, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/actions/verify";

type Status = "loading" | "success" | "error";

export function VerifyClient() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = React.useState<Status>("loading");
  const [message, setMessage] = React.useState("");
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus("error");
      setMessage("No verification token was provided.");
      return;
    }
    verifyEmail(token).then((res) => {
      setStatus(res.ok ? "success" : "error");
      setMessage(res.message ?? "");
    });
  }, [token]);

  return (
    <div className="text-center">
      {status === "loading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Verifying your email
          </h1>
          <p className="mt-2 text-muted-foreground">This will only take a moment…</p>
        </motion.div>
      )}

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </motion.div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Email verified</h1>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Your email is confirmed. You now have full access to your workspace.
          </p>
          <Button className="mt-8 w-full" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldX className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Verification failed
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            {message || "This verification link is invalid or has expired."}
          </p>
          <div className="mt-8 space-y-3">
            <Button className="w-full" asChild>
              <Link href="/dashboard">
                <MailCheck className="h-4 w-4" />
                Resend from dashboard
              </Link>
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
