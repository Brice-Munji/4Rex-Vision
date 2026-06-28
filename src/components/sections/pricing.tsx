"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Stagger, StaggerItem } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Everything you need to start reading charts with AI.",
    features: [
      "3 AI analyses per day",
      "Basic Analysis",
      "History",
      "Community Support",
    ],
    cta: "Start Free",
    href: "#",
    featured: false,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "Full power for active, serious traders.",
    features: [
      "Unlimited analyses",
      "Advanced AI",
      "Unlimited History",
      "Priority Processing",
      "Trading Journal",
      "Economic Intelligence",
    ],
    cta: "Go Professional",
    href: "#",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored intelligence for teams and institutions.",
    features: [
      "Custom AI",
      "Unlimited Users",
      "API Access",
      "Dedicated Support",
    ],
    cta: "Contact Sales",
    href: "#",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10 blur-[140px]" />
      </div>

      <div className="container">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          description="Start free and upgrade as you grow. No hidden fees, cancel anytime."
        />

        <Stagger
          className="mx-auto mt-16 grid max-w-5xl items-stretch gap-6 lg:grid-cols-3"
          stagger={0.12}
        >
          {plans.map((plan) => (
            <StaggerItem key={plan.name} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300",
                  plan.featured
                    ? "glass-strong border-sky-500/40 shadow-2xl shadow-sky-500/10 lg:-mt-4 lg:mb-4"
                    : "glass hover:-translate-y-1 hover:border-sky-500/30"
                )}
              >
                {plan.featured && (
                  <>
                    <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-sky-500/[0.08] to-transparent" />
                    <Badge
                      variant="gradient"
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                    >
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </Badge>
                  </>
                )}

                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="mt-7 flex-1 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          plan.featured
                            ? "bg-gradient-to-br from-sky-500 to-cyan-400 text-white"
                            : "bg-sky-500/10 text-sky-500 dark:text-sky-400"
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.featured ? "default" : "secondary"}
                  size="lg"
                  className="mt-8 w-full"
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
