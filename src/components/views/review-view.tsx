"use client";

// =============================================================================
// ILM — ReviewView (Scholar Review Queue)
// Spec §3.2 (scholar review queue), §6 (AI drafts never bypass review),
// §11 (review gate enforced at the API layer).
//
// Reviewer-only. If the demo role is not "scholar", we render a friendly
// access-denied card (the API also enforces this on every endpoint — UI hiding
// is just polish, the real gate is server-side).
// =============================================================================

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  ScrollText,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  Inbox,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { ReviewQueueItem, ExercisePayload } from "@/lib/types";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { ArabicText } from "@/components/ilm/arabic-text";
import { GradeBadge } from "@/components/ilm/grade-badge";
import { ReviewGateBadge } from "@/components/ilm/review-gate";

// Final-grade options the reviewer may set on a TextUnit before publishing.
const GRADE_OPTIONS = [
  "Sahih",
  "Hasan",
  "Muwaththaq",
  "Da'if",
  "Authentic",
  "Attributed (compilation)",
];

// Locally-augmented draft type (the /api/review/drafts payload mirrors the
// ExercisePayload union; we keep it loosely-typed here and narrow per render).
type DraftExercise = {
  id: string;
  type: string;
  prompt: string;
  payload: ExercisePayload;
  lessonTitle: string | null;
  sourceLocator: string | null;
  sourceBook: string | null;
  sourceGrade: string | null;
  createdAt: string;
};

