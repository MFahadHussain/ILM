"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Lock,
  Clock,
  BookOpen,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import type { TrackDto, CourseDto, Difficulty } from "@/lib/types";
import { IlmIcon } from "@/components/ilm/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Color system for tracks / courses. Tracks declare a `color` token
// (emerald | amber | teal). Courses inherit their track's palette via
// `coverColor`. Unknown tokens fall back to emerald (the brand color).
// ------------------------------------------------------------------
const COLOR: Record<
  string,
  { bar: string; ring: string; iconBg: string; iconText: string; softBg: string }
> = {
  emerald: {
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
    iconText: "text-emerald-700 dark:text-emerald-300",
    softBg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  amber: {
    bar: "bg-amber-500",
    ring: "ring-amber-500/30",
    iconBg: "bg-amber-100 dark:bg-amber-500/15",
    iconText: "text-amber-700 dark:text-amber-300",
    softBg: "bg-amber-50 dark:bg-amber-500/10",
  },
  teal: {
    bar: "bg-teal-500",
    ring: "ring-teal-500/30",
    iconBg: "bg-teal-100 dark:bg-teal-500/15",
    iconText: "text-teal-700 dark:text-teal-300",
    softBg: "bg-teal-50 dark:bg-teal-500/10",
  },
};

function colorFor(token?: string | null) {
  return COLOR[token ?? "emerald"] ?? COLOR.emerald;
}

const DIFFICULTY: Record<Difficulty, string> = {
  beginner:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30",
  intermediate:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30",
  advanced:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/30",
  hawza_prep:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 ring-fuchsia-500/30",
};

function MadhabPill({ madhab }: { madhab: string }) {
  const m = (madhab ?? "").toLowerCase();
  const cls =
    m === "shia"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30"
      : m === "sunni"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 ring-sky-500/30"
      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 ring-zinc-400/30";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        cls
      )}
    >
      {madhab || "shared"}
    </span>
  );
}

function CourseCard({ course }: { course: CourseDto }) {
  const setActiveCourseId = useStore((s) => s.setActiveCourseId);
  const setView = useStore((s) => s.setView);
  const c = colorFor(course.coverColor);
  const hasPrereq =
    !!course.prerequisiteIds && course.prerequisiteIds.trim().length > 0;

  function start() {
    // ASSUMPTION (Task 9+11 contract):
    // The LearnView, when given `activeCourseId` without an `activeLessonId`,
    // is responsible for resolving and fetching the course's first lesson.
    // We intentionally do NOT call openLesson() here because TracksView has
    // no course→first-lesson endpoint available; the LearnView agent will
    // handle the resolution.
    setActiveCourseId(course.id);
    setView("learn");
  }

  return (
    <Card className="group relative overflow-hidden p-0 gap-0 transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Tinted top stripe */}
      <div className={cn("h-1.5 w-full", c.bar)} aria-hidden />
      <div className={cn("absolute inset-x-0 top-0 h-16 opacity-40", c.softBg)} aria-hidden />
      <div className="relative space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold leading-tight">{course.title}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {course.trackTitle}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
              DIFFICULTY[course.difficulty]
            )}
          >
            {course.difficulty.replace("_", " ")}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {course.description ?? "No description available."}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3" /> {course.lessonCount} lessons
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="size-3" /> {course.chapterCount} chapters
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {course.estimatedHours}h
          </span>
        </div>

        {hasPrereq && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Lock className="size-3" /> Prerequisite required
              </span>
            </TooltipTrigger>
            <TooltipContent>Complete prerequisite course first</TooltipContent>
          </Tooltip>
        )}

        <Button size="sm" onClick={start} className="w-full">
          Start course
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function TrackSection({ track, index }: { track: TrackDto; index: number }) {
  const c = colorFor(track.color);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="space-y-4"
    >
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              c.iconBg,
              c.ring,
              c.iconText
            )}
          >
            <IlmIcon name={track.icon ?? "BookOpen"} size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
                {track.title}
              </h2>
              <MadhabPill madhab={track.madhabScope} />
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {track.courses.length}{" "}
                {track.courses.length === 1 ? "course" : "courses"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {track.description ?? ""}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {track.courses
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
      </div>
    </motion.section>
  );
}

export function TracksView() {
  const { data, loading, error } = useApi<{ tracks: TrackDto[] }>("/api/tracks");
  const tracks = (data?.tracks ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
          <span className="ilm-gradient-text">Learning Tracks</span>
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Sequential, source-grounded curricula. Shia primary track first; Sunni
          content clearly labelled and never merged.
        </p>
      </header>

      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-4 text-sm text-destructive">
          Failed to load tracks: {error}
        </Card>
      )}

      {!loading && !error && tracks.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <GraduationCap className="mx-auto mb-2 size-8 opacity-50" />
          No tracks available yet.
        </Card>
      )}

      <div className="space-y-8">
        {tracks.map((t, i) => (
          <TrackSection key={t.id} track={t} index={i} />
        ))}
      </div>
    </div>
  );
}
