"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Crown, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type GrantMode = "grant" | "extend";

const DURATIONS: { value: string; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "lifetime", label: "Lifetime" },
];

export function GrantProModal({
  open,
  onClose,
  onDone,
  mode = "grant",
  presetIdentifier,
  presetLabel,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  mode?: GrantMode;
  presetIdentifier?: string;
  presetLabel?: string;
}) {
  const [identifier, setIdentifier] = React.useState(presetIdentifier ?? "");
  const [duration, setDuration] = React.useState("30d");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIdentifier(presetIdentifier ?? "");
      setDuration("30d");
      setReason("");
    }
  }, [open, presetIdentifier]);

  const locked = !!presetIdentifier;
  const title = mode === "extend" ? "Extend Rex Pro" : "Grant Rex Pro";
  const endpoint = mode === "extend" ? "/api/admin/extend-pro" : "/api/admin/grant-pro";

  async function submit() {
    if (!identifier.trim()) {
      toast.error("Enter a username or email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), duration, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(data.message ?? "Done.");
        onDone?.();
        onClose();
      } else {
        toast.error(data.message ?? data.error ?? "Something went wrong.");
      }
    } catch {
      toast.error("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl border border-[#1f1f1f] bg-[#111111] p-6 text-[#f5f5f5] shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#3b82f6]/12 text-[#3b82f6]">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-xs text-[#a3a3a3]">
                  {mode === "extend"
                    ? "Add time to an existing subscription."
                    : "Activate Rex Pro for a user manually."}
                </p>
              </div>
            </div>

            <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]">
              Username or email
            </label>
            {locked ? (
              <div className="mb-4 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] px-3 py-2.5 text-sm">
                {presetLabel ?? presetIdentifier}
              </div>
            ) : (
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="trader@email.com"
                className="mb-4 w-full rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] px-3 py-2.5 text-sm outline-none placeholder:text-[#5a5a5a] focus:border-[#3b82f6]"
              />
            )}

            <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]">
              Duration
            </label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    duration === d.value
                      ? "border-[#3b82f6] bg-[#3b82f6]/12 text-white"
                      : "border-[#1f1f1f] bg-[#0b0b0b] text-[#a3a3a3] hover:text-white"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {mode === "grant" && (
              <>
                <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]">
                  Reason <span className="text-[#5a5a5a]">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. VIP beta tester"
                  className="mb-5 w-full resize-none rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] px-3 py-2.5 text-sm outline-none placeholder:text-[#5a5a5a] focus:border-[#3b82f6]"
                />
              </>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] px-4 py-2.5 text-sm text-[#a3a3a3] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "extend" ? "Extend Pro" : "Confirm Grant"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
