"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Scale,
  Languages,
  Globe,
  SkipForward,
  Loader2,
  BookOpen,
  Moon,
  GraduationCap,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { ProfileDto } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const TOTAL_STEPS = 4;

const LANGUAGES: { value: "en" | "ar" | "ur" | "fa"; label: string; native: string; rtl: boolean }[] = [
  { value: "en", label: "English", native: "English", rtl: false },
  { value: "ar", label: "Arabic", native: "العربية", rtl: true },
  { value: "ur", label: "Urdu", native: "اردو", rtl: true },
  { value: "fa", label: "Persian (Farsi)", native: "فارسی", rtl: true },
];

const INTERESTS: { slug: string; label: string; description: string }[] = [
  { slug: "fiqh", label: "Fiqh", description: "Jurisprudence & law" },
  { slug: "aqeedah", label: "Aqeedah", description: "Theology & creed" },
  { slug: "history", label: "History", description: "Seerah & Maqtal" },
  { slug: "akhlaq", label: "Akhlaq", description: "Ethics & character" },
  { slug: "tafsir", label: "Tafsir", description: "Qurʾanic exegesis" },
  { slug: "arabic_for_quran", label: "Arabic-for-Quran", description: "Language of revelation" },
  { slug: "hadith_science", label: "Hadith Science", description: "Rijāl & grading" },
  { slug: "supplication", label: "Supplication", description: "Duʿāʾ & adhkār" },
];

// ------------------------------------------------------------------
// MAIN VIEW
// ------------------------------------------------------------------
export function OnboardingView() {
  const { data, loading, error } = useApi<{ profile: ProfileDto }>("/api/me");
  const profile = data?.profile;
  const setView = useStore((s) => s.setView);
  const setUserMadhab = useStore((s) => s.setUserMadhab);
  const bumpRefresh = useStore((s) => s.bumpRefresh);

  const [step, setStep] = React.useState(0);
  const [madhab, setMadhab] = React.useState<"shia" | "sunni">("shia");
  const [language, setLanguage] = React.useState<"en" | "ar" | "ur" | "fa">("en");
  const [interests, setInterests] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // ---- Finish: PATCH all at once, then redirect ----
  async function finish(payload: {
    madhab: "shia" | "sunni";
    language: "en" | "ar" | "ur" | "fa";
    interests: string[];
  }) {
    setSubmitting(true);
    try {
      await apiFetch("/api/profile/settings", {
        method: "PATCH",
        body: JSON.stringify({
          madhab: payload.madhab,
          language: payload.language,
          interests: payload.interests,
          onboarded: true,
        }),
      });
      setUserMadhab(payload.madhab);
      bumpRefresh();
      setView("dashboard");
      toast.success("Welcome to ILM!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not finish onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <OnboardingShell step={0}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </OnboardingShell>
    );
  }

  if (error) {
    return (
      <OnboardingShell step={0}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </OnboardingShell>
    );
  }

  // ---- Already onboarded ----
  if (profile?.onboarded) {
    return (
      <OnboardingShell step={0}>
        <Card className="text-center">
          <CardContent className="space-y-4 py-10">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold">You&apos;re already onboarded</h2>
              <p className="text-sm text-muted-foreground">
                Welcome back. You can adjust your preferences anytime in Settings.
              </p>
            </div>
            <Button onClick={() => setView("dashboard")}>
              Go to dashboard
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </OnboardingShell>
    );
  }

  // ---- Step render ----
  const canContinue =
    step === 0 ||
    step === 1 || // madhab always has a default
    step === 2 || // language always has a default
    step === 3;   // interests can be empty

  return (
    <OnboardingShell step={step}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 0 && (
          <Step key="welcome">
            <WelcomeStep />
          </Step>
        )}
        {step === 1 && (
          <Step key="madhab">
            <MadhabStep madhab={madhab} setMadhab={setMadhab} />
          </Step>
        )}
        {step === 2 && (
          <Step key="language">
            <LanguageStep language={language} setLanguage={setLanguage} />
          </Step>
        )}
        {step === 3 && (
          <Step key="interests">
            <InterestsStep interests={interests} setInterests={setInterests} />
          </Step>
        )}
      </AnimatePresence>

      {/* Nav row */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={submitting}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground"
            disabled={submitting}
            onClick={() =>
              finish({
                madhab: "shia",
                language: "en",
                interests: [],
              })
            }
          >
            <SkipForward className="size-3.5" />
            Skip
          </Button>

          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue || submitting}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={() =>
                finish({
                  madhab,
                  language,
                  interests,
                })
              }
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Finish
            </Button>
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}

// ------------------------------------------------------------------
// Shell — full-screen, centered, ilm-pattern background, no sidebar
// ------------------------------------------------------------------
function OnboardingShell({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  const pct = ((step + 1) / TOTAL_STEPS) * 100;
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Pattern + soft tint overlay */}
      <div className="pointer-events-none absolute inset-0 ilm-pattern opacity-70" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, oklch(0.52 0.12 162 / 0.10), transparent 55%), radial-gradient(circle at 50% 100%, oklch(0.72 0.14 80 / 0.08), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Brand */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span className="font-extrabold ilm-gradient-text text-lg">ILM</span>
          </div>

          {/* Progress */}
          <div className="mb-6 space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Step ${i + 1}`}
                  className={cn(
                    "size-1.5 rounded-full transition-all",
                    i === step
                      ? "bg-primary w-5"
                      : i < step
                      ? "bg-primary/60"
                      : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Card body */}
          <Card className="border-border/60 shadow-lg">{children}</Card>

          {/* Footer disclaimer */}
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            You can change any of these later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// AnimatePresence step wrapper
// ------------------------------------------------------------------
function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="p-6"
    >
      {children}
    </motion.div>
  );
}

// ==================================================================
// Step 1 — Welcome
// ==================================================================
function WelcomeStep() {
  return (
    <div className="space-y-5 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-white shadow-lg ilm-pulse"
      >
        <Sparkles className="size-9" />
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Welcome to <span className="ilm-gradient-text">ILM</span>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A gamified Islamic Studies platform built on a{" "}
          <span className="font-semibold text-foreground">source-of-truth library</span>.
          Every text you study is traceable to a reviewed primary source.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2">
        <Feature icon={<BookOpen className="size-4" />} label="Sourced" />
        <Feature icon={<GraduationCap className="size-4" />} label="Structured" />
        <Feature icon={<Moon className="size-4" />} label="Humane" />
      </div>

      <p className="pt-2 text-xs text-muted-foreground">
        Let&apos;s take 30 seconds to personalise your experience.
      </p>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/40 px-2 py-3">
      <span className="text-primary">{icon}</span>
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}

// ==================================================================
// Step 2 — Madhab track
// ==================================================================
function MadhabStep({
  madhab,
  setMadhab,
}: {
  madhab: "shia" | "sunni";
  setMadhab: (m: "shia" | "sunni") => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-primary" />
          <h2 className="text-lg font-bold">Pick your madhab track</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose the school of thought whose content you want to study. Tracks are
          never merged.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MadhabCard
          value="shia"
          selected={madhab === "shia"}
          onSelect={() => setMadhab("shia")}
          title="Shia"
          tagline="Primary track"
          description="Twelver Imami scholarship — al-Kāfī, Nahj al-Balāgha, Biḥār al-Anwār."
          accent="emerald"
        />
        <MadhabCard
          value="sunni"
          selected={madhab === "sunni"}
          onSelect={() => setMadhab("sunni")}
          title="Sunni"
          tagline="Secondary track"
          description="Canonical Sunni scholarship — Ṣaḥīḥ al-Bukhārī, Ṣaḥīḥ Muslim, more."
          accent="sky"
        />
      </div>

      <Alert>
        <AlertDescription>
          You can switch tracks anytime in Settings — the Library, Tracks, and
          Courses you see will re-filter accordingly.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function MadhabCard({
  selected,
  onSelect,
  title,
  tagline,
  description,
  accent,
}: {
  value: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  tagline: string;
  description: string;
  accent: "emerald" | "sky";
}) {
  const ring =
    accent === "emerald"
      ? "border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/5"
      : "border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/5";
  const accentText =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-sky-600 dark:text-sky-400";
  const accentBg =
    accent === "emerald"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-sky-500/15 text-sky-600 dark:text-sky-400";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        selected ? ring : "bg-card hover:bg-accent/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-lg",
            selected ? accentBg : "bg-muted text-muted-foreground"
          )}
        >
          <Scale className="size-4" />
        </span>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full text-white",
              accent === "emerald" ? "bg-emerald-500" : "bg-sky-500"
            )}
          >
            <Check className="size-3.5" />
          </motion.span>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-extrabold">{title}</span>
          <span className={cn("text-[10px] font-bold uppercase tracking-wide", accentText)}>
            {tagline}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
}

