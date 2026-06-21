"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Trophy,
  Medal as MedalIcon,
  Award,
  Sparkles,
  Info,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import type { ProfileDto, BadgeDto, MedalDto } from "@/lib/types";
import { IlmIcon } from "@/components/ilm/icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Style tokens
// ------------------------------------------------------------------

const RARITY_STYLE: Record<
  BadgeDto["rarity"],
  {
    circle: string;
    ring: string;
    text: string;
    label: string;
    glow: string;
  }
> = {
  common: {
    circle:
      "bg-zinc-100 dark:bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
    ring: "ring-zinc-400/40",
    text: "text-zinc-600 dark:text-zinc-300",
    label: "Common",
    glow: "shadow-zinc-500/10",
  },
  rare: {
    circle:
      "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/40",
    text: "text-emerald-600 dark:text-emerald-300",
    label: "Rare",
    glow: "shadow-emerald-500/20",
  },
  epic: {
    circle:
      "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/40",
    text: "text-amber-600 dark:text-amber-300",
    label: "Epic",
    glow: "shadow-amber-500/20",
  },
  legendary: {
    circle:
      "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/40",
    text: "text-rose-600 dark:text-rose-300",
    label: "Legendary",
    glow: "shadow-rose-500/25",
  },
};

const TIER_STYLE: Record<
  MedalDto["tier"],
  { ring: string; text: string; chip: string; label: string; glow: string }
> = {
  silver: {
    ring: "ring-zinc-400/60",
    text: "text-zinc-600 dark:text-zinc-300",
    chip:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 ring-zinc-400/30",
    label: "Silver",
    glow: "shadow-zinc-500/10",
  },
  gold: {
    ring: "ring-amber-500/60",
    text: "text-amber-700 dark:text-amber-300",
    chip:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30",
    label: "Gold",
    glow: "shadow-amber-500/25",
  },
  platinum: {
    ring: "ring-teal-500/60",
    text: "text-teal-700 dark:text-teal-300",
    chip:
      "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300 ring-teal-400/30",
    label: "Platinum",
    glow: "shadow-teal-500/25",
  },
};

// Small book-slug → display-name map for humanizing `book_N:slug` rules.
const BOOK_SLUG_NAMES: Record<string, string> = {
  nhb: "Nahj al-Balagha",
  alkafi: "Al-Kafi",
  kafi: "Al-Kafi",
  bikar: "Bihar al-Anwar",
  bihar: "Bihar al-Anwar",
  tafsir: "Tafsir al-Mizan",
  mizan: "Tafsir al-Mizan",
  quran: "the Holy Qur'an",
  man: "Man La Yahduruhu al-Faqih",
  faqih: "Man La Yahduruhu al-Faqih",
};

