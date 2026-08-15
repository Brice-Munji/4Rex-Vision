"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Vision Pro pays for itself in a single session. The AI Coach changed how I think about every entry.",
    name: "Marcus Devlin",
    role: "Full-time FX Trader",
    accent: "from-sky-400 to-cyan-400",
  },
  {
    quote:
      "AI Replay is unreal — watching how the read evolves candle by candle is the best learning tool I've used.",
    name: "Sofia Marin",
    role: "Swing Trader",
    accent: "from-indigo-400 to-sky-400",
  },
  {
    quote:
      "Unlimited analyses plus economic intelligence means I never trade blind into the news anymore.",
    name: "Daniel Osei",
    role: "Prop Firm Trader",
    accent: "from-cyan-400 to-emerald-400",
  },
];

export function Testimonials() {
  return (
    <div>
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Trusted by serious traders
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Join thousands using 4RexVision to see beyond the charts.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex h-full flex-col rounded-3xl glass p-6"
          >
            <Quote className="h-7 w-7 text-sky-400/50" />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
              “{t.quote}”
            </blockquote>
            <div className="mt-4 flex items-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <figcaption className="mt-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-secondary" />
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  );
}
