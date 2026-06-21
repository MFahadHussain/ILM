"use client";

import * as React from "react";
import { Quote, BookOpen, ChevronRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ArabicText } from "./arabic-text";
import { GradeBadge } from "./grade-badge";
import type { CitedTextUnitDto } from "@/lib/types";
import { cn } from "@/lib/utils";

// A thin persistent citation strip shown under the lesson title.
// Tapping a citation opens the full TextUnit in a modal (spec §6 trust layer).
export function CitationStrip({
  citedUnits,
  className,
}: {
  citedUnits: CitedTextUnitDto[];
  className?: string;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const active = citedUnits.find((c) => c.id === openId) ?? null;

  if (citedUnits.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2",
          className
        )}
      >
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Quote className="size-3.5" />
          Sources
        </span>
        {citedUnits.map((u) => (
          <button
            key={u.id}
            onClick={() => setOpenId(u.id)}
            className="group flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-border transition hover:ring-primary/50 hover:bg-accent"
          >
            <BookOpen className="size-3 text-primary" />
            <span className="max-w-[200px] truncate">{u.bookTitle}</span>
            <span className="text-muted-foreground">·</span>
            <span className="truncate font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
              {u.locator}
            </span>
            <ChevronRight className="size-3 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-primary" />
              {active?.bookTitle}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {active?.locator}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Authenticity
                  </span>
                  <GradeBadge grade={active.authenticityGrade} />
                </div>
                <ArabicText>{active.arabicText}</ArabicText>
              </div>
              <div>
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Translation
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {active.translationText}
                </p>
              </div>
              {active.transliteration && (
                <div>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Transliteration
                  </span>
                  <p className="text-sm italic text-muted-foreground">
                    {active.transliteration}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-amber-500/20 bg-amber-50 p-3 dark:bg-amber-500/10">
                <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Grade Reference
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  {active.gradeReference}
                </p>
              </div>
              {active.contextNote && (
                <div className="rounded-lg bg-muted/60 p-3">
                  <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Why cited here
                  </span>
                  <p className="text-xs text-muted-foreground">{active.contextNote}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
