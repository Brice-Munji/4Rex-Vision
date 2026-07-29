"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Activity,
  Quote,
} from "lucide-react";
import { Logo } from "@/components/logo";

function Candles() {
  const candles = [
    { x: 8, o: 70, c: 40, up: true },
    { x: 24, o: 55, c: 30, up: true },
    { x: 40, o: 45, c: 60, up: false },
    { x: 56, o: 35, c: 20, up: true },
    { x: 72, o: 40, c: 25, up: true },
    { x: 88, o: 30, c: 48, up: false },
    { x: 104, o: 22, c: 12, up: true },
    { x: 120, o: 28, c: 18, up: true },
  ];
  return (
    <svg viewBox="0 0 140 90" className="h-full w-full" preserveAspectRatio="none">
      {candles.map((c, i) => {
        const top = Math.min(c.o, c.c);
        const h = Math.abs(c.o - c.c);
        const color = c.up ? "rgb(52 211 153)" : "rgb(244 114 182)";
        return (
          <g key={i}>
            <motion.line
              x1={c.x + 3}
              x2={c.x + 3}
              y1={top - 8}
              y2={top + h + 8}
              stroke={color}
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            />
            <motion.rect
              x={c.x}
              width="6"
              rx="1.5"
              fill={color}
              initial={{ y: 45, height: 0, opacity: 0 }}
              animate={{ y: top, height: h, opacity: 0.9 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: "easeOut" }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function FloatingCard({
  className,
  delay,
  children,
}: {
  className?: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
        className="glass-strong rounded-2xl p-3.5 shadow-xl shadow-black/20"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function AuthArtwork() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden rounded-3xl bg-secondary p-10 lg:flex">
      {/* gradient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full" />
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
      </div>

      {/* top: logo */}
      <div className="relative z-10">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
      </div>

      {/* center: floating cards + candles */}
      <div className="relative z-10 my-8">
        <div className="relative h-64">
          <FloatingCard className="absolute left-0 top-0 w-52" delay={0.3}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Analysis
            </div>
            <div className="mt-2 text-sm font-semibold text-foreground">
              Ascending Triangle
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Breakout bias · 78% bullish
            </div>
          </FloatingCard>

          <FloatingCard className="absolute right-0 top-10 w-44" delay={0.5}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              Confidence
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">92</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </FloatingCard>

          <FloatingCard className="absolute bottom-0 left-10 w-56" delay={0.7}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-primary" />
                EUR/USD · 15M
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                Live
              </span>
            </div>
            <div className="mt-2 h-12">
              <Candles />
            </div>
          </FloatingCard>

          <FloatingCard className="absolute bottom-6 right-2 w-40" delay={0.9}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Risk
            </div>
            <div className="mt-1.5 text-sm font-semibold text-amber-300">
              Moderate
            </div>
            <div className="text-[10px] text-muted-foreground">R:R 1 : 2.4</div>
          </FloatingCard>
        </div>
      </div>

      {/* bottom: testimonial */}
      <div className="relative z-10">
        <motion.blockquote
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="max-w-md"
        >
          <Quote className="h-6 w-6 text-primary/60" />
          <p className="mt-3 text-lg font-medium leading-relaxed text-foreground/90">
            “4RexVision reads my charts faster than I can blink — it’s like having
            an institutional analyst on call 24/7.”
          </p>
          <footer className="mt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10" />
            <div>
              <div className="text-sm font-semibold text-foreground">Marcus Devlin</div>
              <div className="text-xs text-muted-foreground">Full-time FX Trader</div>
            </div>
          </footer>
        </motion.blockquote>
      </div>
    </div>
  );
}
