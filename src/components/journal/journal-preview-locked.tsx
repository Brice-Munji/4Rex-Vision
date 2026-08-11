import Link from "next/link";
import {
  Lock,
  TrendingUp,
  Target,
  Activity,
  CalendarClock,
  Brain,
  LineChart,
  ArrowUpRight,
  Crown,
} from "lucide-react";

function PreviewCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </div>
      <div className="select-none blur-[1.5px]">{children}</div>
    </div>
  );
}

function MiniChart() {
  const pts = [8, 14, 11, 20, 26, 22, 34, 40, 38, 52, 60, 72];
  const max = 80;
  const d = pts
    .map((p, i) => `${(i / (pts.length - 1)) * 100},${40 - (p / max) * 38}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-20 w-full" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke="#3B82F6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function JournalPreviewLocked() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border glass-strong p-8 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.12]" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Crown className="h-3.5 w-3.5" />
          Rex Pro feature
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Turn every analysis into a measurable trading journey.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          The Smart Journal auto-logs your analyses, tracks emotions and news risk, and shows
          exactly what happened next — so you can compound discipline into an edge.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/billing"
            className="inline-flex h-14 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Lock className="h-4 w-4" />
            Unlock Smart Journal with Rex Pro
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Included in Rex Pro • $15.99/month</p>
      </div>

      {/* Feature previews */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PreviewCard icon={<TrendingUp className="h-4 w-4" />} title="Win Rate">
          <div className="text-4xl font-bold tracking-tight">63%</div>
          <div className="mt-1 text-xs text-muted-foreground">42 of 67 trades</div>
        </PreviewCard>

        <PreviewCard icon={<Target className="h-4 w-4" />} title="Average R">
          <div className="text-4xl font-bold tracking-tight text-emerald-400">+1.8R</div>
          <div className="mt-1 text-xs text-muted-foreground">per closed trade</div>
        </PreviewCard>

        <PreviewCard icon={<CalendarClock className="h-4 w-4" />} title="What Happened Next">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Target reached</span><span className="text-emerald-400">Yes</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Time to target</span><span>1h 12m</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Accuracy</span><span>82%</span></div>
          </div>
        </PreviewCard>

        <PreviewCard icon={<Activity className="h-4 w-4" />} title="News Risk Score">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-sm font-semibold text-rose-400">High</span>
            <span className="text-xs text-muted-foreground">USD CPI within 20m</span>
          </div>
        </PreviewCard>

        <PreviewCard icon={<Brain className="h-4 w-4" />} title="Emotion Tracking">
          <div className="flex flex-wrap gap-1.5">
            {["Calm", "Confident", "Patient", "FOMO"].map((e) => (
              <span key={e} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{e}</span>
            ))}
          </div>
        </PreviewCard>

        <PreviewCard icon={<LineChart className="h-4 w-4" />} title="Performance">
          <MiniChart />
        </PreviewCard>
      </div>
    </div>
  );
}
