"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// Visual indicator of the human-review gate (spec §11 non-negotiable).
export function ReviewGateBadge({
  reviewed,
  className,
}: {
  reviewed: boolean;
  className?: string;
}) {
  if (reviewed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
          className
        )}
        title="Passed scholarly review — served to students"
      >
        <ShieldCheck className="size-3" />
        Reviewed
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        className
      )}
      title="Awaiting scholarly review — NOT served to students"
    >
      <ShieldAlert className="size-3" />
      Awaiting review
    </span>
  );
}

export function MadhabBadge({ scope, className }: { scope: string; className?: string }) {
  const isShia = scope === "shia";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        isShia
          ? "bg-emerald-50 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-teal-50 text-teal-700 ring-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300",
        className
      )}
    >
      {scope}
    </span>
  );
}
