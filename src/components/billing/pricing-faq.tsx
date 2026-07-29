"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Can I switch between monthly and yearly billing?",
    a: "Yes. You can switch your billing cycle at any time from the billing dashboard. Yearly billing saves you 20% versus paying monthly.",
  },
  {
    q: "What happens when I upgrade to Vision Pro?",
    a: "Your account unlocks immediately — unlimited analyses, AI Coach, AI Replay, Market Monitoring, Economic Intelligence, unlimited history and priority processing all activate at once.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. You can cancel from the billing dashboard and keep Vision Pro until the end of your current period — no lock-in, no cancellation fees. You can reactivate any time before it ends.",
  },
  {
    q: "Do you offer refunds?",
    a: "If something isn't right, reach out within 14 days of a charge and we'll make it right. Invoices are always available to download from your billing history.",
  },
  {
    q: "Do you accept promo codes and coupons?",
    a: "Yes — promo codes and coupons are supported at checkout, and any applicable taxes are calculated automatically.",
  },
  {
    q: "When does Vision Elite launch?",
    a: "Vision Elite (multi-user workspaces, team management, API access and dedicated support) is coming soon. Contact sales to join the early-access list for trading firms and institutions.",
  },
];

export function PricingFaq() {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Everything about plans, billing and upgrades.
      </p>
      <Accordion type="single" collapsible className="mt-8 space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
