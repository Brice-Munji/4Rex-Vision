"use client";

import {
  Eye,
  LayoutGrid,
  CandlestickChart,
  Newspaper,
  ShieldCheck,
  BookOpen,
  Lightbulb,
  CreditCard,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Stagger, StaggerItem } from "@/components/ui/reveal";

const features = [
  {
    icon: Eye,
    title: "AI Vision Analysis",
    description:
      "Computer vision reads your chart exactly as a professional analyst would — price action, candles and context.",
    accent: "text-sky-400",
    span: "md:col-span-2",
  },
  {
    icon: LayoutGrid,
    title: "Market Structure Detection",
    description:
      "Automatically maps trends, support, resistance and key liquidity zones.",
    accent: "text-cyan-400",
  },
  {
    icon: CandlestickChart,
    title: "Chart Pattern Recognition",
    description:
      "Detects triangles, flags, head-and-shoulders and 40+ classic formations.",
    accent: "text-indigo-400",
  },
  {
    icon: Newspaper,
    title: "Economic News Intelligence",
    description:
      "Correlates your setup with high-impact events so you never trade blind into the news.",
    accent: "text-rose-400",
    span: "md:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Risk Management",
    description:
      "Quantified risk scores, suggested R:R and position context for every analysis.",
    accent: "text-emerald-400",
  },
  {
    icon: BookOpen,
    title: "Trading Journal",
    description:
      "Every analysis is logged automatically into a searchable, reviewable journal.",
    accent: "text-amber-400",
  },
  {
    icon: Lightbulb,
    title: "Explainable AI",
    description:
      "Transparent reasoning behind every call — understand the why, not just the what.",
    accent: "text-fuchsia-400",
  },
  {
    icon: CreditCard,
    title: "Subscription Plans",
    description:
      "Flexible tiers that scale from first analysis to full enterprise deployment.",
    accent: "text-sky-400",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="container">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to read the market"
          description="A complete intelligence suite engineered for serious traders who demand depth, speed and clarity."
        />

        <Stagger
          className="mt-16 grid gap-5 sm:grid-cols-2 md:grid-cols-3"
          stagger={0.07}
        >
          {features.map((f) => (
            <StaggerItem key={f.title} className={f.span ?? ""}>
              <div className="group relative h-full overflow-hidden rounded-2xl glass p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-500/0 to-cyan-500/0 opacity-0 transition-opacity duration-300 group-hover:from-sky-500/[0.06] group-hover:to-cyan-500/[0.03] group-hover:opacity-100" />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                  <f.icon className={`h-6 w-6 ${f.accent}`} />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