// ==================================================================
// Step 3 — Language / RTL
// ==================================================================
function LanguageStep({
  language,
  setLanguage,
}: {
  language: "en" | "ar" | "ur" | "fa";
  setLanguage: (l: "en" | "ar" | "ur" | "fa") => void;
}) {
  const meta = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-primary" />
          <h2 className="text-lg font-bold">Choose your language</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The interface language. Right-to-left layout is auto-detected for
          Arabic, Urdu, and Persian.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {LANGUAGES.map((l) => {
          const selected = l.value === language;
          return (
            <button
              key={l.value}
              type="button"
              onClick={() => setLanguage(l.value)}
              aria-pressed={selected}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
                selected
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "bg-card hover:bg-accent/40"
              )}
            >
              <div className="flex items-center gap-3">
                <Globe className={cn("size-4", selected ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className="text-sm font-semibold">{l.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {l.rtl ? "RTL" : "LTR"} · auto-detected
                  </div>
                </div>
              </div>
              <span className="arabic text-lg text-foreground">{l.native}</span>
            </button>
          );
        })}
      </div>

      <Alert>
        <AlertDescription>
          You can also force an RTL override in Settings if you prefer a
          right-to-left layout regardless of language.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-end text-xs text-muted-foreground">
        Selected: <span className="ml-1 font-semibold text-foreground">{meta.label}</span>
      </div>
    </div>
  );
}

// ==================================================================
// Step 4 — Interests
// ==================================================================
function InterestsStep({
  interests,
  setInterests,
}: {
  interests: string[];
  setInterests: (next: string[]) => void;
}) {
  function toggle(slug: string) {
    if (interests.includes(slug)) {
      setInterests(interests.filter((s) => s !== slug));
    } else {
      setInterests([...interests, slug]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <h2 className="text-lg font-bold">What interests you?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick a few topics — we&apos;ll use these to recommend tracks and
          courses. You can change them later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
        {INTERESTS.map((it) => {
          const selected = interests.includes(it.slug);
          return (
            <button
              key={it.slug}
              type="button"
              onClick={() => toggle(it.slug)}
              aria-pressed={selected}
              className={cn(
                "group relative flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "bg-card hover:bg-accent/40 hover:-translate-y-0.5"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-transparent"
                )}
              >
                <Check className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{it.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {it.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {interests.length === 0
            ? "Optional — pick at least one to personalise recommendations."
            : `${interests.length} selected`}
        </span>
        {interests.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInterests([])}
            className="h-7 text-xs"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
