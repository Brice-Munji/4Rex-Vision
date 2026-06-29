import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, BookOpen, MessageCircle, Mail, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = {
  title: "Help · 4RexVision AI",
};

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Guides for uploading charts and reading AI reports.",
    href: "#",
    accent: "from-sky-500 to-cyan-400",
  },
  {
    icon: MessageCircle,
    title: "Community",
    description: "Join other traders and share setups and feedback.",
    href: "#",
    accent: "from-indigo-500 to-sky-500",
  },
  {
    icon: Mail,
    title: "Contact Support",
    description: "Reach our team — we usually reply within a few hours.",
    href: "#",
    accent: "from-emerald-500 to-cyan-400",
  },
];

const faqs = [
  {
    q: "How do I analyze a chart?",
    a: "Head to Analyze Chart, drop in a screenshot, and the AI builds a full report in seconds.",
  },
  {
    q: "What's my daily limit?",
    a: "The Explorer plan includes 3 AI analyses per day. Upgrade anytime for unlimited analyses.",
  },
  {
    q: "Which platforms are supported?",
    a: "Screenshots from TradingView, MetaTrader, cTrader and any PNG/JPG chart are supported.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<HelpCircle className="h-5 w-5" />}
        title="Help & Support"
        description="Find answers fast or reach out — we're here to help."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {resources.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="group rounded-2xl glass p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${r.accent} text-white shadow-lg`}
            >
              <r.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 flex items-center gap-1 font-semibold">
              {r.title}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-3xl glass p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Frequently asked</h2>
        <div className="mt-4 divide-y divide-border/60">
          {faqs.map((f) => (
            <div key={f.q} className="py-4">
              <h3 className="font-medium">{f.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
