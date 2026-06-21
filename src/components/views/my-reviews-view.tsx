"use client";

// =============================================================================
// ILM — MyReviewsView (Scholar audit trail)
// Spec §8 "My Reviews" — every TextUnit this scholar has reviewed
// (approved or rejected), surfaced as an accountability audit log.
//
// Reviewer-only. The /api/review/my-reviews endpoint also enforces
// role==='reviewer' server-side, so this UI gate is just polish.
// =============================================================================

import * as React from "react";
import {
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Inbox,
  Bot,
  StickyNote,
  Calendar,
  MapPin,
} from "lucide-react";

import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import type { MyReviewItem } from "@/lib/types";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ArabicText } from "@/components/ilm/arabic-text";
import { GradeBadge } from "@/components/ilm/grade-badge";

// -----------------------------------------------------------------------------
// Status badge — published→emerald "Approved", rejected→rose "Rejected",
// anything else falls back to a neutral slate.
// -----------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        <CheckCircle2 className="size-3" /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
      >
        <XCircle className="size-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 capitalize">
      {status}
    </Badge>
  );
}

// -----------------------------------------------------------------------------
// Date formatter (reviewedAt is an ISO string from the API).
// -----------------------------------------------------------------------------

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// =============================================================================
// Review item card
// =============================================================================

function ReviewItemCard({ item, index }: { item: MyReviewItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
    >
      <Card className="p-4">
        {/* Row 1: book title + status + AI-assisted flag */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">
              {item.bookTitle}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <MapPin className="size-3" />
              {item.locator}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {item.aiAssisted && (
              <Badge
                variant="outline"
                className="gap-1 bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
              >
                <Bot className="size-3" /> AI-assisted
              </Badge>
            )}
            <StatusBadge status={item.status} />
          </div>
        </div>

        <Separator className="my-3" />

        {/* Row 2: Arabic + translation */}
        <ArabicText className="line-clamp-2 text-lg md:text-xl">
          {item.arabicText}
        </ArabicText>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {item.translationSnippet}
        </p>

        {/* Row 3: grade + reviewed-at */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Authenticity
            </span>
            <GradeBadge grade={item.authenticityGrade} />
          </div>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3" />
            Reviewed {formatDate(item.reviewedAt)}
          </span>
        </div>

        {/* Row 4: review notes (if any) */}
        {item.reviewNotes && item.reviewNotes.trim().length > 0 && (
          <div className="mt-3 rounded-md border border-dashed bg-muted/40 px-3 py-2">
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="whitespace-pre-wrap">{item.reviewNotes}</span>
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Stats card
// =============================================================================

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
            tone
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold leading-none tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Empty state
// =============================================================================

function EmptyState() {
  const setView = useStore((s) => s.setView);
  return (
    <Card className="border-dashed p-10 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-6" />
      </div>
      <CardTitle className="mb-1 text-lg">No reviews yet</CardTitle>
      <CardDescription className="mx-auto mb-4 max-w-sm text-sm">
        You haven&apos;t reviewed any content yet. Visit the Review Queue to
        approve pending TextUnits — they will show up here as your audit
        trail.
      </CardDescription>
      <Button onClick={() => setView("review")}>
        Go to Review Queue
      </Button>
    </Card>
  );
}

// =============================================================================
// Access denied
// =============================================================================

function AccessDenied() {
  const setRole = useStore((s) => s.setRole);
  return (
    <Card className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
        <ShieldCheck className="size-6" />
      </div>
      <CardTitle className="mb-1">Scholars only</CardTitle>
      <CardDescription className="mb-4 text-sm">
        The My Reviews audit trail is reserved for reviewers. Switch to the
        scholar role to see your review history.
      </CardDescription>
      <Button onClick={() => setRole("scholar")}>Switch to scholar</Button>
    </Card>
  );
}

// =============================================================================
// Main view
// =============================================================================

type FilterKey = "all" | "approved" | "rejected";

export function MyReviewsView() {
  const role = useStore((s) => s.role);
  const setView = useStore((s) => s.setView);
  const { data, loading, error } = useApi<{ items: MyReviewItem[] }>(
    "/api/review/my-reviews"
  );
  const [filter, setFilter] = React.useState<FilterKey>("all");

  const items = data?.items ?? [];
  const total = items.length;
  const approvedCount = items.filter((i) => i.status === "published").length;
  const rejectedCount = items.filter((i) => i.status === "rejected").length;

  const filtered = React.useMemo(() => {
    if (filter === "approved") {
      return items.filter((i) => i.status === "published");
    }
    if (filter === "rejected") {
      return items.filter((i) => i.status === "rejected");
    }
    return items;
  }, [items, filter]);

  if (role !== "scholar") return <AccessDenied />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="relative overflow-hidden p-6">
        <div
          className="ilm-pattern pointer-events-none absolute inset-0 opacity-60"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <History className="size-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                <span className="ilm-gradient-text">My Reviews</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              A full audit trail of every TextUnit you have reviewed — for
              accountability.
            </p>
          </div>
          <Button variant="outline" onClick={() => setView("review")}>
            Open Review Queue
          </Button>
        </div>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total reviewed"
          value={total}
          tone="bg-primary/10 text-primary ring-primary/30"
          icon={<History className="size-5" />}
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          tone="bg-emerald-100 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          icon={<CheckCircle2 className="size-5" />}
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          tone="bg-rose-100 text-rose-700 ring-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
          icon={<XCircle className="size-5" />}
        />
      </div>

      {/* Filter + list */}
      {loading ? (
        <Card className="p-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Failed to load your review history</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterKey)}
            >
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 px-1 text-[10px]"
                  >
                    {total}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 px-1 text-[10px]"
                  >
                    {approvedCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-4 px-1 text-[10px]"
                  >
                    {rejectedCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-[11px] text-muted-foreground">
              Showing {filtered.length} of {total}
            </span>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto ilm-scroll pr-1">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty-filter"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                    No items match this filter.
                  </div>
                </motion.div>
              ) : (
                filtered.map((item, i) => (
                  <ReviewItemCard
                    key={item.id}
                    item={item}
                    index={i}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </Card>
      )}
    </div>
  );
}
