"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  BookOpen,
  Filter,
  X,
  Sparkles,
  FileText,
  Quote,
  ShieldCheck,
  Bot,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { apiFetch } from "@/lib/api";
import type { TextUnitDto } from "@/lib/types";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { ArabicText } from "@/components/ilm/arabic-text";
import { GradeBadge } from "@/components/ilm/grade-badge";
import { ReviewGateBadge, MadhabBadge } from "@/components/ilm/review-gate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LibraryFilters {
  books: {
    id: string;
    title: string;
    titleArabic: string | null;
    category: string;
    madhabScope: string;
    totalUnits: number;
    reviewedUnits: number;
  }[];
  topics: string[];
  grades: string[];
}

interface TextUnitDtoResponse {
  units: TextUnitDto[];
}

type AiDraftType = "mcq" | "fill_blank";

interface AiDraftResponse {
  draft: {
    id: string;
    type: string;
    prompt: string;
    payload: string | Record<string, unknown>;
    xpReward: number;
    difficulty: string;
    sourceTextUnitId: string | null;
    status: string;
    aiAssisted: boolean;
  };
  sourceLocator: string;
  sourceGrade: string;
  note: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDraftPayload(
  payload: string | Record<string, unknown> | undefined
): { options?: string[]; correctIndex?: number; accept?: string[] } | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as {
        options?: string[];
        correctIndex?: number;
        accept?: string[];
      };
    } catch {
      return null;
    }
  }
  return payload as {
    options?: string[];
    correctIndex?: number;
    accept?: string[];
  };
}

// ---------------------------------------------------------------------------
// TextUnit card
// ---------------------------------------------------------------------------

