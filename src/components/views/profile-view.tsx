"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Trophy,
  Medal as MedalIcon,
  Bookmark,
  Lock,
  Sparkles,
  ShieldCheck,
  Eye,
  Target,
  BookCheck,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type {
  ProfileDto,
  BadgeDto,
  MedalDto,
  ActivityDay,
} from "@/lib/types";
import { IlmIcon } from "@/components/ilm/icon";
import { LevelRing } from "@/components/ilm/level-ring";
import { XpBar } from "@/components/ilm/xp-bar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const RARITY_STYLE: Record<
  BadgeDto["rarity"],
  { circle: string; ring: string; label: string; text: string }
> = {
  common: {
    circle: "bg-zinc-100 dark:bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
    ring: "ring-zinc-400/30",
    label: "Common",
    text: "text-zinc-600 dark:text-zinc-300",
  },
  rare: {
    circle:
      "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/30",
    label: "Rare",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  epic: {
    circle:
      "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/30",
    label: "Epic",
    text: "text-amber-600 dark:text-amber-300",
  },
  legendary: {
    circle: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/30",
    label: "Legendary",
    text: "text-rose-600 dark:text-rose-300",
  },
};

const TIER_STYLE: Record<
  MedalDto["tier"],
  { ring: string; text: string; label: string; chip: string }
> = {
  silver: {
    ring: "ring-zinc-400/60",
    text: "text-zinc-600 dark:text-zinc-300",
    label: "Silver",
    chip:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 ring-zinc-400/30",
  },
  gold: {
    ring: "ring-amber-500/60",
    text: "text-amber-700 dark:text-amber-300",
    label: "Gold",
    chip:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30",
  },
  platinum: {
    ring: "ring-cyan-400/60",
    text: "text-cyan-700 dark:text-cyan-300",
    label: "Platinum",
    chip:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 ring-cyan-400/30",
  },
};

function humanizeRule(rule: string) {
  if (!rule) return "";
  if (rule.startsWith("lesson:")) return "Complete a specific lesson";
  if (rule.startsWith("course_start:")) return "Begin a specific course";
  if (rule.startsWith("course_done:")) return "Complete a specific course";
  if (rule.startsWith("track_done:")) return "Complete an entire track";
  if (rule.startsWith("book_3:")) return "Study 3 units from a specific book";
  if (rule === "first_lesson") return "Complete your first lesson";
  if (rule === "streak_7") return "Reach a 7-day streak";
  if (rule === "streak_30") return "Maintain a 30-day streak";
  if (rule === "identify_daif") return "Correctly identify a weak narration";
  if (rule === "perfect_5") return "Score 100% on 5 exercises";
  if (rule === "weekly_xp_500") return "Earn 500 XP in a single week";
  return rule.split("_").join(" ");
}

function rolePill(role: string) {
  const r = (role ?? "").toLowerCase();
  if (r === "scholar") {
    return "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 ring-fuchsia-500/30";
  }
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30";
}

// ------------------------------------------------------------------
// Activity heatmap (GitHub-style contribution graph, ~17 weeks)
// ------------------------------------------------------------------
function heatmapColor(xp: number) {
  if (xp <= 0) return "bg-muted";
  if (xp <= 20) return "bg-emerald-500/30";
  if (xp <= 40) return "bg-emerald-500/50";
  if (xp <= 60) return "bg-emerald-500/70";
  return "bg-emerald-500";
}

interface DayCell {
  date: Date;
  key: string;
  xp: number;
}

function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const map = React.useMemo(() => {
    const m = new Map<string, ActivityDay>();
    for (const a of activity ?? []) m.set(a.dateKey, a);
    return m;
  }, [activity]);

  const weeks: DayCell[][] = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Find Sunday of the current week (0 = Sun).
    const dayOfWeek = today.getDay();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);
    // Start 16 weeks before the last Sunday → 17 columns total.
    const start = new Date(lastSunday);
    start.setDate(lastSunday.getDate() - 7 * 16);
    const cols: DayCell[][] = [];
    for (let w = 0; w < 17; w++) {
      const col: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = date.toISOString().slice(0, 10);
        col.push({ date, key, xp: map.get(key)?.xpGained ?? 0 });
      }
      cols.push(col);
    }
    return cols;
  }, [map]);

  const monthLabel = (weekIndex: number) => {
    const first = weeks[weekIndex][0].date;
    if (weekIndex === 0) {
      return first.toLocaleString("en-US", { month: "short" });
    }
    const prev = weeks[weekIndex - 1][0].date;
    if (first.getMonth() !== prev.getMonth()) {
      return first.toLocaleString("en-US", { month: "short" });
    }
    return "";
  };

  const dayLabels = ["Mon", "Wed", "Fri"];

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto ilm-scroll pb-1">
        <div className="inline-flex flex-col gap-1.5">
          {/* Month labels row */}
          <div className="flex gap-1 pl-7 text-[10px] font-medium text-muted-foreground">
            {weeks.map((_, w) => (
              <div
                key={w}
                className="text-left"
                style={{ width: 12, minWidth: 12 }}
              >
                {monthLabel(w)}
              </div>
            ))}
          </div>
          {/* Grid + day labels */}
          <div className="flex gap-1">
            <div className="flex w-6 flex-col justify-between py-0 text-[9px] leading-3 text-muted-foreground">
              {dayLabels.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="flex gap-1">
              {weeks.map((col, w) => (
                <div key={w} className="flex flex-col gap-1">
                  {col.map((cell) => (
                    <Tooltip key={cell.key}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "size-3 rounded-[3px] transition-colors",
                            heatmapColor(cell.xp)
                          )}
                          aria-label={`${cell.key}: ${cell.xp} XP`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="font-semibold">
                          {cell.date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="opacity-80">{cell.xp} XP earned</div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Less</span>
        <span className="size-3 rounded-[3px] bg-muted" />
        <span className="size-3 rounded-[3px] bg-emerald-500/30" />
        <span className="size-3 rounded-[3px] bg-emerald-500/50" />
        <span className="size-3 rounded-[3px] bg-emerald-500/70" />
        <span className="size-3 rounded-[3px] bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Badge & medal cards
// ------------------------------------------------------------------
function BadgeTile({ badge }: { badge: BadgeDto }) {
  const r = RARITY_STYLE[badge.rarity];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-all",
            badge.earned
              ? "hover:shadow-md hover:-translate-y-0.5"
              : "opacity-60"
          )}
        >
          <div
            className={cn(
              "relative flex size-12 items-center justify-center rounded-full ring-2 ring-inset",
              badge.earned ? cn(r.circle, r.ring) : "bg-muted text-muted-foreground grayscale"
            )}
          >
            <IlmIcon name={badge.icon} size={22} />
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
      <TooltipContent className="max-w-[220px]">
        <div className="font-semibold">{badge.name}</div>
        <div className="opacity-90">{badge.description}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
          {humanizeRule(badge.criteriaRule)}
        </div>
        {badge.earned && badge.earnedAt && (
          <div className="mt-0.5 text-[10px] opacity-70">
            Earned {fmtDate(badge.earnedAt)}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function MedalTile({ medal }: { medal: MedalDto }) {
  const t = TIER_STYLE[medal.tier];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group relative flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
            medal.earned ? "hover:shadow-md hover:-translate-y-0.5" : "opacity-55"
          )}
        >
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full ring-2 ring-inset",
              medal.earned
                ? cn("bg-card", t.ring, t.text)
                : "bg-muted text-muted-foreground grayscale ring-transparent"
            )}
          >
            <IlmIcon name={medal.icon} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{medal.name}</div>
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
        <div className="opacity-90">{medal.description}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
          {humanizeRule(medal.criteriaRule)}
        </div>
        {medal.earned && medal.earnedAt && (
          <div className="mt-0.5 text-[10px] opacity-70">
            Awarded {fmtDate(medal.earnedAt)}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ------------------------------------------------------------------
// Settings (privacy + daily goal)
// ------------------------------------------------------------------
function SettingRow({
  icon,
  title,
  description,
  checked,
  onToggle,
  field,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  field: "publicProfile" | "leaderboardOptIn";
}) {
  const [pending, setPending] = React.useState(false);

  async function handle(next: boolean) {
    setPending(true);
    try {
      await apiFetch("/api/profile/settings", {
        method: "PATCH",
        body: JSON.stringify({ [field]: next }),
      });
      useStore.getState().bumpRefresh();
      toast.success(`${title} ${next ? "enabled" : "disabled"}.`);
      onToggle(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={pending}
        onCheckedChange={handle}
        aria-label={title}
      />
    </div>
  );
}

function DailyGoalSelect({ value }: { value: number }) {
  const [pending, setPending] = React.useState(false);
  const [current, setCurrent] = React.useState(value);

  React.useEffect(() => setCurrent(value), [value]);

  async function patch(next: number) {
    setPending(true);
    try {
      await apiFetch("/api/profile/settings", {
        method: "PATCH",
        body: JSON.stringify({ dailyGoalXp: next }),
      });
      useStore.getState().bumpRefresh();
      setCurrent(next);
      toast.success(`Daily goal set to ${next} XP.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Target className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">Daily XP goal</div>
          <div className="text-xs text-muted-foreground">
            Choose a manageable daily target to build a steady streak.
          </div>
        </div>
      </div>
      <Select
        value={String(current)}
        disabled={pending}
        onValueChange={(v) => patch(Number(v))}
      >
        <SelectTrigger className="w-24" aria-label="Daily XP goal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="25">25 XP</SelectItem>
          <SelectItem value="50">50 XP</SelectItem>
          <SelectItem value="100">100 XP</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ------------------------------------------------------------------
// Stat chip
// ------------------------------------------------------------------
function StatChip({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tone?: "default" | "flame" | "gold";
}) {
  const toneCls =
    tone === "flame"
      ? "text-orange-600 dark:text-orange-400"
      : tone === "gold"
      ? "text-amber-600 dark:text-amber-400"
      : "text-primary";
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <span className={toneCls}>{icon}</span>
      <div className="leading-tight">
        <div className="text-sm font-bold">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// ProfileView
// ------------------------------------------------------------------
export function ProfileView() {
  const { data, loading, error } = useApi<{ profile: ProfileDto }>("/api/me");
  const profile = data?.profile;
  const [tab, setTab] = React.useState("overview");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card className="p-4 text-sm text-destructive">
        Failed to load profile: {error ?? "no profile"}
      </Card>
    );
  }

  const earnedBadges = profile.badges.filter((b) => b.earned);
  const lockedBadges = profile.badges.filter((b) => !b.earned);
  const earnedMedals = profile.medals.filter((m) => m.earned);
  const lockedMedals = profile.medals.filter((m) => !m.earned);

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto ilm-scroll">
          <TabsList className="w-full min-w-max sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="badges">
              Badges & Medals
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                {profile.totalBadges + profile.totalMedals}
              </span>
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              Bookmarks
              {profile.bookmarks.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-bold">
                  {profile.bookmarks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        {/* ---------- OVERVIEW ---------- */}
        <TabsContent value="overview" className="space-y-6">
          {/* Profile header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="relative overflow-hidden p-0">
              <div className="ilm-pattern absolute inset-0 opacity-60" aria-hidden />
              <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-amber-500 text-xl font-extrabold text-white shadow-md ring-2 ring-background">
                    {initials(profile.displayName)}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
                      {profile.displayName}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                          rolePill(profile.role)
                        )}
                      >
                        <ShieldCheck className="size-3" />
                        {profile.role}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                          profile.madhab?.toLowerCase() === "shia"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 ring-zinc-400/30"
                        )}
                      >
                        {profile.madhab || "shared"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Level + XP */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <LevelRing levelInfo={profile.levelInfo} size={80} />
                    <div className="mt-1 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        {profile.levelInfo.title}
                      </div>
                      <div className="arabic text-xs text-muted-foreground">
                        {profile.levelInfo.titleArabic}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <XpBar levelInfo={profile.levelInfo} xp={profile.xp} />
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{profile.xp}</span>{" "}
                      total XP
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat chips */}
              <div className="relative grid grid-cols-2 gap-2 border-t bg-card/40 p-4 md:grid-cols-3 lg:grid-cols-6">
                <StatChip
                  icon={<Sparkles className="size-4" />}
                  value={profile.xp}
                  label="Total XP"
                />
                <StatChip
                  icon={<Flame className="size-4" />}
                  value={profile.streakCount}
                  label="Day streak"
                  tone="flame"
                />
                <StatChip
                  icon={<Trophy className="size-4" />}
                  value={profile.longestStreak}
                  label="Longest streak"
                  tone="gold"
                />
                <StatChip
                  icon={<MedalIcon className="size-4" />}
                  value={profile.totalBadges}
                  label="Badges"
                />
                <StatChip
                  icon={<Trophy className="size-4" />}
                  value={profile.totalMedals}
                  label="Medals"
                  tone="gold"
                />
                <StatChip
                  icon={<BookCheck className="size-4" />}
                  value={`${profile.completedLessons}/${profile.totalLessonsAvailable}`}
                  label="Lessons"
                />
              </div>
            </Card>
          </motion.div>

          {/* Activity heatmap */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Activity</h3>
                <p className="text-xs text-muted-foreground">
                  Last 17 weeks of study. Hover any day for details.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  {profile.todayXp} XP today
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Goal: {profile.dailyGoalXp} XP/day
                </span>
              </div>
            </div>
            <ActivityHeatmap activity={profile.activity} />
          </Card>
        </TabsContent>

        {/* ---------- BADGES & MEDALS ---------- */}
        <TabsContent value="badges" className="space-y-6">
          {/* Badges */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Badge case</h3>
                <p className="text-xs text-muted-foreground">
                  Rule-based achievements earned across the platform.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                {earnedBadges.length}/{profile.badges.length} earned
              </span>
            </div>
            {profile.badges.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No badges defined yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {[...earnedBadges, ...lockedBadges].map((b) => (
                  <BadgeTile key={b.id} badge={b} />
                ))}
              </div>
            )}
          </Card>

          {/* Medals */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Medal case</h3>
                <p className="text-xs text-muted-foreground">
                  Tiered honours for major milestones (silver / gold / platinum).
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                {earnedMedals.length}/{profile.medals.length} earned
              </span>
            </div>
            {profile.medals.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No medals defined yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[...earnedMedals, ...lockedMedals].map((m) => (
                  <MedalTile key={m.id} medal={m} />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---------- BOOKMARKS ---------- */}
        <TabsContent value="bookmarks">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Bookmarks</h3>
                <p className="text-xs text-muted-foreground">
                  Saved text units & lesson passages for later review.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                {profile.bookmarks.length}
              </span>
            </div>
            {profile.bookmarks.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bookmark className="mx-auto mb-2 size-8 opacity-40" />
                No bookmarks yet. Save passages from lessons to find them here.
              </div>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto ilm-scroll pr-1">
                {profile.bookmarks.map((bm) => (
                  <li
                    key={bm.id}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bookmark className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {bm.lessonTitle ?? "Lesson"}
                      </div>
                      {bm.textUnitLocator && (
                        <div className="text-xs text-muted-foreground">
                          {bm.textUnitLocator}
                        </div>
                      )}
                      {bm.note && (
                        <div className="mt-1.5 text-sm italic text-foreground/80">
                          “{bm.note}”
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* ---------- SETTINGS ---------- */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              <h3 className="text-base font-bold">Privacy & visibility</h3>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Leaderboard participation is opt-in and off by default. We respect
              learners who prefer private study.
            </p>
            <div className="divide-y">
              <SettingRow
                icon={<Eye className="size-4" />}
                title="Public profile"
                description="Allow other learners to view your profile page and progress."
                checked={profile.publicProfile}
                onToggle={() => {}}
                field="publicProfile"
              />
              <SettingRow
                icon={<Trophy className="size-4" />}
                title="Appear on leaderboard"
                description="Show your display name, XP and streak on the public leaderboard."
                checked={profile.leaderboardOptIn}
                onToggle={() => {}}
                field="leaderboardOptIn"
              />
              <DailyGoalSelect value={profile.dailyGoalXp} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="text-base font-bold">Account</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-muted-foreground">Language</span>
                <span className="font-semibold">{profile.language || "en"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-muted-foreground">Madhab</span>
                <span className="font-semibold capitalize">{profile.madhab}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-muted-foreground">Streak freezes left</span>
                <span className="font-semibold">{profile.streakFreezeCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-muted-foreground">Role</span>
                <span className="font-semibold capitalize">{profile.role}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Certificates recognise course completion only and are{" "}
              <span className="font-semibold">not ijāzah</span>; they confer no
              scholarly authority.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
