"use client";

import * as React from "react";
import { Search, BookOpen, GraduationCap, LibraryBig, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import type { SearchResult } from "@/lib/types";
import { MadhabBadge } from "./review-gate";
import { GradeBadge } from "./grade-badge";
import { ArabicText } from "./arabic-text";
import { cn } from "@/lib/utils";

// Command-palette-style global search (spec §1): searches TextUnits, Courses,
// and Tracks in one query, grouped by result type. Triggered from the header
// or via Cmd/Ctrl+K.
export function CommandPalette() {
  const { searchOpen, setSearchOpen, openLesson, setActiveCourseId, setView } = useStore();
  const [q, setQ] = React.useState("");

  // debounce
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data } = useApi<SearchResult>(debounced.length >= 2 ? `/api/search?q=${encodeURIComponent(debounced)}` : null);
  const r = data ?? { textUnits: [], courses: [], tracks: [] };
  const empty = debounced.length >= 2 && r.textUnits.length === 0 && r.courses.length === 0 && r.tracks.length === 0;

  // keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen]);

  const close = () => {
    setSearchOpen(false);
    setQ("");
  };

  return (
    <Dialog open={searchOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="top-[15vh] max-w-xl translate-y-0 gap-0 p-0" >
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="size-5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sources, courses, tracks…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto ilm-scroll p-2">
          {debounced.length < 2 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search across the library, courses, and tracks.
            </div>
          )}

          {empty && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debounced}&rdquo;.
            </div>
          )}

          {r.tracks.length > 0 && (
            <Group label="Tracks" icon={GraduationCap}>
              {r.tracks.map((t) => (
                <ResultRow key={t.id} onClick={() => { setView("tracks"); close(); }}>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{t.title}</div>
                    {t.description && (
                      <div className="truncate text-xs text-muted-foreground">{t.description}</div>
                    )}
                  </div>
                  <MadhabBadge scope={t.madhabScope} />
                </ResultRow>
              ))}
            </Group>
          )}

          {r.courses.length > 0 && (
            <Group label="Courses" icon={LibraryBig}>
              {r.courses.map((c) => (
                <ResultRow key={c.id} onClick={() => { setActiveCourseId(c.id); setView("tracks"); close(); }}>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{c.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.trackTitle}</div>
                  </div>
                  <MadhabBadge scope={c.madhabScope} />
                </ResultRow>
              ))}
            </Group>
          )}

          {r.textUnits.length > 0 && (
            <Group label="Library TextUnits" icon={BookOpen}>
              {r.textUnits.map((u) => (
                <ResultRow key={u.id} onClick={() => { setView("library"); close(); }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-primary">{u.bookTitle}</span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">{u.locator}</span>
                    </div>
                    <ArabicText className="mt-0.5 truncate text-base">{u.arabicText}</ArabicText>
                    <div className="truncate text-xs text-muted-foreground">{u.translationSnippet}</div>
                  </div>
                  <GradeBadge grade={u.grade} />
                </ResultRow>
              ))}
            </Group>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
        "hover:bg-accent hover:bg-accent/80"
      )}
    >
      {children}
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
