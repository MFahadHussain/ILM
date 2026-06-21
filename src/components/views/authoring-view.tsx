"use client";

// =============================================================================
// ILM — AuthoringView (Scholar Content Authoring)
// Spec §8 "Content Authoring" — Phase 2 tool for building/editing the
// curriculum tree: Track → Course → Chapter → Lesson → Exercise, citing
// already-reviewed TextUnits.
//
// Reviewer-only. The /api/authoring/* endpoints also enforce role==='reviewer'
// server-side, so this UI gate is just polish — the real gate is API-level.
// =============================================================================

import * as React from "react";
import {
  PenSquare,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Loader2,
  AlertTriangle,
  FolderTree,
  BookOpen,
  Layers,
  FileText,
  ListChecks,
  Save,
  ShieldAlert,
  Sparkles,
  Quote,
  Inbox,
} from "lucide-react";

import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import type { AuthoringNode, TextUnitDto, Difficulty } from "@/lib/types";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MADHAB_OPTIONS = ["shia", "sunni"] as const;
const DIFFICULTY_OPTIONS: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
  "hawza_prep",
];
const EXERCISE_TYPES = ["mcq", "fill_blank", "ordering", "matching"] as const;
const TRACK_COLORS = ["emerald", "amber", "teal", "rose", "fuchsia", "sky"];
const TRACK_ICONS = [
  "BookOpen",
  "GraduationCap",
  "ScrollText",
  "Compass",
  "Star",
  "Sparkles",
];

const DIFFICULTY_PILL: Record<Difficulty, string> = {
  beginner:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30",
  intermediate:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/30",
  advanced:
    "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/30",
  hawza_prep:
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 ring-fuchsia-500/30",
};

// -----------------------------------------------------------------------------
// Small inline helpers (MadhabBadge is not present in the shared ilm folder
// at this time, so we render a small pill locally to avoid breaking imports).
// -----------------------------------------------------------------------------

function MadhabPill({ madhab }: { madhab?: string }) {
  const m = (madhab ?? "").toLowerCase();
  const cls =
    m === "shia"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/30"
      : m === "sunni"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 ring-sky-500/30"
      : "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300 ring-zinc-400/30";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        cls
      )}
    >
      {madhab || "shared"}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Recursive tree lookup
// -----------------------------------------------------------------------------

function findNode(
  tree: AuthoringNode[],
  id: string | null
): AuthoringNode | null {
  if (!id) return null;
  for (const t of tree) {
    if (t.id === id) return t;
    if (t.children) {
      const f = findNode(t.children, id);
      if (f) return f;
    }
  }
  return null;
}

function nodePath(tree: AuthoringNode[], id: string): string[] {
  const path: string[] = [];
  const walk = (nodes: AuthoringNode[]): boolean => {
    for (const n of nodes) {
      path.push(n.title);
      if (n.id === id) return true;
      if (n.children && walk(n.children)) return true;
      path.pop();
    }
    return false;
  };
  walk(tree);
  return path;
}

// =============================================================================
// Access denied
// =============================================================================

function AccessDenied() {
  const setRole = useStore((s) => s.setRole);
  return (
    <Card className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
        <ShieldAlert className="size-6" />
      </div>
      <CardTitle className="mb-1">Scholars only</CardTitle>
      <CardDescription className="mb-4 text-sm">
        The Content Authoring tool is reserved for reviewers. Switch to the
        scholar role to manage the curriculum tree.
      </CardDescription>
      <Button onClick={() => setRole("scholar")}>Switch to scholar</Button>
    </Card>
  );
}

// =============================================================================
// Tree row (recursive: track → course → chapter → lesson)
// =============================================================================

function NodeIcon({ type }: { type: AuthoringNode["type"] }) {
  if (type === "track") return <FolderTree className="size-4 text-emerald-600 dark:text-emerald-400" />;
  if (type === "course") return <BookOpen className="size-4 text-amber-600 dark:text-amber-400" />;
  if (type === "chapter") return <Layers className="size-4 text-teal-600 dark:text-teal-400" />;
  return <FileText className="size-4 text-foreground/70" />;
}

