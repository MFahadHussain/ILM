"use client";

import { cn } from "@/lib/utils";

const GRADE_STYLES: Record<string, string> = {
  "Sahih": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30",
  "Authentic": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30",
  "Qur'an (Mutawatir)": "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300 ring-teal-500/30",
  "Hasan": "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300 ring-lime-500/30",
  "Muwaththaq": "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300 ring-lime-500/30",
  "Da'if": "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/30",
  "Tafsir (authoritative commentary)": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30",
  "Attributed (compilation)": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30",
  "Pending review": "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 ring-zinc-400/30",
};

export function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES["Pending review"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        style,
        className
      )}
      title={grade}
    >
      {grade}
    </span>
  );
}
