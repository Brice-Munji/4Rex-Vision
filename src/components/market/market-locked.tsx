import Link from "next/link";
import {
  Lock,
  ArrowUpRight,
  Crown,
  Radio,
  CalendarClock,
  Activity,
  Clock,
  GitBranch,
  Sparkles,
} from "lucide-react";

/** A single blurred, non-interactive preview card. */
function PreviewCard({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#1F1F1F] bg-[#111111] p-6">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <h3 className="text-sm font-semibold text-[#F5F5F5]">{title}</h3>
      </div>
      <div className="mt-5 select-none blur-[3px]">{children}</div>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#0A0A0A]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Rex Pro upsell shown to non-Pro users — blurred preview + upgrade CTA. */
export function MarketLocked() {
  return (
    <div className="space-y-6">
      {/* Header (matches the live layout) */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_28px_-10px_rgba(59,130,246,0.7)]">
          <Radio className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F5F5]">Market Intelligence</h1>
          <p className="mt-0.5 text-sm text-[#A3A3A3]">Real-time trading context</p>
        </div>
      </div>

      <div className="relative">
        {/* Blurred preview grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-hidden>
          <PreviewCard icon={CalendarClock} title="Upcoming High-Impact News" accent="bg-rose-500/10 text-rose-400">
            <div className="space-y-3 text-sm">
              {[
                ["13:30", "USD", "CPI m/m", "HIGH"],
                ["14:45", "EUR", "ECB Press Conference", "HIGH"],
                ["16:00", "GBP", "BoE Gov Speaks", "MED"],
              ].map(([t, c, e, i]) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-12 font-semibold text-[#F5F5F5]">{t}</span>
                  <span className="rounded-md bg-[#0A0A0A] px-2 py-0.5 text-[11px] font-bold text-[#A3A3A3]">{c}</span>
                  <span className="flex-1 truncate text-[#F5F5F5]">{e}</span>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">{i}</span>
                </div>
              ))}
            </div>
          </PreviewCard>

          <PreviewCard icon={Activity} title="Rex Sentiment by Pair" accent="bg-primary/10 text-primary">
            <div className="space-y-4">
              {[
                ["EUR/USD", "Bullish", 64, "bg-emerald-500"],
                ["GBP/USD", "Bullish", 61, "bg-emerald-500"],
                ["USD/JPY", "Bearish", 57, "bg-rose-500"],
                ["XAU/USD", "Bearish", 71, "bg-rose-500"],
              ].map(([p, l, v, col]) => (
                <div key={p as string}>
                  <div className="flex justify-between text-sm text-[#F5F5F5]">
                    <span className="font-semibold">{p}</span>
                    <span>{l} {v}%</span>
                  </div>
                  <div className="mt-1.5"><Bar pct={v as number} color={col as string} /></div>
                </div>
              ))}
            </div>
          </PreviewCard>

          <PreviewCard icon={Clock} title="Active Trading Sessions" accent="bg-primary/10 text-primary">
            <div className="space-y-3">
              {[
                ["Tokyo", "Low", 20, "bg-[#1F1F1F]"],
                ["London", "High", 90, "bg-primary"],
                ["New York", "Medium", 55, "bg-[#A3A3A3]"],
              ].map(([n, a, v, col]) => (
                <div key={n as string} className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-3">
                  <div className="flex justify-between text-sm text-[#F5F5F5]">
                    <span className="font-semibold">{n}</span>
                    <span>{a}</span>
                  </div>
                  <div className="mt-2"><Bar pct={v as number} color={col as string} /></div>
                </div>
              ))}
            </div>
          </PreviewCard>

          <PreviewCard icon={GitBranch} title="Correlation Watch" accent="bg-primary/10 text-primary">
            <div className="space-y-2.5 text-sm">
              {[
                ["EUR/USD ↔ GBP/USD", "+0.91", "text-emerald-400"],
                ["USD/JPY ↔ XAU/USD", "-0.62", "text-rose-400"],
                ["EUR/USD ↔ XAU/USD", "-0.41", "text-rose-400"],
                ["GBP/USD ↔ XAU/USD", "-0.38", "text-rose-400"],
              ].map(([p, v, col]) => (
                <div key={p as string} className="flex items-center justify-between rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2.5">
                  <span className="font-semibold text-[#F5F5F5]">{p}</span>
                  <span className={`font-bold ${col}`}>{v}</span>
                </div>
              ))}
            </div>
          </PreviewCard>
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-[#050505]/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[24px] border border-primary/25 bg-[#0A0A0A]/90 p-8 text-center shadow-[0_0_60px_-20px_rgba(59,130,246,0.7)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Crown className="h-3.5 w-3.5" />
              Rex Pro feature
            </span>
            <h2 className="mt-4 flex items-center justify-center gap-2 text-xl font-bold tracking-tight text-[#F5F5F5]">
              <Sparkles className="h-5 w-5 text-primary" />
              Unlock Market Intelligence
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#A3A3A3]">
              High-impact news, Rex sentiment by pair, live session activity and correlation watch — the full trading context, in one place.
            </p>
            <Link
              href="/billing"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Lock className="h-4 w-4" />
              Upgrade to Rex Pro
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-[#A3A3A3]">Included in Rex Pro • $15.99/month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
