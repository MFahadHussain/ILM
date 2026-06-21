"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  StickyNote,
  Trash2,
  Pencil,
  Check,
  X,
  ExternalLink,
  BookOpen,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { NoteDto, BookmarkDto } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ------------------------------------------------------------------
// Unified entry type
// ------------------------------------------------------------------

type UnifiedEntry =
  | { kind: "note"; data: NoteDto }
  | { kind: "bookmark"; data: BookmarkDto };

function entryId(e: UnifiedEntry) {
  return `${e.kind}:${e.data.id}`;
}

function entryBookTitle(e: UnifiedEntry): string | null {
  return e.data.textUnitBookTitle;
}

function entryLessonTitle(e: UnifiedEntry): string | null {
  return e.data.lessonTitle;
}

function entryLocator(e: UnifiedEntry): string | null {
  return e.data.textUnitLocator ?? e.data.lessonTitle;
}

function entrySnippet(e: UnifiedEntry): string | null {
  return e.data.textUnitSnippet;
}

function entryNoteBody(e: UnifiedEntry): string | null {
  if (e.kind === "note") return e.data.body;
  return e.data.note;
}

function entryLessonId(e: UnifiedEntry): string | null {
  return e.data.lessonId;
}

function entryTextUnitId(e: UnifiedEntry): string | null {
  return e.data.textUnitId;
}

