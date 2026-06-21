"use client";

import { Flame, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreakBadge({
  streak,
  freezes,
  className,
}: {
  streak: number;
  freezes: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        <Flame className="size-4" />
        {streak}
        <span className="text-[11px] font-medium opacity-70">day streak</span>
      </div>
      <div
        className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
        title={`${freezes} streak freezes remaining this month`}
      >
        <Snowflake className="size-3.5" />
        {freezes}
      </div>
    </div>
  );
}
