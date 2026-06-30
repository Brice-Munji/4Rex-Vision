"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIcon } from "@/lib/icon-map";
import { PREMIUM_FEATURES, type LockedFeature } from "@/lib/plans";

export function LockedFeatureCard({
  feature,
  index = 0,
}: {
  feature: LockedFeature;
  index?: number;
}) {
  const Icon = getIcon(feature.icon);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
    >
      <Link
        href="/billing"
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/40"
      >
        {/* aspirational shimmer */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-sky-500/[0.05] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-400/10 text-sky-500">
            <Icon className="h-5 w-5" />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-sky-500/10 group-hover:text-sky-500">
            <Lock className="h-3.5 w-3.5" />
          </span>
        </div>

        <h3 className="mt-4 font-semibold">{feature.title}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">
          {feature.description}
        </p>

        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-500">
          Unlock with Vision Pro
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}

export function LockedFeatureGrid({
  features = PREMIUM_FEATURES,
}: {
  features?: LockedFeature[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {features.map((f, i) => (
        <LockedFeatureCard key={f.key} feature={f} index={i} />
      ))}
    </div>
  );
}
