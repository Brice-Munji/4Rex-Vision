"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  GraduationCap,
  Gauge,
  TrendingUp,
  Layers,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  EXPERIENCE_OPTIONS,
  TRADING_STYLE_OPTIONS,
  CURRENCY_PAIRS,
  THEME_OPTIONS,
} from "@/lib/constants";
import { completeOnboarding } from "@/actions/onboarding";
import type {
  ExperienceLevel,
  TradingStyle,
  ThemePreference,
} from "@prisma/client";

const TOTAL_STEPS = 6;

const expIcons: Record<string, React.ElementType> = {
  BEGINNER: GraduationCap,
  INTERMEDIATE: Gauge,
  PROFESSIONAL: TrendingUp,
};
const styleIcons: Record<string, React.ElementType> = {
  SCALPING: Sparkles,
  DAY_TRADING: TrendingUp,
  SWING_TRADING: Layers,
  POSITION_TRADING: Gauge,
};
const themeIcons: Record<string, React.ElementType> = {
  DARK: Moon,
  LIGHT: Sun,
  SYSTEM: Monitor,
};

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export function OnboardingFlow({ firstName }: { firstName?: string | null }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { update } = useSession();
  const [step, setStep] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const [experience, setExperience] = React.useState<ExperienceLevel | null>(null);
  const [style, setStyle] = React.useState<TradingStyle | null>(null);
  const [pairs, setPairs] = React.useState<string[]>(["EURUSD"]);
  const [themePref, setThemePref] = React.useState<ThemePreference>("DARK");

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  function togglePair(pair: string) {
    setPairs((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair]
    );
  }

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding({
        experienceLevel: experience!,
        tradingStyle: style!,
        favoritePairs: pairs,
        themePreference: themePref,
      });
      if (res.ok) {
        setTheme(themePref.toLowerCase());
        await update({ onboardingComplete: true });
        next(); // go to success screen
      } else {
        toast.error(res.message ?? "Could not save. Please try again.");
      }
    });
  }

  const canContinue =
    (step === 1 && experience) ||
    (step === 2 && style) ||
    (step === 3 && pairs.length > 0) ||
    step === 4;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full" />
        <div className="absolute inset-0 bg-grid mask-radial opacity-[0.25]" />
      </div>

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        {step > 0 && step < 5 && (
          <span className="text-sm text-muted-foreground">
            Step {step} of 4
          </span>
        )}
      </header>

      {/* progress */}
      {step > 0 && step < 5 && (
        <div className="relative z-10 mx-auto w-full max-w-xl px-6">
          <Progress value={(step / 4) * 100} />
        </div>
      )}

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Screen 1 — Welcome */}
            {step === 0 && (
              <motion.div
                key="welcome"
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 14 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-sm"
                >
                  <Sparkles className="h-10 w-10 text-primary" />
                </motion.div>
                <h1 className="mt-8 text-balance text-4xl font-bold tracking-tight md:text-5xl">
                  Welcome to{" "}
                  <span className="text-gradient">4RexVision AI</span>
                  {firstName ? `, ${firstName}` : ""}
                </h1>
                <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                  See Beyond the Charts. Let&apos;s personalize your AI trading
                  workspace in just a few taps.
                </p>
                <Button size="lg" className="mt-10" onClick={next}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Screen 2 — Experience */}
            {step === 1 && (
              <StepShell
                key="experience"
                title="How experienced are you?"
                subtitle="We'll tune the depth of analysis to match your level."
              >
                <div className="grid gap-3">
                  {EXPERIENCE_OPTIONS.map((opt) => {
                    const Icon = expIcons[opt.value];
                    return (
                      <SelectCard
                        key={opt.value}
                        selected={experience === opt.value}
                        onClick={() => setExperience(opt.value)}
                        icon={<Icon className="h-5 w-5" />}
                        title={opt.label}
                        description={opt.description}
                      />
                    );
                  })}
                </div>
              </StepShell>
            )}

            {/* Screen 3 — Trading style */}
            {step === 2 && (
              <StepShell
                key="style"
                title="Preferred trading style"
                subtitle="This shapes timeframes and risk framing in your analysis."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {TRADING_STYLE_OPTIONS.map((opt) => {
                    const Icon = styleIcons[opt.value];
                    return (
                      <SelectCard
                        key={opt.value}
                        selected={style === opt.value}
                        onClick={() => setStyle(opt.value)}
                        icon={<Icon className="h-5 w-5" />}
                        title={opt.label}
                        description={opt.description}
                      />
                    );
                  })}
                </div>
              </StepShell>
            )}

            {/* Screen 4 — Currency pairs */}
            {step === 3 && (
              <StepShell
                key="pairs"
                title="Favorite currency pairs"
                subtitle="Pick all the pairs you trade — you can choose multiple."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {CURRENCY_PAIRS.map((pair) => {
                    const selected = pairs.includes(pair);
                    return (
                      <button
                        key={pair}
                        type="button"
                        onClick={() => togglePair(pair)}
                        className={cn(
                          "relative flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition-all",
                          selected
                            ? "border-primary/50 bg-primary/10 text-foreground"
                            : "glass hover:border-primary/30"
                        )}
                      >
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                          </span>
                        )}
                        {pair}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {pairs.length} selected
                </p>
              </StepShell>
            )}

            {/* Screen 5 — Theme */}
            {step === 4 && (
              <StepShell
                key="theme"
                title="Choose your theme"
                subtitle="You can always change this later in settings."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map((opt) => {
                    const Icon = themeIcons[opt.value];
                    const selected = themePref === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setThemePref(opt.value);
                          setTheme(opt.value.toLowerCase());
                        }}
                        className={cn(
                          "flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all",
                          selected
                            ? "border-primary/50 bg-primary/10"
                            : "glass hover:border-primary/30"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl",
                            selected
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold">{opt.label}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {opt.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {/* Screen 6 — Success */}
            {step === 5 && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <div className="relative mx-auto h-24 w-24">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 160, damping: 12 }}
                    className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500/10 shadow-sm"
                  >
                    <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -right-2 -top-2 text-amber-400"
                  >
                    <PartyPopper className="h-7 w-7" />
                  </motion.div>
                </div>
                <h1 className="mt-8 text-balance text-3xl font-bold tracking-tight md:text-4xl">
                  Your AI Trading Workspace is Ready.
                </h1>
                <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                  Everything is personalized to how you trade. Upload your first
                  chart whenever you&apos;re ready.
                </p>
                <Button
                  size="lg"
                  className="mt-10"
                  onClick={() => {
                    router.push("/dashboard");
                    router.refresh();
                  }}
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* footer nav */}
      {step > 0 && step < 5 && (
        <footer className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-6 py-6">
          <Button variant="ghost" onClick={back} disabled={pending}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={next} disabled={!canContinue}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Setting up…" : "Finish setup"}
              {!pending && <Check className="h-4 w-4" />}
            </Button>
          )}
        </footer>
      )}
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-8 text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

function SelectCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all",
        selected
          ? "border-primary/50 bg-primary/10"
          : "glass hover:border-primary/30"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
          selected
            ? "border-transparent bg-primary"
            : "border-border"
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </span>
    </button>
  );
}
