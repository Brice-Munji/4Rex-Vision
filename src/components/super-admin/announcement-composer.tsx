"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, Send, Loader2, Users, Crown } from "lucide-react";
import { AdminCard, SectionTitle } from "./ui";

type Audience = "all" | "pro";

export function AnnouncementComposer() {
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [audience, setAudience] = React.useState<Audience>("all");
  const [sending, setSending] = React.useState(false);

  const disabled = sending || !title.trim() || !message.trim();

  async function send() {
    if (disabled) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, audience }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(data.message ?? "Announcement sent.");
        setTitle("");
        setMessage("");
      } else {
        toast.error(data.message ?? "Could not send announcement.");
      }
    } catch {
      toast.error("Could not send announcement.");
    } finally {
      setSending(false);
    }
  }

  const audiences: { key: Audience; label: string; icon: typeof Users }[] = [
    { key: "all", label: "All users", icon: Users },
    { key: "pro", label: "Rex Pro users", icon: Crown },
  ];

  return (
    <AdminCard className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-center gap-2.5">
        <Megaphone className="h-5 w-5 text-[#3b82f6]" />
        <SectionTitle>Send Announcement</SectionTitle>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--a-muted)]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. New feature: AI Coach"
              className="w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] px-3 py-2 text-sm text-[var(--a-text)] outline-none transition-colors placeholder:text-[var(--a-muted)] focus:border-[#3b82f6]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--a-muted)]">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Write a short, clear message for your users…"
              className="w-full resize-none rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] px-3 py-2 text-sm text-[var(--a-text)] outline-none transition-colors placeholder:text-[var(--a-muted)] focus:border-[#3b82f6]"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--a-muted)]">Audience</label>
            <div className="grid grid-cols-2 gap-2">
              {audiences.map((a) => {
                const Icon = a.icon;
                const active = audience === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[var(--a-text)]"
                        : "border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-muted)] hover:text-[var(--a-text)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-[var(--a-muted)]">Preview</p>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <Megaphone className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--a-text)]">
                  {title.trim() || "Announcement title"}
                </p>
                <p className="line-clamp-2 text-xs text-[var(--a-muted)]">
                  {message.trim() || "Your message will appear here."}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={send}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send announcement"}
          </button>
        </div>
      </div>
    </AdminCard>
  );
}