function TextUnitCard({
  unit,
  madhab,
  onView,
  onDraft,
}: {
  unit: TextUnitDto;
  madhab: string;
  onView: () => void;
  onDraft: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className="h-full p-4 gap-3 hover:shadow-md hover:border-primary/40 transition-all">
        {/* Top row: book + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold text-foreground">
              {unit.bookTitle}
            </span>
            {unit.bookTitleArabic ? (
              <span className="arabic text-base leading-none text-foreground/80">
                {unit.bookTitleArabic}
              </span>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <MadhabBadge scope={madhab} />
            <GradeBadge grade={unit.authenticityGrade} />
            <ReviewGateBadge reviewed={unit.isReviewed} />
          </div>
        </div>

        <Separator />

        {/* Arabic */}
        <ArabicText className="line-clamp-3 text-lg md:text-xl">
          {unit.arabicText}
        </ArabicText>

        {/* Translation */}
        {unit.translationText ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {unit.translationText}
          </p>
        ) : null}

        {/* Locator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Quote className="size-3.5 shrink-0" />
          <span className="font-mono">{unit.locator}</span>
        </div>

        {/* Tags */}
        {unit.topicTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {unit.topicTags.slice(0, 6).map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="bg-accent/60 text-accent-foreground"
              >
                {t}
              </Badge>
            ))}
            {unit.topicTags.length > 6 ? (
              <Badge variant="outline">+{unit.topicTags.length - 6}</Badge>
            ) : null}
          </div>
        ) : null}

        {/* Footer */}
        <Separator />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <FileText className="size-3.5" />
            View
          </Button>
          {unit.isReviewed ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={onDraft}
              className="ml-auto"
            >
              <Sparkles className="size-3.5" />
              Draft exercise (AI)
            </Button>
          ) : (
            <span className="ml-auto text-[11px] text-muted-foreground">
              AI drafting locked — unreviewed
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function TextUnitSkeleton() {
  return (
    <Card className="h-full p-4 gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Separator />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Separator />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="ml-auto h-8 w-36" />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog
// ---------------------------------------------------------------------------

function UnitDetailDialog({
  unit,
  madhab,
  onClose,
  onDraft,
}: {
  unit: TextUnitDto | null;
  madhab: string;
  onClose: () => void;
  onDraft: (u: TextUnitDto) => void;
}) {
  return (
    <Dialog open={!!unit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto ilm-scroll">
        {unit ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
                <BookOpen className="size-4 text-primary" />
                <span className="truncate">{unit.bookTitle}</span>
                {unit.bookTitleArabic ? (
                  <span className="arabic text-lg leading-none text-foreground/80">
                    {unit.bookTitleArabic}
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-1.5">
                <MadhabBadge scope={madhab} />
                <GradeBadge grade={unit.authenticityGrade} />
                <ReviewGateBadge reviewed={unit.isReviewed} />
                {unit.aiAssisted ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    <Bot className="size-3" />
                    AI-assisted
                  </Badge>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            {/* Locator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Quote className="size-3.5" />
              <span className="font-mono">{unit.locator}</span>
            </div>

            {/* Arabic */}
            <div className="rounded-lg bg-muted/40 p-4">
              <ArabicText className="text-xl md:text-2xl">
                {unit.arabicText}
              </ArabicText>
            </div>

            {/* Translation */}
            {unit.translationText ? (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Translation
                </h4>
                <p className="text-sm leading-relaxed text-foreground">
                  {unit.translationText}
                </p>
              </div>
            ) : null}

            {/* Transliteration */}
            {unit.transliteration ? (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Transliteration
                </h4>
                <p className="text-sm italic leading-relaxed text-muted-foreground">
                  {unit.transliteration}
                </p>
              </div>
            ) : null}

            {/* Chain of narration */}
            {unit.chainOfNarration ? (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Chain of narration
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {unit.chainOfNarration}
                </p>
              </div>
            ) : null}

            <Separator />

            {/* Grade + FULL reference — spec §11 non-negotiable */}
            <Alert className="border-primary/30 bg-primary/5">
              <ShieldCheck className="size-4 text-primary" />
              <AlertTitle className="flex flex-wrap items-center gap-2">
                <span>Authenticity: {unit.authenticityGrade}</span>
                <GradeBadge grade={unit.authenticityGrade} />
              </AlertTitle>
              <AlertDescription>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Grading reference
                </span>
                <span className="block text-sm text-foreground">
                  {unit.gradeReference || "—"}
                </span>
              </AlertDescription>
            </Alert>

            {/* Review metadata */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reviewed at
                </h4>
                <p className="text-sm text-foreground">
                  {unit.reviewedAt
                    ? new Date(unit.reviewedAt).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </h4>
                <p className="text-sm capitalize text-foreground">{unit.status}</p>
              </div>
            </div>

            {unit.reviewNotes ? (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Review notes
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {unit.reviewNotes}
                </p>
              </div>
            ) : null}

            {/* Topic tags */}
            {unit.topicTags.length > 0 ? (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Topic tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {unit.topicTags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="bg-accent/60 text-accent-foreground"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Footer action */}
            {unit.isReviewed ? (
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onDraft(unit);
                    onClose();
                  }}
                >
                  <Sparkles className="size-3.5" />
                  Draft exercise (AI)
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// AI Draft dialog
// ---------------------------------------------------------------------------

function AiDraftDialog({
  unit,
  onClose,
}: {
  unit: TextUnitDto | null;
  onClose: () => void;
}) {
  const [type, setType] = React.useState<AiDraftType>("mcq");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AiDraftResponse | null>(null);

  // Reset internal state whenever a new unit is opened.
  React.useEffect(() => {
    if (unit) {
      setType("mcq");
      setLoading(false);
      setResult(null);
    }
  }, [unit]);

  async function handleGenerate() {
    if (!unit) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch<AiDraftResponse>("/api/ai/draft", {
        method: "POST",
        body: JSON.stringify({ textUnitId: unit.id, type }),
      });
      setResult(res);
      toast.success("Draft generated", {
        description: "Saved as draft — not served to students.",
      });
    } catch (e) {
      toast.error("AI draft failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const payload = parseDraftPayload(result?.draft.payload);

  return (
    <Dialog open={!!unit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto ilm-scroll">
        {unit ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                AI-assisted exercise draft
              </DialogTitle>
              <DialogDescription>
                Grounded generation — strictly based on the reviewed source
                TextUnit. Drafts are saved as{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  status=draft
                </code>{" "}
                and never served to students until a reviewer publishes them.
              </DialogDescription>
            </DialogHeader>

            {/* Source summary */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Quote className="size-3.5" />
                <span className="font-mono">{unit.locator}</span>
              </div>
              <ArabicText className="mt-2 line-clamp-2 text-base md:text-lg">
                {unit.arabicText}
              </ArabicText>
              <div className="mt-2 flex items-center gap-2">
                <GradeBadge grade={unit.authenticityGrade} />
                <span className="text-[11px] text-muted-foreground">
                  {unit.bookTitle}
                </span>
              </div>
            </div>

            {/* Type selector + generate */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Exercise type
                </label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as AiDraftType)}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple choice</SelectItem>
                    <SelectItem value="fill_blank">Fill-in-the-blank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading ? "Generating…" : "Generate draft"}
              </Button>
            </div>

            {/* Result */}
            {result ? (
              <div className="space-y-3">
                <Alert className="border-amber-400/50 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  <ShieldCheck className="size-4" />
                  <AlertTitle className="text-amber-900 dark:text-amber-200">
                    DRAFT — saved as status=draft
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-300/90">
                    {result.note} Source locator:{" "}
                    <code className="rounded bg-amber-100/70 px-1 py-0.5 text-[11px] dark:bg-amber-500/20">
                      {result.sourceLocator}
                    </code>
                    . Grade: {result.sourceGrade}.
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Generated draft
                  </h4>
                  <p className="mb-3 text-sm leading-relaxed text-foreground">
                    {result.draft.prompt}
                  </p>

                  {type === "mcq" && payload?.options ? (
                    <ol className="space-y-1.5">
                      {payload.options.map((opt, i) => (
                        <li
                          key={i}
                          className={cn(
                            "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                            i === payload.correctIndex
                              ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
                              : "bg-muted/40 text-foreground/90"
                          )}
                        >
                          <span className="font-mono text-xs">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span>{opt}</span>
                          {i === payload.correctIndex ? (
                            <Badge
                              variant="outline"
                              className="ml-auto border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                            >
                              correct
                            </Badge>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  {type === "fill_blank" && payload?.accept ? (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Accepted answers
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {payload.accept.map((a, i) => (
                          <Badge key={i} variant="secondary">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {result.draft.type}
                    </Badge>
                    <span>
                      {result.draft.xpReward} XP · {result.draft.difficulty}
                    </span>
                    {result.draft.aiAssisted ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      >
                        <Bot className="size-3" />
                        AI-assisted
                      </Badge>
                    ) : null}
                    <span className="ml-auto font-mono">
                      id: {result.draft.id}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function LibraryView() {
  const role = useStore((s) => s.role);

  // Filter state
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [bookId, setBookId] = React.useState<string>("all");
  const [topic, setTopic] = React.useState<string>("all");
  const [grade, setGrade] = React.useState<string>("all");
  const [pending, setPending] = React.useState(false);

  // Dialog state
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [aiDraftUnitId, setAiDraftUnitId] = React.useState<string | null>(null);

  // Debounce search input (300ms) so typing doesn't hammer the API.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Filters facet fetch (books, topics, grades).
  const { data: filters } = useApi<LibraryFilters>("/api/library/filters");

  // Build the query path from filter state.
  const path = React.useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (bookId && bookId !== "all") params.set("bookId", bookId);
    if (topic && topic !== "all") params.set("topic", topic);
    if (grade && grade !== "all") params.set("grade", grade);
    if (role === "scholar" && pending) params.set("pending", "1");
    const qs = params.toString();
    return `/api/library${qs ? `?${qs}` : ""}`;
  }, [debouncedQ, bookId, topic, grade, pending, role]);

  const { data, loading, error } = useApi<TextUnitDtoResponse>(path);

  const units = data?.units ?? [];

  // Map bookId → madhabScope from filters, fallback "shia".
  const bookMadhabMap = React.useMemo(() => {
    const m = new Map<string, string>();
    filters?.books.forEach((b) => m.set(b.id, b.madhabScope ?? "shia"));
    return m;
  }, [filters]);

  const totalBooks = filters?.books.length ?? 0;
  const totalReviewedUnits =
    filters?.books.reduce((sum, b) => sum + (b.reviewedUnits ?? 0), 0) ?? 0;

  const selectedUnit =
    units.find((u) => u.id === selectedId) ?? null;
  const aiDraftUnit =
    units.find((u) => u.id === aiDraftUnitId) ?? null;

  function handleClear() {
    setQ("");
    setDebouncedQ("");
    setBookId("all");
    setTopic("all");
    setGrade("all");
    setPending(false);
  }

  const hasActiveFilters =
    debouncedQ !== "" ||
    bookId !== "all" ||
    topic !== "all" ||
    grade !== "all" ||
    pending;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      {/* ---------------------------------------------------------------- Header */}
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <BookOpen className="size-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="ilm-gradient-text text-2xl font-bold tracking-tight md:text-3xl">
              Islamic Library Engine
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Every TextUnit is the smallest addressable unit — a hadith, an
              ayah+tafsir paragraph, a sermon segment. Students only see
              scholar-reviewed units.
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="size-3.5" />
              Books
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {totalBooks}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Reviewed units
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {totalReviewedUnits}
            </div>
          </Card>
          <Card className="col-span-2 p-4 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="size-3.5" />
              Current results
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {loading ? "…" : units.length}
            </div>
          </Card>
        </div>
      </header>

      {/* -------------------------------------------------- Search + filter bar */}
      <Card className="sticky top-2 z-20 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Arabic, translation, or locator…"
              className="pl-9"
              aria-label="Search library"
            />
            {q ? (
              <button
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="All books" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All books</SelectItem>
                {filters?.books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                )) ?? null}
              </SelectContent>
            </Select>

            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {filters?.topics.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                )) ?? null}
              </SelectContent>
            </Select>

            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="All grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All grades</SelectItem>
                {filters?.grades.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                )) ?? null}
              </SelectContent>
            </Select>
          </div>

          {/* Clear */}
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="shrink-0"
            >
              <RotateCcw className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>

        {/* Scholar-only pending toggle */}
        {role === "scholar" ? (
          <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch checked={pending} onCheckedChange={setPending} />
              Show pending review
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Filter className="size-3" />
              Includes draft / in-review units
            </span>
            {pending ? (
              <Alert className="sm:ml-auto flex-1 border-amber-400/50 bg-amber-50 py-2 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 sm:max-w-md">
                <ShieldCheck className="size-4" />
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-300/90">
                  Showing unreviewed units — not served to students.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* --------------------------------------------------------------- Results */}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load library</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <TextUnitSkeleton key={i} />
          ))}
        </div>
      ) : units.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center"
        >
          <div className="rounded-full bg-muted p-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No TextUnits found</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try adjusting your search or clearing filters. Only scholar-reviewed
            units appear for students.
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={handleClear} className="mt-4">
              <RotateCcw className="size-3.5" />
              Clear filters
            </Button>
          ) : null}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {units.map((u) => (
              <TextUnitCard
                key={u.id}
                unit={u}
                madhab={bookMadhabMap.get(u.bookId) ?? "shia"}
                onView={() => setSelectedId(u.id)}
                onDraft={() => setAiDraftUnitId(u.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* -------------------------------------------------------- Detail dialog */}
      <UnitDetailDialog
        unit={selectedUnit}
        madhab={
          selectedUnit
            ? bookMadhabMap.get(selectedUnit.bookId) ?? "shia"
            : "shia"
        }
        onClose={() => setSelectedId(null)}
        onDraft={(u) => setAiDraftUnitId(u.id)}
      />

      {/* ---------------------------------------------------- AI draft dialog */}
      <AiDraftDialog unit={aiDraftUnit} onClose={() => setAiDraftUnitId(null)} />
    </div>
  );
}

export default LibraryView;
