"use client";

import * as React from "react";
import type { ActivityDay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// GitHub-style contribution heatmap. Intensity by XP earned that day.
export function ActivityHeatmap({
  activity,
  weeks = 17,
  className,
}: {
  activity: ActivityDay[];
  weeks?: number;
  className?: string;
}) {
  const map = React.useMemo(() => {
    const m = new Map<string, ActivityDay>();
    for (const a of activity) m.set(a.dateKey, a);
    return m;
  }, [activity]);

  // build grid: columns = weeks, rows = 7 (Sun..Sat)
  const today = new Date();
  const cells: { dateKey: string; xp: number; exercises: number; lessons: number }[] = [];
  const totalDays = weeks * 7;
  // align so the last cell is today; find the Sunday of the current week
  const todayDay = today.getDay(); // 0=Sun
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (totalDays - 1 - (6 - todayDay)));

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const a = map.get(key);
    cells.push({ dateKey: key, xp: a?.xpGained ?? 0, exercises: a?.exercises ?? 0, lessons: a?.lessons ?? 0 });
  }

  const intensity = (xp: number) => {
    if (xp === 0) return "bg-muted";
    if (xp <= 20) return "bg-emerald-500/30";
    if (xp <= 40) return "bg-emerald-500/50";
    if (xp <= 60) return "bg-emerald-500/70";
    return "bg-emerald-600";
  };

  // month labels
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const firstInCol = cells[w * 7];
    if (!firstInCol) continue;
    const m = new Date(firstInCol.dateKey + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: w, label: new Date(firstInCol.dateKey + "T00:00:00Z").toLocaleString("en", { month: "short" }) });
      lastMonth = m;
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("w-full overflow-x-auto ilm-scroll", className)}>
        <div className="inline-flex flex-col gap-1">
          {/* month labels row */}
          <div className="flex gap-1 pl-7">
            {Array.from({ length: weeks }).map((_, w) => {
              const lbl = monthLabels.find((m) => m.col === w);
              return (
                <div key={w} className="w-3 text-[9px] font-medium text-muted-foreground">
                  {lbl?.label ?? ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {/* weekday labels */}
            <div className="flex w-6 flex-col gap-1">
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <div key={i} className="flex h-3 items-center text-[9px] font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            {/* grid */}
            <div className="flex gap-1">
              {Array.from({ length: weeks }).map((_, w) => (
                <div key={w} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const cell = cells[w * 7 + d];
                    if (!cell) return <div key={d} className="size-3" />;
                    return (
                      <Tooltip key={d}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn("size-3 rounded-sm transition-colors", intensity(cell.xp))}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-semibold">{cell.dateKey}</div>
                          <div className="text-muted-foreground">
                            {cell.xp} XP · {cell.exercises} ex · {cell.lessons} lessons
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* legend */}
          <div className="mt-1 flex items-center justify-end gap-1.5 pl-7">
            <span className="text-[9px] text-muted-foreground">Less</span>
            <div className="size-3 rounded-sm bg-muted" />
            <div className="size-3 rounded-sm bg-emerald-500/30" />
            <div className="size-3 rounded-sm bg-emerald-500/50" />
            <div className="size-3 rounded-sm bg-emerald-500/70" />
            <div className="size-3 rounded-sm bg-emerald-600" />
            <span className="text-[9px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
