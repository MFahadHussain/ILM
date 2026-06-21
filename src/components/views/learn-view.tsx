"use client";

// =============================================================================
// ILM — LearnView (Lesson Player)
// Spec §4 (every lesson grounded in cited reviewed TextUnits), §5 (XP/levels),
// §6 (interactive exercises with immediate feedback), §11 (review gate).
// =============================================================================
//
// ASSUMPTION (documented in spec): when the user lands on /learn with no
// activeLessonId (e.g. they clicked "Start course" in Tracks which only sets
// activeCourseId), we don't have an endpoint that resolves "first lesson of a
// course" without first hitting /api/tracks (and CourseDto carries no lesson
// ids). To keep this view self-contained and avoid a new endpoint, we render a
// friendly picker that routes the user back to Tracks to choose a lesson. A
// future iteration can have Tracks/Dashboard set activeLessonId directly on
// click.
// =============================================================================

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  BookOpen,
  ScrollText,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Trophy,
  GraduationCap,
  ListChecks,
  Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type {
  LessonDto,
  ExerciseDto,
  ExercisePayload,
  CitedTextUnitDto,
  SubmitAnswerResult,
} from "@/lib/types";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { ArabicText } from "@/components/ilm/arabic-text";
import { GradeBadge } from "@/components/ilm/grade-badge";

// The /api/lessons/[id]/submit response actually returns two extra fields
// beyond the shared SubmitAnswerResult DTO (correctCount, totalExercises).
// We extend locally rather than mutating types.ts.
type SubmitResult = SubmitAnswerResult & {
  correctCount?: number;
  totalExercises?: number;
};

// ---- Type guards for the ExercisePayload discriminated union ----
function isMcqPayload(
  p: ExercisePayload
): p is { options: string[]; correctIndex: number } {
  return "options" in p && "correctIndex" in p;
}
function isFillPayload(p: ExercisePayload): p is { accept: string[] } {
  return "accept" in p;
}
function isOrderingPayload(
  p: ExercisePayload
): p is { items: string[]; correctOrder: number[] } {
  return "items" in p && "correctOrder" in p;
}
function isMatchingPayload(
  p: ExercisePayload
): p is { pairs: [string, string][] } {
  return "pairs" in p;
}

const DIFFICULTY_LABEL: Record<ExerciseDto["difficulty"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  hawza_prep: "Ḥawza Prep",
};

