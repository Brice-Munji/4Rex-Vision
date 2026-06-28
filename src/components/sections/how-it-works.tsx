"use client";

import { motion } from "framer-motion";
import { Upload, BrainCircuit, FileText, ArrowRight } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Stagger, StaggerItem } from "@/components/ui/reveal";

const steps = [
  {
    icon: Upload,
    step: "Step 1",
    title: "Upload Screenshot",
    description:
      "Drop any chart screenshot — forex, crypto, stocks or indices. No formatting, tagging or setup required.",
    gradient: "from-sky-500 to-cyan-400",
  },
  {
    icon: BrainCircuit,
    step: "Step 2",
    title: "AI Understands the Market",
    description:
      "Our vision model reads price action, structure and patterns, then cross-references live economic data.",
    gradient: "from-indigo-500 to-sky-500",
  },
  {
    icon: FileText,
    step: "Step 3",
    title: "Receive Professional Analysis",
    description:
      "Get an institutional-grade breakdown with probabilities, risk and clear, explainable reasoning.",
    gradient: "from-cyan-500 to-emerald-400",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="How It Works"
          title="From screenshot to strategy in seconds"
          description="Three effortless steps turn a raw chart image into a complete, professional market read."
        />

        <Stagger className="relative mt-16 grid gap-6 md:grid-cols-3" stagger={0.15}>
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((s, i) => (
            <StaggerItem key={s.step} className="relative">
              <div className="glass group relative h-full rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30">
                <div className="flex items-center justify-between">
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} shadow-lg shadow-sky-500/20`}
                  >
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-5xl font-bold text-foreground/[0.06]">
                    0{i + 1}
                  </span>
                </div>

                <div className="mt-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">
                    {s.step}
                  </span>
                  <h3 className="mt-1.5 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>

              {i < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="absolute -right-3 top-12 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full glass-strong md:flex"
                >
                  <ArrowRight className="h-3 w-3 text-sky-400" />
                </motion.div>
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
