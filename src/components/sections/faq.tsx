"use client";

import { SectionHeading } from "./section-heading";
import { Reveal } from "@/components/ui/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is 4RexVision?",
    a: "4RexVision is an intelligence platform that turns trading chart screenshots into professional market analysis. Our AI reads price action, detects patterns and correlates economic data to deliver an institutional-grade breakdown in seconds.",
  },
  {
    q: "How does the AI analyze my charts?",
    a: "We use a purpose-built computer vision model that interprets candlesticks, market structure and chart patterns directly from an image — just like a seasoned analyst. It then layers technical reasoning and live economic intelligence on top.",
  },
  {
    q: "Which markets and assets are supported?",
    a: "Forex, crypto, indices, commodities and stocks are all supported. If it produces a chart, 4RexVision can read it. Any timeframe works, from 1-minute scalps to weekly swing setups.",
  },
  {
    q: "Is 4RexVision giving me financial advice?",
    a: "No. We provide educational analysis and probabilistic insights to support your own decision-making. Every output includes transparent reasoning so you stay in control. Always trade responsibly and within your risk tolerance.",
  },
  {
    q: "How accurate is the analysis?",
    a: "Each analysis includes a confidence score and explainable reasoning so you can judge reliability for yourself. The AI is continuously improved, but markets are probabilistic — we surface edges, not guarantees.",
  },
  {
    q: "Can I keep a record of my analyses?",
    a: "Yes. Every analysis is automatically saved to your Trading Journal, where you can search, filter, review and learn from your history. Professional and Enterprise plans include unlimited history.",
  },
  {
    q: "What does the free plan include?",
    a: "The Free plan gives you 3 AI analyses per day, basic analysis output, history and community support — no credit card required. Upgrade to Professional anytime for unlimited analyses and advanced features.",
  },
  {
    q: "Do you offer an API or enterprise plan?",
    a: "Yes. Our Enterprise plan includes custom AI models, unlimited users, full API access and dedicated support — ideal for prop firms, funds and trading communities. Contact our sales team to design a plan around your needs.",
  },
  {
    q: "Is my data secure and private?",
    a: "Absolutely. Your uploads and analyses are encrypted in transit and at rest. We never sell your data, and you can delete your history at any time.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Subscriptions are flexible and you can cancel or change plans whenever you like — no lock-in contracts and no cancellation fees.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 md:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Everything you need to know about 4RexVision. Can't find an answer? Reach out to our team."
        />

        <Reveal className="mx-auto mt-14 max-w-3xl">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
