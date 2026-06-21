"use client";

import { cn } from "@/lib/utils";

// A small circular progress ring showing today's progress toward the daily XP goal.
export function DailyGoalRing({
  todayXp,
  goalXp,
  size = 56,
  className,
}: {
  todayXp: number;
  goalXp: number;
  size?: number;
  className?: string;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, goalXp > 0 ? (todayXp / goalXp) * 100 : 0);
  const offset = c - (pct / 100) * c;
  const done = todayXp >= goalXp;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={done ? "stroke-amber-500 transition-all duration-700" : "stroke-primary transition-all duration-700"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-xs font-bold leading-none", done && "text-amber-600")}>
          {todayXp}
        </span>
        <span className="text-[8px] text-muted-foreground">/{goalXp}</span>
      </div>
    </div>
  );
}
