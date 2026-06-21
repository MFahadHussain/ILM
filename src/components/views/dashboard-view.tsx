"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Flame,
  Award,
  BookCheck,
  ChevronRight,
  Lock,
  Clock,
  Compass,
  Trophy,
  Target,
  AlertCircle,
  BookOpen,
  Layers,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ProfileDto, ActivityDay } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { LevelRing } from "@/components/ilm/level-ring";
import { StreakBadge } from "@/components/ilm/streak-badge";
import { IlmIcon } from "@/components/ilm/icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ContinueLearningItem {
  courseId: string;
  courseTitle: string;
  trackTitle: string;
  coverColor: string | null;
  difficulty: string;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  completedLessons: number;
  totalLessons: number;
  progress: number;
}

interface RecommendedItem {
  courseId: string;
  courseTitle: string;
  trackTitle: string;
  coverColor: string | null;
  difficulty: string;
  estimatedHours: number;
  lessonCount: number;
  gated: boolean;
}

interface MeResponse {
  profile: ProfileDto;
  continueLearning: ContinueLearningItem[];
  recommended: RecommendedItem[];
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COVER_BORDER: Record<string, string> = {
  emerald: "border-l-emerald-500",
  green: "border-l-emerald-500",
  teal: "border-l-teal-500",
  gold: "border-l-amber-500",
  amber: "border-l-amber-500",
  orange: "border-l-orange-500",
  rose: "border-l-rose-500",
  red: "border-l-rose-500",
  pink: "border-l-pink-500",
  violet: "border-l-violet-500",
  purple: "border-l-violet-500",
  indigo: "border-l-violet-500",
  blue: "border-l-sky-500",
  plum: "border-l-fuchsia-500",
};

const COVER_SOFT: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  gold: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  red: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  purple: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  indigo: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  blue: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  plum: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300",
};

const RARITY_CIRCLE: Record<string, string> = {
  common: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
  rare: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  epic: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  legendary: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  advanced: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  hawza_prep: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function coverBorder(color: string | null): string {
  if (!color) return "border-l-emerald-500";
  return COVER_BORDER[color.toLowerCase()] ?? "border-l-emerald-500";
}

function coverSoft(color: string | null): string {
  if (!color) return COVER_SOFT.emerald;
  return COVER_SOFT[color.toLowerCase()] ?? COVER_SOFT.emerald;
}

function rarityClass(r: string): string {
  return RARITY_CIRCLE[r] ?? RARITY_CIRCLE.common;
}

function difficultyClass(d: string): string {
  return DIFFICULTY_BADGE[d] ?? DIFFICULTY_BADGE.beginner;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildWeeklyActivity(activity: ActivityDay[]) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const map = new Map<string, number>();
  for (const a of activity) map.set(a.dateKey, (map.get(a.dateKey) ?? 0) + a.xpGained);

  const days: { key: string; label: string; xp: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
      xp: map.get(key) ?? 0,
      isToday: key === todayKey,
    });
  }
  return days;
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Assalamu ʿalaykum";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function DailyGoalRing({ today, goal }: { today: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, (today / goal) * 100) : 0;
  const done = goal > 0 && today >= goal;
  const size = 88;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full",
        done && "ilm-pulse"
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={done ? "stroke-amber-500" : "stroke-primary"}
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Target className={cn("mb-0.5 size-3.5", done ? "text-amber-500" : "text-muted-foreground")} />
        <span className="text-base font-extrabold leading-none">{today}</span>
        <span className="text-[10px] text-muted-foreground">/ {goal} XP</span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tint,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  label: string;
  tint: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tint)}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold leading-tight tracking-tight">
              {value}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ContinueRow({ item }: { item: ContinueLearningItem }) {
  const openLesson = useStore((s) => s.openLesson);
  const setView = useStore((s) => s.setView);

  function resume() {
    if (item.nextLessonId) openLesson(item.nextLessonId);
    else setView("tracks");
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-l-4 bg-card/60 p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center",
        coverBorder(item.coverColor)
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-bold leading-tight">{item.courseTitle}</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{item.trackTitle}</p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
              difficultyClass(item.difficulty)
            )}
          >
            {item.difficulty.replace("_", " ")}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={item.progress} className="h-1.5 flex-1" />
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
            {item.completedLessons}/{item.totalLessons} · {item.progress}%
          </span>
        </div>
        {item.nextLessonTitle && (
          <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
            Next: <span className="font-medium text-foreground">{item.nextLessonTitle}</span>
          </p>
        )}
      </div>
      <Button size="sm" onClick={resume} className="shrink-0 sm:w-auto">
        Resume
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}

function RecommendedCard({ item }: { item: RecommendedItem }) {
  const setActiveCourseId = useStore((s) => s.setActiveCourseId);
  const setView = useStore((s) => s.setView);

  function open() {
    setActiveCourseId(item.courseId);
    setView("tracks");
  }

  return (
    <button
      onClick={open}
      className="group relative flex h-full flex-col gap-2 overflow-hidden rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-12 opacity-50",
          coverSoft(item.coverColor)
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-bold leading-tight">{item.courseTitle}</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.trackTitle}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
            difficultyClass(item.difficulty)
          )}
        >
          {item.difficulty.replace("_", " ")}
        </span>
      </div>

      <div className="relative mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BookOpen className="size-3" /> {item.lessonCount} lessons
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> {item.estimatedHours}h
        </span>
        {item.gated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Lock className="size-3" /> Gated
          </span>
        )}
      </div>

      <div className="relative mt-auto flex items-center justify-end pt-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Explore <ChevronRight className="size-3.5" />
        </span>
      </div>
    </button>
  );
}

