"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LevelInfo } from "@/lib/types";

export function XpBar({
  levelInfo,
  xp,
  className,
}: {
  levelInfo: LevelInfo;
  xp: number;
  className?: string;
}) {
  const toNext = levelInfo.nextXp ? levelInfo.nextXp - xp : 0;
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-primary">
          {levelInfo.title} · {levelInfo.titleArabic}
        </span>
        {levelInfo.nextXp ? (
          <span className="text-muted-foreground">{toNext} XP to next</span>
        ) : (
          <span className="text-muted-foreground">Max rank</span>
        )}
      </div>
      <Progress value={levelInfo.progress} className="h-2" />
    </div>
  );
}
