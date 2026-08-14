"use client";

import * as React from "react";
import Link from "next/link";
import { Github, Twitter, Linkedin, Youtube, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const columns = [
  {
    title: "Company",
    links: ["About", "Careers", "Blog", "Press", "Contact"],
  },
  {
    title: "Resources",
    links: ["Documentation", "API Reference", "Guides", "Changelog", "Status"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Security", "Cookie Policy", "Compliance"],
  },
];

// Real destinations for footer links (others remain placeholders for now).
const LINK_HREFS: Record<string, string> = {
  "Terms of Service": "/terms",
};

const socials = [
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Github, label: "GitHub", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border/60">
      <div className="container py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              See Beyond the Charts. AI-powered market intelligence that turns
              screenshots into professional trading analysis.
            </p>

            <div className="mt-6">
              <h4 className="text-sm font-semibold">Subscribe to our newsletter</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Market insights and product updates. No spam.
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mt-3 flex max-w-sm items-center gap-2"
              >
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-input bg-card/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
                />
                <Button type="submit" size="icon" aria-label="Subscribe" className="shrink-0 hover-zoom">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href={LINK_HREFS[link] ?? "#"}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} 4RexVision. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-sky-500/40 hover:text-foreground"
              >
                <s.icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