function humanizeRule(rule: string): string {
  if (!rule) return "";
  if (rule.startsWith("lesson:")) return "Complete a specific lesson";
  if (rule.startsWith("course_start:")) return "Begin a specific course";
  if (rule.startsWith("course_done:")) return "Complete a specific course";
  if (rule.startsWith("track_done:")) return "Complete an entire track";
  // book_N:slug → "Study N TextUnits from <book>"
  const bookMatch = rule.match(/^book_(\d+):(.+)$/);
  if (bookMatch) {
    const n = bookMatch[1];
    const slug = bookMatch[2];
    const name = BOOK_SLUG_NAMES[slug.toLowerCase()] ?? `a specific book (${slug})`;
    return `Study ${n} TextUnit${n === "1" ? "" : "s"} from ${name}`;
  }
  const known: Record<string, string> = {
    first_lesson: "Complete your first lesson",
    streak_7: "Reach a 7-day streak",
    streak_30: "Maintain a 30-day streak",
    identify_daif: "Correctly identify a weak (Da'if) narration",
    perfect_5: "Score 100% on 5 exercises",
    weekly_xp_500: "Earn 500 XP in a single week",
  };
  if (known[rule]) return known[rule];
  return rule.split("_").join(" ");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// ------------------------------------------------------------------
// Badge tile (circular)
// ------------------------------------------------------------------

function BadgeTile({ badge, index }: { badge: BadgeDto; index: number }) {
  const r = RARITY_STYLE[badge.rarity] ?? RARITY_STYLE.common;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4), ease: "easeOut" }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="button"
            aria-label={`${badge.name}${badge.earned ? " — earned" : " — locked"}`}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              badge.earned
                ? cn("hover:shadow-md hover:-translate-y-0.5", r.glow)
                : "opacity-50"
            )}
          >
            <div
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full ring-2 ring-inset transition-transform group-hover:scale-105",
                badge.earned
                  ? cn(r.circle, r.ring)
                  : "bg-muted text-muted-foreground grayscale ring-transparent"
              )}
            >
              <IlmIcon name={badge.icon} size={26} />
              {!badge.earned && (
                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <Lock className="size-3 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="min-w-0 w-full">
              <div className="truncate text-xs font-bold">{badge.name}</div>
              <div
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wide",
                  badge.earned ? r.text : "text-muted-foreground"
                )}
              >
                {badge.earned ? r.label : "Locked"}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px]">
          <div className="font-semibold">{badge.name}</div>
          <div className="text-[11px] leading-relaxed opacity-90">
            {badge.description}
          </div>
          <div className="mt-1.5 flex items-start gap-1 text-[10px] uppercase tracking-wide opacity-70">
            <Info className="size-3 mt-px shrink-0" />
            <span>{humanizeRule(badge.criteriaRule) || "—"}</span>
          </div>
          {badge.earned && badge.earnedAt && (
            <div className="mt-0.5 text-[10px] opacity-70">
              Earned {fmtDate(badge.earnedAt)}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Medal tile (hexagonal shield)
// ------------------------------------------------------------------

const HEX_CLIP = {
  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
} as const;

function MedalTile({ medal, index }: { medal: MedalDto; index: number }) {
  const t = TIER_STYLE[medal.tier] ?? TIER_STYLE.silver;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4), ease: "easeOut" }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="button"
            aria-label={`${medal.name}${medal.earned ? " — awarded" : " — locked"}`}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              medal.earned
                ? cn("hover:shadow-md hover:-translate-y-0.5", t.glow)
                : "opacity-50"
            )}
          >
            <div
              className={cn(
                "relative flex size-14 items-center justify-center transition-transform group-hover:scale-105",
                medal.earned
                  ? cn("bg-card", t.ring, t.text)
                  : "bg-muted text-muted-foreground grayscale"
              )}
              style={HEX_CLIP}
            >
              {/* inner hex with subtle tint */}
              <div
                className={cn(
                  "absolute inset-[3px] flex items-center justify-center",
                  medal.earned
                    ? "bg-background/60"
                    : "bg-background/40"
                )}
                style={HEX_CLIP}
              />
              <IlmIcon
                name={medal.icon}
                size={26}
                className="relative z-10"
              />
              {!medal.earned && (
                <span className="absolute -bottom-1 -right-1 z-20 flex size-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <Lock className="size-3 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="min-w-0 w-full">
              <div className="truncate text-xs font-bold">{medal.name}</div>
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
                  medal.earned ? t.chip : "bg-muted text-muted-foreground ring-border"
                )}
              >
                <MedalIcon className="size-2.5" />
                {medal.earned ? t.label : "Locked"}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px]">
          <div className="font-semibold">{medal.name}</div>
          <div className="text-[11px] leading-relaxed opacity-90">
            {medal.description}
          </div>
          <div className="mt-1.5 flex items-start gap-1 text-[10px] uppercase tracking-wide opacity-70">
            <Info className="size-3 mt-px shrink-0" />
            <span>{humanizeRule(medal.criteriaRule) || "—"}</span>
          </div>
          {medal.earned && medal.earnedAt && (
            <div className="mt-0.5 text-[10px] opacity-70">
              Awarded {fmtDate(medal.earnedAt)}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Loading skeleton
// ------------------------------------------------------------------

function TileSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3"
        >
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-3 w-3/4 rounded" />
          <Skeleton className="h-2 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

type Filter = "all" | "earned" | "locked";

export function AchievementsView() {
  const { data, loading, error } = useApi<{ profile: ProfileDto }>("/api/me");
  const [filter, setFilter] = React.useState<Filter>("all");

  const profile = data?.profile;
  const allBadges = profile?.badges ?? [];
  const allMedals = profile?.medals ?? [];

  const earnedBadgesCount = allBadges.filter((b) => b.earned).length;
  const earnedMedalsCount = allMedals.filter((m) => m.earned).length;

  const visibleBadges = React.useMemo(() => {
    if (filter === "earned") return allBadges.filter((b) => b.earned);
    if (filter === "locked") return allBadges.filter((b) => !b.earned);
    return allBadges;
  }, [allBadges, filter]);

  const visibleMedals = React.useMemo(() => {
    if (filter === "earned") return allMedals.filter((m) => m.earned);
    if (filter === "locked") return allMedals.filter((m) => !m.earned);
    return allMedals;
  }, [allMedals, filter]);

  const badgePct =
    allBadges.length > 0
      ? Math.round((earnedBadgesCount / allBadges.length) * 100)
      : 0;
  const medalPct =
    allMedals.length > 0
      ? Math.round((earnedMedalsCount / allMedals.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header card with summary */}
      <Card className="relative overflow-hidden">
        <div className="ilm-pattern pointer-events-none absolute inset-0 opacity-40" />
        <CardHeader className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-2xl">
                  <span className="ilm-gradient-text">Achievements</span>
                </CardTitle>
              </div>
              <CardDescription>
                Your collection of badges and medals — earned through study,
                streaks, and mastery.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card/80 p-3">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
                <div className="text-sm">
                  <span className="font-bold tabular-nums">
                    {earnedBadgesCount}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}/ {allBadges.length} badges
                  </span>
                </div>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <MedalIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <div className="text-sm">
                  <span className="font-bold tabular-nums">
                    {earnedMedalsCount}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}/ {allMedals.length} medals
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Badges progress
              </span>
              <span className="font-semibold tabular-nums">{badgePct}%</span>
            </div>
            <Progress value={badgePct} className="h-2" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Medals progress
              </span>
              <span className="font-semibold tabular-nums">{medalPct}%</span>
            </div>
            <Progress
              value={medalPct}
              className="h-2 [&[data-slot=progress]>[data-slot=progress-indicator]]:bg-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter control */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="earned">Earned</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          {filter === "all"
            ? `Showing all ${visibleBadges.length + visibleMedals.length} items`
            : filter === "earned"
              ? `Showing ${visibleBadges.length + visibleMedals.length} earned items`
              : `Showing ${visibleBadges.length + visibleMedals.length} locked items`}
        </p>
      </div>

      {/* Error state */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertTitle>Could not load achievements</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold">Badges</h2>
              <Skeleton className="h-4 w-20" />
            </div>
            <TileSkeleton count={8} />
          </section>
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MedalIcon className="size-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-semibold">Medals</h2>
              <Skeleton className="h-4 w-20" />
            </div>
            <TileSkeleton count={3} />
          </section>
        </div>
      )}

      {/* Loaded content */}
      {!loading && !error && profile && (
        <div className="space-y-8">
          {/* Badges */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold">Badges</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {earnedBadgesCount} / {allBadges.length} earned
              </span>
            </div>
            {visibleBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {visibleBadges.map((b, i) => (
                  <BadgeTile key={b.id} badge={b} index={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
                {filter === "earned"
                  ? "No badges earned yet — keep studying!"
                  : filter === "locked"
                    ? "No locked badges — you have earned them all!"
                    : "No badges in the catalog."}
              </div>
            )}
          </section>

          {/* Medals */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MedalIcon className="size-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-semibold">Medals</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {earnedMedalsCount} / {allMedals.length} earned
              </span>
            </div>
            {visibleMedals.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {visibleMedals.map((m, i) => (
                  <MedalTile key={m.id} medal={m} index={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
                {filter === "earned"
                  ? "No medals awarded yet — they require sustained dedication."
                  : filter === "locked"
                    ? "No locked medals — outstanding!"
                    : "No medals in the catalog."}
              </div>
            )}
          </section>

          {/* Legend / hint */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="size-3.5 text-amber-500" />
              Rarity:
            </div>
            {(["common", "rare", "epic", "legendary"] as const).map((rar) => {
              const r = RARITY_STYLE[rar];
              return (
                <div key={rar} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-3 rounded-full ring-1 ring-inset",
                      r.circle,
                      r.ring
                    )}
                  />
                  <span className="capitalize">{r.label}</span>
                </div>
              );
            })}
            <div className="mx-2 hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-1.5 font-medium">
              <MedalIcon className="size-3.5 text-amber-500" />
              Tier:
            </div>
            {(["silver", "gold", "platinum"] as const).map((tier) => {
              const t = TIER_STYLE[tier];
              return (
                <div key={tier} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-3 rounded-sm ring-1 ring-inset",
                      t.chip
                    )}
                  />
                  <span className="capitalize">{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