// =============================================================================
// ReviewUnitCard — one pending TextUnit awaiting scholarly review.
// =============================================================================
function ReviewUnitCard({
  unit,
  onDone,
}: {
  unit: ReviewQueueItem;
  onDone: () => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [grade, setGrade] = React.useState<string>(unit.authenticityGrade);
  const [gradeRef, setGradeRef] = React.useState<string>(unit.gradeReference);
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Reset the local form whenever the underlying unit changes.
  React.useEffect(() => {
    setGrade(unit.authenticityGrade);
    setGradeRef(unit.gradeReference);
    setReviewNotes("");
  }, [unit.id, unit.authenticityGrade, unit.gradeReference]);

  async function approve() {
    setBusy(true);
    try {
      await apiFetch(`/api/review/${unit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "approve",
          grade,
          gradeReference: gradeRef,
          reviewNotes: reviewNotes || undefined,
        }),
      });
      toast.success("Unit published — now served to students", {
        description: `${unit.bookTitle} · ${unit.locator}`,
      });
      setDialogOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await apiFetch(`/api/review/${unit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "reject",
          reviewNotes: reviewNotes || "Rejected by reviewer",
        }),
      });
      toast.success("Unit rejected — kept out of student view", {
        description: `${unit.bookTitle} · ${unit.locator}`,
      });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <span className="text-sm font-semibold">{unit.bookTitle}</span>
          <GradeBadge grade={unit.authenticityGrade} />
          <ReviewGateBadge reviewed={false} />
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
        {unit.chainOfNarration && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Chain:</span>{" "}
            {unit.chainOfNarration}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            Grade reference:
          </span>{" "}
          {unit.gradeReference}
        </p>
        {unit.topicTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {unit.topicTags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Check className="size-4" /> Approve
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve &amp; publish this TextUnit</DialogTitle>
              <DialogDescription>
                Once approved, this unit becomes visible to students and may be
                cited in lessons. This action is recorded in the audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Final authenticity grade
                </Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Grade reference (citation)
                </Label>
                <Input
                  value={gradeRef}
                  onChange={(e) => setGradeRef(e.target.value)}
                  placeholder="e.g. Tustarī, Sahih, §12"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Reviewer notes (optional)
                </Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Any commentary for the audit trail…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                onClick={approve}
                disabled={busy || !grade || !gradeRef.trim()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Publish to students
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="outline"
          onClick={reject}
          disabled={busy}
        >
          <X className="size-4" /> Reject
        </Button>
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// DraftExerciseCard — one AI-assisted draft exercise awaiting publication.
// =============================================================================
function DraftExerciseCard({
  draft,
  onDone,
}: {
  draft: DraftExercise;
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function publish() {
    setBusy(true);
    try {
      await apiFetch(`/api/exercises/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "publish" }),
      });
      toast.success("Exercise published", {
        description: "Now served to students in the lesson.",
      });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await apiFetch(`/api/exercises/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      });
      toast("Kept as draft", {
        description: "Exercise remains unpublished for revision.",
      });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  // Render a read-only preview of the payload, narrowed by shape.
  function renderPayload() {
    const p = draft.payload;
    if ("options" in p && "correctIndex" in p) {
      return (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Options (correct highlighted):
          </p>
          {p.options.map((o, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                i === p.correctIndex
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-border bg-muted/40"
              )}
            >
              {i === p.correctIndex ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <span className="size-4" />
              )}
              <span>{o}</span>
            </div>
          ))}
        </div>
      );
    }
    if ("accept" in p) {
      return (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Accepted answers:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.accept.map((a, i) => (
              <Badge key={i} variant="secondary" className="text-[11px]">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    if ("items" in p && "correctOrder" in p) {
      return (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Correct order:
          </p>
          <ol className="space-y-1 text-sm">
            {p.correctOrder.map((idx, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {i + 1}
                </span>
                {p.items[idx]}
              </li>
            ))}
          </ol>
        </div>
      );
    }
    if ("pairs" in p) {
      return (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Correct pairs:
          </p>
          <div className="space-y-1">
            {p.pairs.map(([l, r], i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm"
              >
                <span className="font-medium">{l}</span>
                <span className="text-muted-foreground">→</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <p className="text-xs text-muted-foreground">Unknown payload shape.</p>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase">
            {draft.type.replace("_", " ")}
          </Badge>
          <Sparkles className="size-3.5 text-amber-600" />
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
            AI-assisted draft
          </span>
          {draft.lessonTitle && (
            <span className="ml-auto text-xs text-muted-foreground">
              For:{" "}
              <span className="font-medium text-foreground">
                {draft.lessonTitle}
              </span>
            </span>
          )}
        </div>
        <CardTitle className="pt-1 text-sm font-semibold leading-relaxed">
          {draft.prompt}
        </CardTitle>
        {(draft.sourceBook || draft.sourceLocator) && (
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Source:</span>
            {draft.sourceBook && <span>{draft.sourceBook}</span>}
            {draft.sourceLocator && (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {draft.sourceLocator}
              </code>
            )}
            {draft.sourceGrade && (
              <GradeBadge grade={draft.sourceGrade} />
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300">
          <Sparkles className="size-4" />
          <AlertTitle className="text-xs font-semibold">
            AI-assisted draft — grounded in the cited source
          </AlertTitle>
          <AlertDescription className="text-xs">
            NOT served to students until published. The scholarly gate applies
            to AI-generated content just as it does to human-authored content.
          </AlertDescription>
        </Alert>
        {renderPayload()}
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" onClick={publish} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Publish
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={reject}
          disabled={busy}
        >
          <X className="size-4" /> Keep as draft
        </Button>
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// EmptyState — friendly empty placeholder.
// =============================================================================
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ReviewSkeleton — shown while the queue is fetching.
// =============================================================================
function ReviewSkeleton() {
  return (
    <div className="grid gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// ReviewView — entry point.
// =============================================================================
export function ReviewView() {
  const role = useStore((s) => s.role);
  const bumpRefresh = useStore((s) => s.bumpRefresh);

  const unitsApi = useApi<{ units: ReviewQueueItem[] }>("/api/review");
  const draftsApi = useApi<{ drafts: DraftExercise[] }>("/api/review/drafts");

  // Gate: scholar-only. (The API also enforces this server-side; this is just
  // a friendly UI hint.)
  if (role !== "scholar") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-7" />
          </div>
          <CardTitle className="text-xl">Scholars only</CardTitle>
          <CardDescription>
            This area is for scholarly reviewers only. Switch to the Scholar
            demo role in the sidebar to explore.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const units = unitsApi.data?.units ?? [];
  const drafts = draftsApi.data?.drafts ?? [];
  const refresh = () => bumpRefresh();

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="ilm-pattern overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            <CardTitle className="text-xl">Scholar Review Queue</CardTitle>
          </div>
          <CardDescription className="pt-1">
            No content reaches a student without{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              is_reviewed=true
            </code>
            . This is the human scholarly gate, enforced at the API layer — not
            just hidden in the UI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <ScrollText className="size-4 text-primary" />
              <span>
                <span className="font-bold">{units.length}</span> TextUnits
                awaiting review
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <Sparkles className="size-4 text-amber-600" />
              <span>
                <span className="font-bold">{drafts.length}</span> AI drafts
                awaiting publication
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {(unitsApi.error || draftsApi.error) && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Couldn&apos;t load the queue</AlertTitle>
          <AlertDescription>{unitsApi.error ?? draftsApi.error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">
            TextUnits (review)
            {units.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {units.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts">
            AI Drafts (publish)
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          {unitsApi.loading ? (
            <ReviewSkeleton />
          ) : units.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-7" />}
              title="Queue is clear"
              description="No TextUnits are awaiting review right now. Every served unit has passed the scholarly gate."
            />
          ) : (
            <div className="grid gap-4">
              {units.map((u) => (
                <ReviewUnitCard key={u.id} unit={u} onDone={refresh} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          {draftsApi.loading ? (
            <ReviewSkeleton />
          ) : drafts.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-7" />}
              title="No AI drafts pending"
              description="There are no AI-assisted draft exercises awaiting publication. Generate new drafts from a lesson to see them here."
            />
          ) : (
            <div className="grid gap-4">
              {drafts.map((d) => (
                <DraftExerciseCard key={d.id} draft={d} onDone={refresh} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
