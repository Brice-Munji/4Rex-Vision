"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductMockup } from "./product-mockup";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full" />
        <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full" />
        <div className="absolute inset-0 bg-grid mask-radial opacity-[0.35]" />
      </div>

      <div className="container">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <Badge variant="glass" className="mb-6">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                AI-Powered Market Vision
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
            >
              See Beyond <br />
              the <span className="text-gradient">Charts.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              Transform trading screenshots into intelligent market analysis using
              AI-powered chart vision, technical analysis and economic intelligence.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Button size="lg" className="h-14" asChild>
                <Link href="/register">
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="h-14" asChild>
                <Link href="#how-it-works">
                  <Play className="h-4 w-4" />
                  Watch Demo
                </Link>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["bg-muted", "bg-muted", "bg-muted"].map(
                    (g, i) => (
                      <div
                        key={i}
                        className={`h-7 w-7 rounded-full border-2 border-background ${g}`}
                      />
                    )
                  )}
                </div>
                <span>Trusted by 12,000+ traders</span>
              </div>
              <div className="hidden h-4 w-px bg-border sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">★★★★★</span>
                <span>4.9 / 5 rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
