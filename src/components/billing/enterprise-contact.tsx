"use client";

import { motion } from "framer-motion";
import { Building2, ArrowRight, Users, Code2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const perks = [
  { icon: Users, label: "Multi-user workspaces" },
  { icon: Building2, label: "Team management" },
  { icon: Code2, label: "API access" },
  { icon: Headphones, label: "Dedicated support" },
];

export function EnterpriseContact() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-12"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full" />
        <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full" />
        <div className="absolute inset-0 bg-grid opacity-[0.12]" />
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <Badge variant="glass" className="mb-4">
            <Building2 className="h-3.5 w-3.5" />
            Vision Elite · Coming Soon
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Built for trading firms & institutions
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            Equip your whole desk with AI-powered analysis, centralized
            management and a direct line to our team. Let&apos;s design a plan
            around your operation.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg">
              Contact Sales
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary">
              Join early access
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {perks.map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.03] p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <p.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