function BadgeChip({
  badge,
}: {
  badge: ProfileDto["badges"][number];
}) {
  return (
    <Card className="flex flex-col items-center gap-2 p-3 text-center">
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full ring-1 ring-inset ring-black/5 dark:ring-white/10",
          rarityClass(badge.rarity)
        )}
      >
        <IlmIcon name={badge.icon} className="size-6" />
      </div>
      <div className="min-w-0 w-full">
        <div className="truncate text-xs font-bold">{badge.name}</div>
        <div className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          earned
        </div>
      </div>
    </Card>
  );
}

function SectionReveal({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function DashboardView() {
  const { data, loading, error } = useApi<MeResponse>("/api/me");
  const setView = useStore((s) => s.setView);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Couldn&apos;t load your dashboard</AlertTitle>
        <AlertDescription>
          {error ?? "Unknown error"}. Please try again in a moment.
        </AlertDescription>
      </Alert>
    );
  }

  const { profile, continueLearning, recommended } = data;
  const firstName = profile.displayName.split(" ")[0] || profile.displayName;
  const earnedBadges = profile.badges
    .filter((b) => b.earned)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))
    .slice(0, 4);
  const weekly = buildWeeklyActivity(profile.activity);
  const weeklyTotal = weekly.reduce((s, d) => s + d.xp, 0);

  return (
    <div className="space-y-6">
      {/* 1. Hero greeting card */}
      <SectionReveal delay={0}>
        <Card className="relative overflow-hidden p-0">
          {/* Decorative pattern */}
          <div className="ilm-pattern absolute inset-0 opacity-60" aria-hidden />
          <div
            className="absolute -right-12 -top-12 size-56 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {timeOfDayGreeting()},
                </div>
                <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  <span className="ilm-gradient-text">{firstName}</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Level {profile.levelInfo.level} ·{" "}
                  <span className="font-semibold text-foreground">
                    {profile.levelInfo.title}
                  </span>{" "}
                  ·{" "}
                  <span className="arabic inline-block align-middle text-base leading-none text-foreground">
                    {profile.levelInfo.titleArabic}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StreakBadge
                    streak={profile.streakCount}
                    freezes={profile.streakFreezeCount}
                  />
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    <Trophy className="size-3" /> Best {profile.longestStreak}d
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 sm:gap-5">
                <div className="flex flex-col items-center gap-1">
                  <DailyGoalRing today={profile.todayXp} goal={profile.dailyGoalXp} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Daily goal
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <LevelRing levelInfo={profile.levelInfo} size={88} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Level {profile.levelInfo.level}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </SectionReveal>

      {/* 2. Stat cards row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Sparkles}
          value={profile.xp.toLocaleString()}
          label="Total XP"
          tint="bg-primary/10 text-primary"
          delay={0.05}
        />
        <StatCard
          icon={Flame}
          value={`${profile.streakCount}d`}
          label="Day streak"
          tint="bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
          delay={0.1}
        />
        <StatCard
          icon={Award}
          value={profile.totalBadges}
          label="Badges earned"
          tint="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          delay={0.15}
        />
        <StatCard
          icon={BookCheck}
          value={profile.completedLessons}
          label="Lessons done"
          tint="bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
          delay={0.2}
        />
      </div>

      {/* 3. Continue Learning */}
      <SectionReveal delay={0.1}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="size-4 text-primary" />
                  Continue where you left off
                </CardTitle>
                <CardDescription className="mt-1">
                  Pick up the next lesson in your in-progress courses.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("tracks")}
                className="hidden shrink-0 sm:inline-flex"
              >
                Browse tracks
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {continueLearning.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BookOpen className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No courses in progress yet</p>
                  <p className="text-xs text-muted-foreground">
                    Browse the learning tracks to begin your journey.
                  </p>
                </div>
                <Button size="sm" onClick={() => setView("tracks")}>
                  Browse tracks
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="max-h-96 space-y-3 overflow-y-auto ilm-scroll pr-1">
                {continueLearning.map((item) => (
                  <ContinueRow key={item.courseId} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionReveal>

      {/* 4. Recommended */}
      {recommended.length > 0 && (
        <SectionReveal delay={0.15}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <h3 className="text-lg font-bold tracking-tight">Recommended for you</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.slice(0, 3).map((item) => (
                <RecommendedCard key={item.courseId} item={item} />
              ))}
            </div>
          </div>
        </SectionReveal>
      )}

      {/* 5. Recent badges */}
      <SectionReveal delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4 text-amber-500" />
              Recent badges
            </CardTitle>
            <CardDescription>
              The latest honours you&apos;ve earned on the path of ʿilm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earnedBadges.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <Award className="size-5 opacity-40" />
                <span>
                  No badges earned yet — complete lessons and exercises to unlock your
                  first honours.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {earnedBadges.map((b) => (
                  <BadgeChip key={b.id} badge={b} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionReveal>

      {/* 6. Weekly XP chart */}
      <SectionReveal delay={0.25}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  This week&apos;s activity
                </CardTitle>
                <CardDescription className="mt-1">
                  XP earned over the last 7 days · {weeklyTotal} XP this week.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> XP
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2.5 rounded-full bg-amber-500" /> Today
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekly}
                  margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                    labelStyle={{ color: "var(--muted-foreground)", fontSize: 11 }}
                    formatter={(v: number) => [`${v} XP`, "Earned"]}
                  />
                  <Bar dataKey="xp" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {weekly.map((d) => (
                      <Cell
                        key={d.key}
                        fill={d.isToday ? "#f59e0b" : "#10b981"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="ghost" size="sm" onClick={() => setView("profile")}>
              View all activity
              <ChevronRight className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      </SectionReveal>
    </div>
  );
}