// Render the lesson contentBody: split on blank-line boundaries into
// paragraphs, and convert inline *italics* into <em>.
function renderLessonBody(body: string) {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.map((para, idx) => {
    const parts = para.split(/(\*[^*]+\*)/g);
    return (
      <p key={idx} className="leading-relaxed text-foreground/90">
        {parts.map((part, i) => {
          if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
            return (
              <em key={i} className="font-medium text-foreground italic">
                {part.slice(1, -1)}
              </em>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  });
}

// =============================================================================
// ExerciseCard — one interactive exercise with immediate feedback.
// =============================================================================
function ExerciseCard({
  lessonId,
  exercise,
  index,
  total,
  onLessonCompleted,
}: {
  lessonId: string;
  exercise: ExerciseDto;
  index: number;
  total: number;
  onLessonCompleted: (xp: number) => void;
}) {
  const bumpRefresh = useStore((s) => s.bumpRefresh);

  // Per-exercise local state.
  const [selected, setSelected] = React.useState<string>("");
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<SubmitResult | null>(null);

  // ordering: array of indices into items[] in the user's chosen sequence.
  const [order, setOrder] = React.useState<number[]>(() => {
    if (isOrderingPayload(exercise.payload)) {
      return exercise.payload.items.map((_, i) => i);
    }
    return [];
  });

  // matching: map of leftIndex -> chosen right string.
  const [matches, setMatches] = React.useState<Record<number, string>>(() => {
    if (isMatchingPayload(exercise.payload)) {
      const init: Record<number, string> = {};
      exercise.payload.pairs.forEach((_, i) => {
        init[i] = "";
      });
      return init;
    }
    return {};
  });

  // matching: shuffle the right-side options once per mount (stable).
  const [shuffledRights] = React.useState<string[]>(() => {
    if (isMatchingPayload(exercise.payload)) {
      const arr = exercise.payload.pairs.map((p) => p[1]);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return [];
  });

  async function handleSubmit(answer: string) {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const r = await apiFetch<SubmitResult>(
        `/api/lessons/${lessonId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ exerciseId: exercise.id, answer }),
        }
      );
      setResult(r);
      setSubmitted(true);

      if (r.xpAwarded > 0) {
        toast.success(`+${r.xpAwarded} XP`, {
          description: exercise.prompt.slice(0, 80),
        });
      }
      if (r.leveledUp) {
        toast.success(`Level up! You reached Level ${r.newLevel}`, {
          description: "A new scholastic rank is yours.",
          duration: 6000,
        });
      }
      r.newBadges.forEach((b) => {
        toast.success(`Badge unlocked: ${b.name}`, {
          description: `${b.rarity[0].toUpperCase()}${b.rarity.slice(1)} rarity`,
          duration: 6000,
        });
      });
      if (r.lessonCompleted) onLessonCompleted(r.lessonXpEarned);
      bumpRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Per-type renderers ----------
  function renderMcq() {
    if (!isMcqPayload(exercise.payload)) return null;
    const { options, correctIndex } = exercise.payload;
    return (
      <RadioGroup
        value={selected}
        onValueChange={setSelected}
        disabled={submitted}
        className="gap-2"
      >
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex;
          const isChosenWrong =
            submitted && i === Number(selected) && !isCorrect;
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                isCorrect && submitted && "border-emerald-500/50 bg-emerald-500/10",
                isChosenWrong && "border-rose-500/50 bg-rose-500/10",
                !submitted &&
                  Number(selected) === i &&
                  "border-primary/50 bg-primary/5",
                !submitted &&
                  Number(selected) !== i &&
                  "hover:bg-accent/50"
              )}
            >
              <RadioGroupItem
                value={String(i)}
                id={`${exercise.id}-opt-${i}`}
                className="mt-0.5"
              />
              <Label
                htmlFor={`${exercise.id}-opt-${i}`}
                className="flex-1 cursor-pointer text-sm font-medium leading-relaxed"
              >
                {opt}
              </Label>
              {submitted && isCorrect && (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              )}
              {isChosenWrong && (
                <XCircle className="size-5 shrink-0 text-rose-600" />
              )}
            </div>
          );
        })}
      </RadioGroup>
    );
  }

  function renderFillBlank() {
    if (!isFillPayload(exercise.payload)) return null;
    return (
      <div className="space-y-2">
        <Input
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={submitted}
          placeholder="Type your answer…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && selected.trim() && !submitted) {
              handleSubmit(selected.trim());
            }
          }}
        />
        {submitted && (
          <p className="text-xs text-muted-foreground">
            Accepted answer:{" "}
            <span className="font-semibold text-foreground">
              {exercise.payload.accept.join(" · ")}
            </span>
          </p>
        )}
      </div>
    );
  }

  function renderOrdering() {
    if (!isOrderingPayload(exercise.payload)) return null;
    const { items, correctOrder } = exercise.payload;
    const move = (from: number, to: number) => {
      if (to < 0 || to >= order.length || submitted) return;
      const next = [...order];
      const [v] = next.splice(from, 1);
      next.splice(to, 0, v);
      setOrder(next);
    };
    return (
      <div className="space-y-2">
        {order.map((itemIdx, pos) => {
          const isCorrectPos = submitted && itemIdx === correctOrder[pos];
          const correctItemIdx = submitted ? correctOrder[pos] : null;
          return (
            <div
              key={itemIdx}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                submitted && isCorrectPos && "border-emerald-500/50 bg-emerald-500/10",
                submitted && !isCorrectPos && "border-rose-500/50 bg-rose-500/10"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {pos + 1}
              </span>
              <span className="flex-1 text-sm font-medium">{items[itemIdx]}</span>
              {!submitted && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => move(pos, pos - 1)}
                    disabled={pos === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => move(pos, pos + 1)}
                    disabled={pos === order.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              )}
              {submitted && isCorrectPos && (
                <CheckCircle2 className="size-5 text-emerald-600" />
              )}
              {submitted && !isCorrectPos && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="size-5 text-rose-600" />
                  {correctItemIdx !== null && (
                    <span className="text-xs text-muted-foreground">
                      Should be: {items[correctItemIdx]}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {submitted && (
          <p className="text-xs text-muted-foreground">
            Correct sequence highlighted in green above.
          </p>
        )}
      </div>
    );
  }

  function renderMatching() {
    if (!isMatchingPayload(exercise.payload)) return null;
    const { pairs } = exercise.payload;
    return (
      <div className="space-y-2">
        {pairs.map(([left, correctRight], i) => {
          const chosen = matches[i] ?? "";
          const isCorrect = submitted && chosen === correctRight;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                submitted && isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                submitted && !isCorrect && "border-rose-500/50 bg-rose-500/10"
              )}
            >
              <span className="flex-1 text-sm font-medium">{left}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <Select
                value={chosen}
                onValueChange={(v) =>
                  setMatches((m) => ({ ...m, [i]: v }))
                }
                disabled={submitted}
              >
                <SelectTrigger className="h-9 min-w-[160px] flex-1">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {shuffledRights.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {submitted && isCorrect && (
                <CheckCircle2 className="size-5 text-emerald-600" />
              )}
              {submitted && !isCorrect && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <XCircle className="size-5 text-rose-600" />
                  <span>→ {correctRight}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderShortAnswer() {
    return (
      <div className="space-y-2">
        <Textarea
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={submitted}
          placeholder="Compose your answer…"
          rows={4}
        />
        {submitted && (
          <p className="text-xs text-muted-foreground">
            Submitted for scholarly review. You&apos;ll be notified once
            it&apos;s graded.
          </p>
        )}
      </div>
    );
  }

  function renderInteraction() {
    switch (exercise.type) {
      case "mcq":
        return renderMcq();
      case "fill_blank":
        return renderFillBlank();
      case "ordering":
        return renderOrdering();
      case "matching":
        return renderMatching();
      case "short_answer":
        return renderShortAnswer();
      default:
        return null;
    }
  }

  function buildAnswer(): string {
    switch (exercise.type) {
      case "mcq":
        return selected;
      case "fill_blank":
        return selected.trim();
      case "ordering":
        return JSON.stringify(order);
      case "matching":
        if (!isMatchingPayload(exercise.payload)) return "";
        return JSON.stringify(
          exercise.payload.pairs.map(
            ([l], i) => [l, matches[i] ?? ""] as [string, string]
          )
        );
      case "short_answer":
        return selected;
      default:
        return "";
    }
  }

  function canSubmit(): boolean {
    if (submitted || submitting) return false;
    switch (exercise.type) {
      case "mcq":
        return selected !== "";
      case "fill_blank":
        return selected.trim().length > 0;
      case "ordering":
        return order.length > 0;
      case "matching":
        return Object.values(matches).every((v) => v && v.length > 0);
      case "short_answer":
        return selected.trim().length > 0;
      default:
        return false;
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {index + 1}
          </span>
          <span>
            Question {index + 1} of {total}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {exercise.type.replace("_", " ")}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {DIFFICULTY_LABEL[exercise.difficulty]}
          </Badge>
          <span className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Sparkles className="size-3.5" />
            <span className="font-semibold">{exercise.xpReward} XP</span>
          </span>
        </div>
        <CardTitle className="pt-1 text-base font-semibold leading-relaxed">
          {exercise.prompt}
        </CardTitle>
        {exercise.aiAssisted && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="size-3" /> AI-assisted, grounded in a reviewed
            source.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {renderInteraction()}

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  result.isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                )}
              >
                {result.isCorrect ? (
                  <CheckCircle2 className="size-5 shrink-0" />
                ) : (
                  <XCircle className="size-5 shrink-0" />
                )}
                <div className="flex-1 text-sm">
                  <span className="font-semibold">
                    {result.isCorrect ? "Correct!" : "Not quite."}
                  </span>
                  {result.xpAwarded > 0 && (
                    <span className="ml-2 font-mono text-xs">
                      +{result.xpAwarded} XP
                    </span>
                  )}
                  {result.isCorrect &&
                    result.correctCount !== undefined &&
                    result.totalExercises !== undefined && (
                      <span className="ml-2 text-xs opacity-80">
                        ({result.correctCount}/{result.totalExercises} lesson
                        exercises correct)
                      </span>
                    )}
                </div>
                {submitted && (
                  <Badge variant="outline" className="text-[10px]">
                    Answered
                  </Badge>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      <CardFooter className="pt-0">
        {!submitted && (
          <Button
            onClick={() => handleSubmit(buildAnswer())}
            disabled={!canSubmit()}
            className="ml-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Checking…
              </>
            ) : (
              <>
                Check answer <ChevronRight className="size-4" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// CitedUnitCard — a primary source this lesson is grounded in.
// =============================================================================
function CitedUnitCard({ unit }: { unit: CitedTextUnitDto }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <span className="text-sm font-semibold">{unit.bookTitle}</span>
          <GradeBadge grade={unit.authenticityGrade} />
          <code className="ml-auto rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {unit.locator}
          </code>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ArabicText>{unit.arabicText}</ArabicText>
        <p className="text-sm leading-relaxed text-foreground/90">
          {unit.translationText}
        </p>
        {unit.transliteration && (
          <p className="text-xs italic text-muted-foreground">
            <span className="not-italic font-semibold">Transliteration:</span>{" "}
            {unit.transliteration}
          </p>
        )}
        <div className="rounded-md border-l-2 border-amber-500/50 bg-amber-500/5 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              Grade reference:
            </span>{" "}
            {unit.gradeReference}
          </p>
        </div>
        {unit.contextNote && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                Why cited here:
              </span>{" "}
              {unit.contextNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// LessonSidebar — the course's lesson list grouped by chapter (desktop only).
// =============================================================================
type SiblingLesson = {
  id: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  order: number;
  estimatedMin: number;
};

function LessonSidebar({
  lessons,
  currentLessonId,
  onPick,
}: {
  lessons: SiblingLesson[];
  currentLessonId: string;
  onPick: (id: string) => void;
}) {
  const groups: { chapterTitle: string; lessons: SiblingLesson[] }[] = [];
  for (const l of lessons) {
    let g = groups.find((x) => x.chapterTitle === l.chapterTitle);
    if (!g) {
      g = { chapterTitle: l.chapterTitle, lessons: [] };
      groups.push(g);
    }
    g.lessons.push(l);
  }
  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ListChecks className="size-4 text-primary" />
          Course lessons
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[70vh] px-4 pb-4">
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.chapterTitle}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {g.chapterTitle}
                </p>
                <div className="space-y-1">
                  {g.lessons.map((l) => {
                    const active = l.id === currentLessonId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => onPick(l.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-accent text-foreground/90"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            active
                              ? "bg-primary-foreground/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {l.order}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {l.title}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px]",
                            active
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          <Clock className="size-3" />
                          {l.estimatedMin}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// LessonCompleteCard — celebratory banner shown when the last exercise is
// answered correctly and the lesson is marked complete (spec §5).
// =============================================================================
function LessonCompleteCard({ xp }: { xp: number }) {
  const sparks = React.useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        x: (Math.random() - 0.5) * 360,
        y: (Math.random() - 0.5) * 220,
        delay: 0.15 + Math.random() * 0.5,
        color:
          Math.random() > 0.5
            ? "bg-amber-400"
            : Math.random() > 0.5
              ? "bg-emerald-400"
              : "bg-yellow-300",
      })),
    []
  );
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      <Card className="relative overflow-hidden border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-amber-500/10">
        <CardContent className="relative flex flex-col items-center gap-3 py-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 text-white shadow-lg"
          >
            <Trophy className="size-8" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold">Lesson complete!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You earned a{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{xp} XP
              </span>{" "}
              completion bonus.
            </p>
          </div>
          {/* Confetti-ish sparks */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            {sparks.map((s, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: s.x,
                  y: s.y,
                }}
                transition={{ duration: 1.6, delay: s.delay, repeat: 1 }}
                className={cn(
                  "absolute left-1/2 top-1/3 size-1.5 rounded-full",
                  s.color
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// LessonPlayer — main two-column layout (active lesson known).
// =============================================================================
function LessonPlayer({
  lessonId,
  onPickLesson,
}: {
  lessonId: string;
  onPickLesson: (id: string) => void;
}) {
  const { data, error, loading } = useApi<{
    lesson: LessonDto;
    course: {
      id: string;
      title: string;
      trackTitle: string;
      difficulty: string;
    };
    lessons: SiblingLesson[];
  }>(`/api/lessons/${lessonId}`);

  const [completionXp, setCompletionXp] = React.useState<number | null>(null);
  // Reset completion banner whenever the lesson changes.
  React.useEffect(() => {
    setCompletionXp(null);
  }, [lessonId]);

  if (loading) return <LessonSkeleton />;
  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="size-4" />
        <AlertTitle>Couldn&apos;t load this lesson</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!data) return null;

  const { lesson, course, lessons } = data;
  const currentIdx = lessons.findIndex((l) => l.id === lesson.id);
  const prev = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < lessons.length - 1
      ? lessons[currentIdx + 1]
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main column */}
      <div className="min-w-0 space-y-6">
        {/* Lesson header */}
        <Card className="ilm-pattern overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">{lesson.trackTitle}</span>
              <ChevronRight className="size-3" />
              <span className="font-medium">{lesson.courseTitle}</span>
            </div>
            <CardTitle className="pt-1 text-2xl font-bold tracking-tight md:text-3xl">
              {lesson.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {lesson.estimatedMin} min
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <ScrollText className="size-3.5" />
                Cites {lesson.citedUnits.length} reviewed{" "}
                {lesson.citedUnits.length === 1 ? "source" : "sources"}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <Badge variant="outline" className="capitalize">
                {course.difficulty}
              </Badge>
            </CardDescription>
          </CardHeader>
          {lesson.summary && (
            <CardContent className="pt-0">
              <p className="text-sm italic text-muted-foreground">
                {lesson.summary}
              </p>
            </CardContent>
          )}
        </Card>

        {/* Lesson content body */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="size-5 text-primary" /> Lesson
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[15px]">
            {renderLessonBody(lesson.contentBody)}
          </CardContent>
        </Card>

        {/* Cited TextUnits */}
        {lesson.citedUnits.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ScrollText className="size-5 text-primary" />
              <h2 className="text-lg font-bold">Primary sources cited</h2>
              <Badge variant="secondary" className="text-[10px]">
                {lesson.citedUnits.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {lesson.citedUnits.map((u) => (
                <CitedUnitCard key={u.id} unit={u} />
              ))}
            </div>
          </section>
        )}

        {/* Exercises */}
        {lesson.exercises.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ListChecks className="size-5 text-primary" />
              <h2 className="text-lg font-bold">Check your understanding</h2>
              <Badge variant="secondary" className="text-[10px]">
                {lesson.exercises.length}{" "}
                {lesson.exercises.length === 1 ? "question" : "questions"}
              </Badge>
            </div>
            {completionXp !== null && <LessonCompleteCard xp={completionXp} />}
            <div className="grid gap-4">
              {lesson.exercises.map((ex, i) => (
                <ExerciseCard
                  key={ex.id}
                  lessonId={lesson.id}
                  exercise={ex}
                  index={i}
                  total={lesson.exercises.length}
                  onLessonCompleted={(xp) => setCompletionXp(xp)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Nav footer */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => prev && onPickLesson(prev.id)}
            disabled={!prev}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentIdx + 1} / {lessons.length}
          </span>
          <Button
            onClick={() => next && onPickLesson(next.id)}
            disabled={!next}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Right sidebar (desktop only) */}
      <aside className="hidden lg:block">
        <LessonSidebar
          lessons={lessons}
          currentLessonId={lesson.id}
          onPick={onPickLesson}
        />
      </aside>
    </div>
  );
}

// =============================================================================
// LessonSkeleton — shown while the lesson is fetching.
// =============================================================================
function LessonSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// LearnView — entry point. Picks the active lesson from the store, or shows a
// friendly picker fallback.
// =============================================================================
export function LearnView() {
  const activeLessonId = useStore((s) => s.activeLessonId);
  const activeCourseId = useStore((s) => s.activeCourseId);
  const setView = useStore((s) => s.setView);
  const openLesson = useStore((s) => s.openLesson);

  if (!activeLessonId) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="size-7" />
          </div>
          <CardTitle className="text-xl">Select a lesson to begin</CardTitle>
          <CardDescription>
            {activeCourseId
              ? "Choose a lesson from the course you started."
              : "Browse the tracks to find a course, then open any lesson."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => setView("tracks")}>
            Browse tracks <ChevronRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <LessonPlayer
      key={activeLessonId}
      lessonId={activeLessonId}
      onPickLesson={openLesson}
    />
  );
}