function entryTimestamp(e: UnifiedEntry): string {
  const iso =
    e.kind === "note" ? e.data.updatedAt : e.data.createdAt;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function groupKey(e: UnifiedEntry): string {
  const book = entryBookTitle(e);
  if (book) return book;
  if (entryLessonTitle(e)) return "Lessons";
  return "Unsorted";
}

// ------------------------------------------------------------------
// Entry row
// ------------------------------------------------------------------

function EntryRow({ entry }: { entry: UnifiedEntry }) {
  const { openLesson, setView, bumpRefresh } = useStore();
  const isNote = entry.kind === "note";

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(entryNoteBody(entry) ?? "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const locator = entryLocator(entry);
  const snippet = entrySnippet(entry);
  const body = entryNoteBody(entry);
  const lessonId = entryLessonId(entry);
  const textUnitId = entryTextUnitId(entry);

  const startEdit = () => {
    setDraft(body ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(body ?? "");
  };

  const saveEdit = async () => {
    if (!isNote) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Note cannot be empty");
      return;
    }
    if (trimmed === body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/notes/${entry.data.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body: trimmed }),
      });
      toast.success("Note updated");
      setEditing(false);
      bumpRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isNote) {
        await apiFetch(`/api/notes/${entry.data.id}`, { method: "DELETE" });
        toast.success("Note deleted");
      } else {
        await apiFetch(`/api/bookmarks/${entry.data.id}`, { method: "DELETE" });
        toast.success("Bookmark removed");
      }
      bumpRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const jump = () => {
    if (lessonId) {
      openLesson(lessonId);
    } else if (textUnitId) {
      setView("library");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="group relative p-4 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start gap-3">
        {/* kind icon */}
        <div
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
            isNote
              ? "bg-emerald-100 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
          )}
        >
          {isNote ? (
            <StickyNote className="size-3.5" />
          ) : (
            <Bookmark className="size-3.5" />
          )}
        </div>

        {/* body */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* locator + timestamp */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {locator && (
              <code className="font-mono text-[11px] font-medium text-muted-foreground">
                {locator}
              </code>
            )}
            <span className="text-[10px] text-muted-foreground/70">
              · {entryTimestamp(entry)}
            </span>
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] font-medium uppercase tracking-wide"
            >
              {isNote ? "Note" : "Bookmark"}
            </Badge>
          </div>

          {/* snippet */}
          {snippet && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {snippet}
            </p>
          )}

          {/* personal note / edit */}
          {isNote && editing ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Write your note…"
                className="resize-y text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={saving}
                  className="h-7"
                >
                  {saving ? (
                    <>
                      <Check className="size-3.5 animate-pulse" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="h-7"
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : body ? (
            <div className="rounded-md border border-dashed bg-background/60 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <StickyNote className="size-2.5" />
                Your note
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {body}
              </p>
            </div>
          ) : null}

          {/* actions */}
          <div className="flex items-center gap-1 pt-0.5">
            {(lessonId || textUnitId) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={jump}
                className="h-7 gap-1 px-2 text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <ExternalLink className="size-3" />
                {lessonId ? "Jump to lesson" : "Open in Library"}
              </Button>
            )}
            {isNote && !editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={startEdit}
                className="h-7 gap-1 px-2 text-xs"
              >
                <Pencil className="size-3" />
                Edit
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  disabled={deleting}
                >
                  <Trash2 className="size-3" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isNote ? "Delete this note?" : "Remove this bookmark?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isNote
                      ? "This will permanently remove your note. The source TextUnit or lesson will not be affected."
                      : "This will permanently remove the bookmark. You can re-bookmark it later from the Library or lesson."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
                  >
                    {deleting ? "Deleting…" : isNote ? "Delete note" : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Loading skeleton
// ------------------------------------------------------------------

function NotesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, g) => (
        <Card key={g}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border-t pt-3 first:border-t-0 first:pt-0"
              >
                <Skeleton className="size-7 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  const setView = useStore((s) => s.setView);
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs text-muted-foreground">
            Bookmark a TextUnit from the Library or a lesson to save it here.
          </p>
        </div>
        <Button onClick={() => setView("library")} className="gap-2">
          <BookOpen className="size-4" />
          Browse the Library
        </Button>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

type Tab = "all" | "notes" | "bookmarks";

export function NotesView() {
  const {
    data: notesData,
    loading: notesLoading,
    error: notesError,
  } = useApi<{ notes: NoteDto[] }>("/api/notes");
  const {
    data: bmData,
    loading: bmLoading,
    error: bmError,
  } = useApi<{ bookmarks: BookmarkDto[] }>("/api/bookmarks");

  const [tab, setTab] = React.useState<Tab>("all");

  const notes = notesData?.notes ?? [];
  const bookmarks = bmData?.bookmarks ?? [];
  const loading = notesLoading || bmLoading;
  const error = notesError ?? bmError;

  const entries: UnifiedEntry[] = React.useMemo(() => {
    const arr: UnifiedEntry[] = [];
    if (tab === "all" || tab === "notes") {
      for (const n of notes) arr.push({ kind: "note", data: n });
    }
    if (tab === "all" || tab === "bookmarks") {
      for (const b of bookmarks) arr.push({ kind: "bookmark", data: b });
    }
    return arr;
  }, [notes, bookmarks, tab]);

  const groups = React.useMemo(() => {
    const map = new Map<string, UnifiedEntry[]>();
    for (const e of entries) {
      const k = groupKey(e);
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    // Sort groups: "Unsorted" last, otherwise alphabetical.
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Unsorted") return 1;
      if (b[0] === "Unsorted") return -1;
      if (a[0] === "Lessons") return -1;
      if (b[0] === "Lessons") return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [entries]);

  const noteCount = notes.length;
  const bookmarkCount = bookmarks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="ilm-pattern pointer-events-none absolute inset-0 opacity-40" />
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <StickyNote className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-2xl">
              <span className="ilm-gradient-text">Notes &amp; Bookmarks</span>
            </CardTitle>
          </div>
          <CardDescription>
            Your saved TextUnits and personal reflections — grouped by source
            book. Everything is traceable back to its reviewed origin.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <StickyNote className="size-3" />
              {noteCount} note{noteCount === 1 ? "" : "s"}
            </Badge>
            <Badge
              variant="secondary"
              className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            >
              <Bookmark className="size-3" />
              {bookmarkCount} bookmark{bookmarkCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] tabular-nums">
              {noteCount + bookmarkCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes
            <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] tabular-nums">
              {noteCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="bookmarks">
            Bookmarks
            <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] tabular-nums">
              {bookmarkCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Could not load your notes &amp; bookmarks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && <NotesSkeleton />}

      {/* Loaded */}
      {!loading && !error && (
        <>
          {entries.length === 0 ? (
            <EmptyState
              message={
                tab === "notes"
                  ? "No notes yet — write your first reflection from a lesson."
                  : tab === "bookmarks"
                    ? "No bookmarks yet — save TextUnits to revisit them here."
                    : "No notes or bookmarks yet."
              }
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {groups.map(([bookTitle, groupEntries]) => (
                  <motion.div
                    key={bookTitle}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                              <BookOpen className="size-3.5" />
                            </div>
                            <CardTitle className="truncate text-base">
                              {bookTitle}
                            </CardTitle>
                          </div>
                          <Badge
                            variant="outline"
                            className="shrink-0 tabular-nums"
                          >
                            {groupEntries.length} item
                            {groupEntries.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="max-h-96 overflow-y-auto ilm-scroll">
                          {groupEntries.map((e, idx) => (
                            <React.Fragment key={entryId(e)}>
                              {idx > 0 && <Separator />}
                              <EntryRow entry={e} />
                            </React.Fragment>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