function NodeBadges({ node }: { node: AuthoringNode }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {typeof node.lessonCount === "number" && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {node.lessonCount} lessons
        </Badge>
      )}
      {typeof node.citedUnitCount === "number" && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          <Quote className="size-3 mr-0.5" />
          {node.citedUnitCount}
        </Badge>
      )}
      {typeof node.exerciseCount === "number" && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          <ListChecks className="size-3 mr-0.5" />
          {node.exerciseCount}
        </Badge>
      )}
      {node.difficulty && (
        <Badge
          variant="outline"
          className={cn(
            "h-5 px-1.5 text-[10px] capitalize ring-1 ring-inset",
            DIFFICULTY_PILL[node.difficulty as Difficulty] ??
              "ring-border"
          )}
        >
          {node.difficulty.replace("_", " ")}
        </Badge>
      )}
    </span>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: AuthoringNode;
  depth: number;
  selectedId: string | null;
  onSelect: (n: AuthoringNode) => void;
}) {
  const hasChildren = !!node.children && node.children.length > 0;
  const [open, setOpen] = React.useState(depth === 0);
  const isSelected = selectedId === node.id;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md px-1.5 py-1.5 transition-colors",
          isSelected
            ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
            : "hover:bg-muted/60"
        )}
        style={{ paddingLeft: depth * 12 + 6 }}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted",
              !hasChildren && "invisible"
            )}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        </CollapsibleTrigger>

        <button
          type="button"
          onClick={() => onSelect(node)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <NodeIcon type={node.type} />
          <span
            className={cn(
              "truncate text-sm",
              node.type === "track" && "font-semibold",
              node.type === "lesson" && "text-muted-foreground"
            )}
          >
            {node.title}
          </span>
          {node.type === "track" && node.madhabScope && (
            <MadhabPill madhab={node.madhabScope} />
          )}
        </button>

        <NodeBadges node={node} />
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <div className="mt-0.5 space-y-0.5">
            {node.children!.map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

// =============================================================================
// Tree panel (left)
// =============================================================================

function TreePanel({
  tree,
  selectedId,
  onSelect,
}: {
  tree: AuthoringNode[];
  selectedId: string | null;
  onSelect: (n: AuthoringNode) => void;
}) {
  const trackCount = tree.length;
  const courseCount = tree.reduce(
    (n, t) => n + (t.children?.length ?? 0),
    0
  );
  return (
    <Card className="p-0 gap-0 lg:sticky lg:top-4">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="size-4 text-emerald-600 dark:text-emerald-400" />
            Curriculum Tree
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {trackCount} tracks · {courseCount} courses
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Click any node to edit it. Expand the chevrons to drill into
          courses → chapters → lessons.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <div className="max-h-[70vh] overflow-y-auto ilm-scroll pr-1">
          {tree.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto mb-2 size-6 opacity-50" />
              No tracks yet. Use the panel on the right to create one.
            </div>
          ) : (
            tree.map((t) => (
              <TreeRow
                key={t.id}
                node={t}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Right panel — Create new track form (default)
// =============================================================================

function CreateTrackCard({ onDone }: { onDone: () => void }) {
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  const [title, setTitle] = React.useState("");
  const [madhabScope, setMadhabScope] = React.useState<string>("shia");
  const [description, setDescription] = React.useState("");
  const [icon, setIcon] = React.useState<string>("BookOpen");
  const [color, setColor] = React.useState<string>("emerald");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/authoring/tracks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          madhabScope,
          description: description.trim() || undefined,
          icon,
          color,
        }),
      });
      toast.success("Track created.");
      bumpRefresh();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create track.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="size-5 text-emerald-600 dark:text-emerald-400" />
          Create a new track
        </CardTitle>
        <CardDescription>
          A track is the top-level container (e.g. “Foundations of ʿAqīdah”).
          Add courses, chapters, and lessons underneath it next.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nt-title">Title</Label>
          <Input
            id="nt-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fiqh of Purification"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Madhab scope</Label>
            <Select value={madhabScope} onValueChange={setMadhabScope}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MADHAB_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Accent color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACK_COLORS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACK_ICONS.map((ic) => (
                <SelectItem key={ic} value={ic}>
                  {ic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nt-desc">Description</Label>
          <Textarea
            id="nt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short summary of what learners will gain from this track."
            rows={3}
          />
        </div>
      </CardContent>
      <CardFooter className="p-0 mt-4 justify-end gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Create track
        </Button>
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// Track detail panel — inline edit + add course + delete
// =============================================================================

function TrackDetailCard({ node }: { node: AuthoringNode }) {
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  const [title, setTitle] = React.useState(node.title);
  const [madhabScope, setMadhabScope] = React.useState(
    node.madhabScope ?? "shia"
  );
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [addCourseOpen, setAddCourseOpen] = React.useState(false);

  // course form state
  const [cTitle, setCTitle] = React.useState("");
  const [cDifficulty, setCDifficulty] = React.useState<Difficulty>("beginner");
  const [cDesc, setCDesc] = React.useState("");
  const [cBusy, setCBusy] = React.useState(false);

  // Keep form in sync when a different track is selected.
  React.useEffect(() => {
    setTitle(node.title);
    setMadhabScope(node.madhabScope ?? "shia");
    setDescription("");
    setCTitle("");
    setCDifficulty("beginner");
    setCDesc("");
  }, [node.id]);

  async function save() {
    if (!title.trim()) {
      toast.error("Title cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/authoring/tracks/${node.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          madhabScope,
          description: description.trim() || undefined,
        }),
      });
      toast.success("Track updated.");
      bumpRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update track.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await apiFetch(`/api/authoring/tracks/${node.id}`, {
        method: "DELETE",
      });
      toast.success("Track deleted.");
      bumpRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete track.");
    } finally {
      setDeleting(false);
    }
  }

  async function addCourse() {
    if (!cTitle.trim()) {
      toast.error("Course title is required.");
      return;
    }
    setCBusy(true);
    try {
      await apiFetch("/api/authoring/courses", {
        method: "POST",
        body: JSON.stringify({
          trackId: node.id,
          title: cTitle.trim(),
          difficulty: cDifficulty,
          description: cDesc.trim() || undefined,
        }),
      });
      toast.success("Course added.");
      bumpRefresh();
      setAddCourseOpen(false);
      setCTitle("");
      setCDesc("");
      setCDifficulty("beginner");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add course.");
    } finally {
      setCBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FolderTree className="size-3.5" /> Track
            </div>
            <CardTitle className="text-lg">{node.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <MadhabPill madhab={node.madhabScope} />
              <span>{node.children?.length ?? 0} courses</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" /> Add course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a course to “{node.title}”</DialogTitle>
                  <DialogDescription>
                    Courses group related chapters and lessons under a
                    shared difficulty.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label>Course title</Label>
                    <Input
                      value={cTitle}
                      onChange={(e) => setCTitle(e.target.value)}
                      placeholder="e.g. Wudūʾ — Ritual Ablution"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={cDifficulty}
                      onValueChange={(v) =>
                        setCDifficulty(v as Difficulty)
                      }
                    >
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d} className="capitalize">
                            {d.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={cDesc}
                      onChange={(e) => setCDesc(e.target.value)}
                      rows={3}
                      placeholder="What will learners take away from this course?"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddCourseOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={addCourse} disabled={cBusy}>
                    {cBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Add course
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this track?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes “{node.title}” and all courses,
                    chapters, and lessons beneath it. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={remove}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <Separator className="my-4" />

      <CardContent className="p-0 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="t-title">Title</Label>
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Madhab scope</Label>
          <Select value={madhabScope} onValueChange={setMadhabScope}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MADHAB_OPTIONS.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-desc">Description</Label>
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Update the description (leave blank to keep)."
          />
        </div>
      </CardContent>
      <CardFooter className="p-0 mt-4 justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// Course detail panel — add chapter
// =============================================================================

function CourseDetailCard({ node }: { node: AuthoringNode }) {
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setTitle("");
  }, [node.id]);

  async function addChapter() {
    if (!title.trim()) {
      toast.error("Chapter title is required.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/authoring/chapters", {
        method: "POST",
        body: JSON.stringify({
          courseId: node.id,
          title: title.trim(),
        }),
      });
      toast.success("Chapter added.");
      bumpRefresh();
      setOpen(false);
      setTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add chapter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="size-3.5" /> Course
            </div>
            <CardTitle className="text-lg">{node.title}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
              {node.difficulty && (
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize ring-1 ring-inset",
                    DIFFICULTY_PILL[node.difficulty as Difficulty] ??
                      "ring-border"
                  )}
                >
                  {node.difficulty.replace("_", " ")}
                </Badge>
              )}
              <span>{node.children?.length ?? 0} chapters</span>
              {typeof node.lessonCount === "number" && (
                <span>· {node.lessonCount} lessons total</span>
              )}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add chapter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a chapter to “{node.title}”</DialogTitle>
                <DialogDescription>
                  Chapters group lessons inside a course.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-2">
                <Label>Chapter title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Obligations of Wudūʾ"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addChapter} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Add chapter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {node.children && node.children.length > 0 ? (
          <ul className="space-y-1.5">
            {node.children.map((ch) => (
              <li
                key={ch.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <Layers className="size-3.5 text-teal-600 dark:text-teal-400" />
                <span className="font-medium">{ch.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {ch.children?.length ?? 0} lessons
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No chapters yet. Click “Add chapter” to start.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Chapter detail panel — add lesson (with cited TextUnit multi-select)
// =============================================================================

function ChapterDetailCard({ node }: { node: AuthoringNode }) {
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  const [open, setOpen] = React.useState(false);
  // Scholar-only view; /api/library returns reviewed units by default.
  const { data: libData } = useApi<{ units: TextUnitDto[] }>("/api/library");
  const reviewedUnits = libData?.units ?? [];

  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [contentBody, setContentBody] = React.useState("");
  const [estimatedMin, setEstimatedMin] = React.useState(10);
  const [citedIds, setCitedIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setTitle("");
    setSummary("");
    setContentBody("");
    setEstimatedMin(10);
    setCitedIds([]);
  }, [node.id]);

  function toggleCited(id: string) {
    setCitedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function addLesson() {
    if (!title.trim()) {
      toast.error("Lesson title is required.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/authoring/lessons", {
        method: "POST",
        body: JSON.stringify({
          chapterId: node.id,
          title: title.trim(),
          contentBody: contentBody.trim() || undefined,
          summary: summary.trim() || undefined,
          estimatedMin,
          citedTextUnitIds: citedIds.length > 0 ? citedIds : undefined,
        }),
      });
      toast.success(
        `Lesson added${citedIds.length > 0 ? ` · citing ${citedIds.length} reviewed source(s)` : ""}.`
      );
      bumpRefresh();
      setOpen(false);
      setTitle("");
      setSummary("");
      setContentBody("");
      setEstimatedMin(10);
      setCitedIds([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add lesson.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="size-3.5" /> Chapter
            </div>
            <CardTitle className="text-lg">{node.title}</CardTitle>
            <CardDescription className="mt-1">
              {node.children?.length ?? 0} lessons
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add a lesson to “{node.title}”</DialogTitle>
                <DialogDescription>
                  Lessons are the primary learning unit. You can cite any
                  reviewed TextUnit from the library to ground the lesson in
                  the source tradition (spec §4).
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto ilm-scroll pr-1">
                <div className="space-y-1.5">
                  <Label>Lesson title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Sunan of Wudūʾ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Estimated minutes</Label>
                    <Input
                      type="number"
                      min={1}
                      value={estimatedMin}
                      onChange={(e) =>
                        setEstimatedMin(
                          Math.max(1, parseInt(e.target.value || "10", 10))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5 self-end">
                    <Badge variant="secondary" className="h-5 text-[11px]">
                      <Quote className="size-3 mr-0.5" />
                      {citedIds.length} cited source(s)
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Short summary</Label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={2}
                    placeholder="One or two sentences describing what this lesson covers."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lesson body</Label>
                  <Textarea
                    value={contentBody}
                    onChange={(e) => setContentBody(e.target.value)}
                    rows={6}
                    placeholder="The lesson prose. Use blank lines to separate paragraphs."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tip: paragraphs are split on double newlines.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Cite reviewed TextUnits</Label>
                  <div className="max-h-64 overflow-y-auto ilm-scroll rounded-md border p-2">
                    {reviewedUnits.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                        Loading reviewed units…
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {reviewedUnits.map((u) => {
                          const checked = citedIds.includes(u.id);
                          return (
                            <li key={u.id}>
                              <label
                                className={cn(
                                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                  checked
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/60"
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleCited(u.id)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-medium">
                                      {u.bookTitle}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {u.locator}
                                    </span>
                                  </span>
                                  <span className="block text-xs text-muted-foreground line-clamp-1">
                                    {u.translationText}
                                  </span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addLesson} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Add lesson
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {node.children && node.children.length > 0 ? (
          <ul className="space-y-1.5">
            {node.children.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <FileText className="size-3.5 text-foreground/70" />
                <span className="font-medium">{l.title}</span>
                <span className="ml-auto flex items-center gap-1">
                  {typeof l.citedUnitCount === "number" && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      <Quote className="size-3 mr-0.5" />
                      {l.citedUnitCount}
                    </Badge>
                  )}
                  {typeof l.exerciseCount === "number" && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      <ListChecks className="size-3 mr-0.5" />
                      {l.exerciseCount}
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No lessons yet. Click “Add lesson” to create one.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Lesson detail panel — add exercise
// =============================================================================

const PAYLOAD_PLACEHOLDERS: Record<string, string> = {
  mcq: JSON.stringify(
    { options: ["Option A", "Option B", "Option C"], correctIndex: 0 },
    null,
    2
  ),
  fill_blank: JSON.stringify({ accept: ["answer one", "answer two"] }, null, 2),
  ordering: JSON.stringify(
    { items: ["Step A", "Step B", "Step C"], correctOrder: [0, 1, 2] },
    null,
    2
  ),
  matching: JSON.stringify(
    { pairs: [["left A", "right 1"], ["left B", "right 2"]] },
    null,
    2
  ),
};

function LessonDetailCard({ node }: { node: AuthoringNode }) {
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  const [open, setOpen] = React.useState(false);
  const { data: libData } = useApi<{ units: TextUnitDto[] }>("/api/library");
  const reviewedUnits = libData?.units ?? [];

  const [type, setType] = React.useState<string>("mcq");
  const [prompt, setPrompt] = React.useState("");
  const [payloadText, setPayloadText] = React.useState(
    PAYLOAD_PLACEHOLDERS.mcq
  );
  const [xpReward, setXpReward] = React.useState(10);
  const [difficulty, setDifficulty] = React.useState<Difficulty>("beginner");
  const [sourceTextUnitId, setSourceTextUnitId] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setType("mcq");
    setPrompt("");
    setPayloadText(PAYLOAD_PLACEHOLDERS.mcq);
    setXpReward(10);
    setDifficulty("beginner");
    setSourceTextUnitId("");
  }, [node.id]);

  function onTypeChange(v: string) {
    setType(v);
    setPayloadText(PAYLOAD_PLACEHOLDERS[v] ?? "{}");
  }

  async function addExercise() {
    if (!prompt.trim()) {
      toast.error("Prompt is required.");
      return;
    }
    let payload: unknown = {};
    try {
      payload = JSON.parse(payloadText || "{}");
    } catch {
      toast.error("Payload is not valid JSON.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/authoring/exercises", {
        method: "POST",
        body: JSON.stringify({
          lessonId: node.id,
          type,
          prompt: prompt.trim(),
          payload,
          xpReward,
          difficulty,
          sourceTextUnitId: sourceTextUnitId || undefined,
        }),
      });
      toast.success("Exercise added (published).");
      bumpRefresh();
      setOpen(false);
      setPrompt("");
      setPayloadText(PAYLOAD_PLACEHOLDERS[type]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add exercise.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="size-3.5" /> Lesson
            </div>
            <CardTitle className="text-lg">{node.title}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
              {typeof node.citedUnitCount === "number" && (
                <Badge variant="secondary" className="text-[10px]">
                  <Quote className="size-3 mr-0.5" />
                  {node.citedUnitCount} cited sources
                </Badge>
              )}
              {typeof node.exerciseCount === "number" && (
                <Badge variant="secondary" className="text-[10px]">
                  <ListChecks className="size-3 mr-0.5" />
                  {node.exerciseCount} exercises
                </Badge>
              )}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add an exercise to “{node.title}”</DialogTitle>
                <DialogDescription>
                  Scholar-authored exercises are published directly. Link a
                  reviewed TextUnit as the answer-key source where applicable
                  (spec §4 — every exercise is grounded in a reviewed source).
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto ilm-scroll pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={onTypeChange}>
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXERCISE_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(v) => setDifficulty(v as Difficulty)}
                    >
                      <SelectTrigger className="w-full capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d} className="capitalize">
                            {d.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Prompt</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={2}
                    placeholder="What should the learner do?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>XP reward</Label>
                    <Input
                      type="number"
                      min={1}
                      value={xpReward}
                      onChange={(e) =>
                        setXpReward(
                          Math.max(1, parseInt(e.target.value || "10", 10))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source TextUnit (optional)</Label>
                    <Select
                      value={sourceTextUnitId}
                      onValueChange={setSourceTextUnitId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewedUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.bookTitle} · {u.locator}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payload (JSON)</Label>
                  <Textarea
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    rows={7}
                    className="font-mono text-xs"
                    spellCheck={false}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Shape depends on type — see the placeholder. Validate
                    your JSON before saving.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addExercise} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Add exercise
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            This lesson currently cites{" "}
            <strong className="text-foreground">
              {node.citedUnitCount ?? 0}
            </strong>{" "}
            reviewed source(s) and contains{" "}
            <strong className="text-foreground">
              {node.exerciseCount ?? 0}
            </strong>{" "}
            exercise(s). To edit the lesson body or its citations, use the
            Lesson detail API directly (out of scope of this tool).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Right panel dispatcher
// =============================================================================

function RightPanel({
  node,
  tree,
  onSelectTrack,
}: {
  node: AuthoringNode | null;
  tree: AuthoringNode[];
  onSelectTrack: () => void;
}) {
  if (!node) {
    return <CreateTrackCard onDone={onSelectTrack} />;
  }
  if (node.type === "track") return <TrackDetailCard node={node} />;
  if (node.type === "course") return <CourseDetailCard node={node} />;
  if (node.type === "chapter") return <ChapterDetailCard node={node} />;
  if (node.type === "lesson") return <LessonDetailCard node={node} />;
  return null;
}

// =============================================================================
// Main view
// =============================================================================

export function AuthoringView() {
  const role = useStore((s) => s.role);
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  const { data, loading, error } = useApi<{ tree: AuthoringNode[] }>(
    "/api/authoring"
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const tree = data?.tree ?? [];
  const selected = React.useMemo(
    () => findNode(tree, selectedId),
    [tree, selectedId]
  );
  const path = selectedId ? nodePath(tree, selectedId) : [];

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
                <PenSquare className="size-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                <span className="ilm-gradient-text">Content Authoring</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Build and edit the curriculum tree — tracks, courses, chapters,
              lessons, and exercises — citing only reviewed TextUnits from the
              library.
            </p>
          </div>
          {path.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
            >
              {path.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3 opacity-60" />}
                  <span className={cn(i === path.length - 1 && "font-medium text-foreground")}>
                    {p}
                  </span>
                </span>
              ))}
            </nav>
          )}
        </div>
      </Card>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <Card className="p-4">
            <Skeleton className="h-8 w-full" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Separator className="my-4" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Failed to load curriculum tree</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => bumpRefresh()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
          <TreePanel
            tree={tree}
            selectedId={selectedId}
            onSelect={(n) => setSelectedId(n.id)}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={selected?.id ?? "__new__"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <RightPanel
                node={selected}
                tree={tree}
                onSelectTrack={() => setSelectedId(null)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
