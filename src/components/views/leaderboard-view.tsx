"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Trophy,
  Flame,
  Lock,
  ChevronRight,
  AlertCircle,
  Crown,
  Sparkles,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Types
// The /api/leaderboard endpoint returns each entry with a `weeklyXp` field
// (computed from the last 7 days of ActivityLog). The shared LeaderboardEntry
// type omits it for backwards-compat, so we extend locally here.
// ---------------------------------------------------------------------------
interface LeaderboardRow extends LeaderboardEntry {
  weeklyXp: number;
}

interface LeaderboardResponse {
  entries: LeaderboardRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function rankByWeekly(entries: LeaderboardRow[]): LeaderboardRow[] {
  return [...entries]
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

function MedalMark({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300">
        <Crown className="size-4" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 ring-1 ring-zinc-400/30 dark:bg-zinc-400/20 dark:text-zinc-200">
        <Trophy className="size-4" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 ring-1 ring-orange-500/30 dark:bg-orange-700/20 dark:text-orange-300">
        <Trophy className="size-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex size-8 items-center justify-center text-sm font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------
function LeaderRow({
  entry,
  mode,
}: {
  entry: LeaderboardRow;
  mode: "all" | "week";
}) {
  const value = mode === "all" ? entry.xp : entry.weeklyXp;
  const valueLabel = mode === "all" ? "total XP" : "this week";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        entry.isCurrentUser
          ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
          : "hover:bg-accent/60"
      )}
    >
      <div className="flex w-9 shrink-0 items-center justify-center">
        <MedalMark rank={entry.rank} />
      </div>

      <Avatar className="size-9 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[11px] font-bold",
            entry.isCurrentUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {initials(entry.displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm",
            entry.isCurrentUser ? "font-bold text-primary" : "font-semibold"
          )}
        >
          {entry.displayName}
          {entry.isCurrentUser && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
              you
            </span>
          )}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          Lv {entry.level} · {entry.levelTitle}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 sm:flex">
        <Flame className="size-3.5" />
        {entry.streakCount}
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-extrabold tabular-nums">
          {value.toLocaleString()}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {valueLabel}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------
function LeaderList({
  entries,
  mode,
}: {
  entries: LeaderboardRow[];
  mode: "all" | "week";
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <Trophy className="size-8 opacity-30" />
        <p className="text-sm text-muted-foreground">
          No learners on the board yet.
        </p>
      </div>
    );
  }
  return (
    <div className="max-h-[60vh] space-y-1.5 overflow-y-auto ilm-scroll pr-1">
      {entries.map((e, i) => (
        <motion.div
          key={e.userId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
        >
          <LeaderRow entry={e} mode={mode} />
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function LeaderboardView() {
  const { data, loading, error } = useApi<LeaderboardResponse>("/api/leaderboard");
  const setView = useStore((s) => s.setView);

  if (loading) return <LeaderboardSkeleton />;
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Couldn&apos;t load the leaderboard</AlertTitle>
        <AlertDescription>
          {error ?? "Unknown error"}. Please try again shortly.
        </AlertDescription>
      </Alert>
    );
  }

  const allTime = data.entries;
  const weekly = rankByWeekly(data.entries);
  const myEntry = allTime.find((e) => e.isCurrentUser) ?? null;

  return (
    <div className="space-y-6">
      {/* 1. Header card */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="relative overflow-hidden p-0">
          <div className="ilm-pattern absolute inset-0 opacity-60" aria-hidden />
          <div
            className="absolute -right-10 -top-10 size-44 rounded-full bg-amber-500/10 blur-3xl"
            aria-hidden
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                <Trophy className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  <span className="ilm-gradient-text">Leaderboard</span>
                </h1>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Weekly &amp; all-time ranks. Only learners who opted in appear
                    here — your privacy is respected.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.section>

      {/* 2. Your rank highlight */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        {myEntry ? (
          <Card className="relative overflow-hidden border-primary/30 p-5">
            <div
              className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Trophy className="size-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your rank · all time
                </div>
                <div className="text-3xl font-extrabold tracking-tight">
                  #{myEntry.rank}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {myEntry.displayName}
                  </span>{" "}
                  · {myEntry.levelTitle}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-5">
                <div className="text-right">
                  <div className="text-2xl font-extrabold tabular-nums text-primary">
                    {myEntry.xp.toLocaleString()}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    total XP
                  </div>
                </div>
                <div className="hidden h-10 w-px bg-border sm:block" />
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-2xl font-extrabold tabular-nums text-orange-600 dark:text-orange-400">
                    <Flame className="size-5" />
                    {myEntry.streakCount}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    day streak
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Lock className="size-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">You&apos;re not on the board</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Enable the leaderboard opt-in in your Profile to compete with
                  fellow learners.
                </p>
              </div>
              <Button onClick={() => setView("profile")} className="shrink-0">
                Enable in Profile
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </Card>
        )}
      </motion.section>

      {/* 3. Tabs: all time / this week */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              Ranks
            </CardTitle>
            <CardDescription>
              {allTime.length} {allTime.length === 1 ? "learner" : "learners"}{" "}
              currently opted in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="all">All Time</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <LeaderList entries={allTime} mode="all" />
              </TabsContent>
              <TabsContent value="week">
                <LeaderList entries={weekly} mode="week" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
