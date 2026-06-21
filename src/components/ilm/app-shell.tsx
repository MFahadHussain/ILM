"use client";

import * as React from "react";
import {
  LayoutDashboard, LibraryBig, GraduationCap, BookOpen, User as UserIcon,
  Trophy, ShieldCheck, Menu, Sparkles, ChevronRight, Settings as SettingsIcon,
  Award, StickyNote, Search, PenSquare, History, Moon, Sun, ClipboardCheck,
  CheckCircle2, XCircle, Clock, LogOut,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { ProfileDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { LevelRing } from "./level-ring";
import { XpBar } from "./xp-bar";
import { StreakBadge } from "./streak-badge";
import { CommandPalette } from "./command-palette";
import { DashboardView } from "@/components/views/dashboard-view";
import { LibraryView } from "@/components/views/library-view";
import { TracksView } from "@/components/views/tracks-view";
import { LearnView } from "@/components/views/learn-view";
import { ProfileView } from "@/components/views/profile-view";
import { LeaderboardView } from "@/components/views/leaderboard-view";
import { ReviewView } from "@/components/views/review-view";
import { AchievementsView } from "@/components/views/achievements-view";
import { NotesView } from "@/components/views/notes-view";
import { SettingsView } from "@/components/views/settings-view";
import { AuthoringView } from "@/components/views/authoring-view";
import { MyReviewsView } from "@/components/views/my-reviews-view";
import { OnboardingView } from "@/components/views/onboarding-view";
import { LoginView } from "@/components/views/login-view";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  view: string;
}

// Student nav — order: Dashboard, Library, Tracks, Learn, Profile, Achievements, Notes, Leaderboard
const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
  { label: "Library", icon: LibraryBig, view: "library" },
  { label: "Tracks", icon: GraduationCap, view: "tracks" },
  { label: "Learn", icon: BookOpen, view: "learn" },
  { label: "Profile", icon: UserIcon, view: "profile" },
  { label: "Achievements", icon: Award, view: "achievements" },
  { label: "Notes", icon: StickyNote, view: "notes" },
  { label: "Leaderboard", icon: Trophy, view: "leaderboard" },
];

// Scholar nav — entirely swapped, not permission-gated (spec §8)
const SCHOLAR_NAV: NavItem[] = [
  { label: "Review Queue", icon: ShieldCheck, view: "review" },
  { label: "Content Authoring", icon: PenSquare, view: "authoring" },
  { label: "Library", icon: LibraryBig, view: "library" },
  { label: "My Reviews", icon: History, view: "my-reviews" },
];

function ThemeToggleInline() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-9" />;
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

function ScholarCard({ profile }: { profile: ProfileDto }) {
  const rs = profile.reviewerStats;
  if (!rs) return null;
  return (
    <div className="mx-3 mb-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{profile.displayName}</div>
          <div className="text-[11px] font-semibold text-emerald-600">Scholar · Reviewer</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/60 p-1.5">
          <div className="text-sm font-bold">{rs.itemsReviewed}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Reviewed</div>
        </div>
        <div className="rounded-lg bg-muted/60 p-1.5">
          <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-emerald-600">
            <CheckCircle2 className="size-3" />
            {rs.itemsApproved}
          </div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Approved</div>
        </div>
        <div className="rounded-lg bg-muted/60 p-1.5">
          <div className="flex items-center justify-center gap-0.5 text-sm font-bold text-rose-600">
            <XCircle className="size-3" />
            {rs.itemsRejected}
          </div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Rejected</div>
        </div>
      </div>
      {rs.lastReviewAt && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          Last review: {new Date(rs.lastReviewAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function StudentCard({ profile }: { profile: ProfileDto }) {
  return (
    <div className="mx-3 mb-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <LevelRing levelInfo={profile.levelInfo} size={52} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{profile.displayName}</div>
          <div className="text-[11px] text-muted-foreground">
            Lv {profile.level} · {profile.xp} XP
          </div>
        </div>
      </div>
      <div className="mt-2.5">
        <XpBar levelInfo={profile.levelInfo} xp={profile.xp} />
      </div>
      <div className="mt-2.5">
        <StreakBadge streak={profile.streakCount} freezes={profile.streakFreezeCount} />
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, role, setRole, setSearchOpen, logout } = useStore();
  const { data } = useApi<{ profile: ProfileDto }>("/api/me");
  const profile = data?.profile;
  const nav = role === "scholar" ? SCHOLAR_NAV : STUDENT_NAV;

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-tight ilm-gradient-text">ILM</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {role === "scholar" ? "Scholar Portal" : "Islamic Studies"}
          </div>
        </div>
      </div>

      {/* User / Scholar card */}
      {profile && (role === "scholar" ? <ScholarCard profile={profile} /> : <StudentCard profile={profile} />)}

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3 ilm-scroll">
        {/* Global search trigger (top of nav on mobile where there's no header search) */}
        <button
          onClick={() => { setSearchOpen(true); onNavigate?.(); }}
          className="mb-2 flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground lg:hidden"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">⌘K</kbd>
        </button>

        {nav.map((item) => {
          const active = view === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => { setView(item.view as never); onNavigate?.(); }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Settings + Role switch */}
      <div className="border-t p-3">
        {role === "student" && (
          <button
            onClick={() => { setView("settings"); onNavigate?.(); }}
            className={cn(
              "mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              view === "settings"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <SettingsIcon className="size-4.5 shrink-0" />
            Settings
          </button>
        )}
        <button
          onClick={() => { logout(); onNavigate?.(); }}
          className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
        >
          <LogOut className="size-4.5 shrink-0" />
          Sign out
        </button>
        <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 p-1 text-xs font-semibold">
          <button
            onClick={() => setRole("student")}
            className={cn("flex-1 rounded-md px-2 py-1.5 transition", role === "student" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            Student
          </button>
          <button
            onClick={() => setRole("scholar")}
            className={cn("flex-1 rounded-md px-2 py-1.5 transition", role === "scholar" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            Scholar
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Demo role switch</span>
          <ThemeToggleInline />
        </div>
      </div>
    </div>
  );
}

function HeaderSearchButton() {
  const { setSearchOpen } = useStore();
  return (
    <button
      onClick={() => setSearchOpen(true)}
      className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted w-56"
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold">⌘K</kbd>
    </button>
  );
}

export function AppShell() {
  const { view, role, isAuthenticated } = useStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { data } = useApi<{ profile: ProfileDto }>(isAuthenticated ? "/api/me" : null);
  const profile = data?.profile;
  const setUserMadhab = useStore((s) => s.setUserMadhab);

  // Sync userMadhab from profile
  React.useEffect(() => {
    if (profile?.madhab) setUserMadhab(profile.madhab);
  }, [profile?.madhab, setUserMadhab]);

  // Auth gate: if not authenticated, show the login page
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Onboarding gate: if student and not onboarded, show onboarding
  if (profile && !profile.onboarded && role === "student" && view !== "onboarding") {
    return (
      <>
        <OnboardingView />
        <CommandPalette />
      </>
    );
  }

  const titleMap: Record<string, string> = {
    dashboard: "Dashboard",
    library: "Islamic Library Engine",
    tracks: "Learning Tracks",
    learn: "Lesson Player",
    profile: "My Profile",
    achievements: "Achievements",
    notes: "Notes & Bookmarks",
    settings: "Settings",
    leaderboard: "Leaderboard",
    review: "Scholar Review Queue",
    authoring: "Content Authoring",
    "my-reviews": "My Reviews",
    onboarding: "Welcome to ILM",
  };

  const showStudentHeader = role === "student";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CommandPalette />

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-2.5 backdrop-blur lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="font-extrabold ilm-gradient-text">ILM</span>
        </div>
        {profile && showStudentHeader && (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 font-bold text-orange-600">🔥{profile.streakCount}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{profile.xp} XP</span>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r bg-sidebar lg:block">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Desktop top bar */}
          <header className="sticky top-0 z-20 hidden items-center justify-between border-b bg-background/80 px-8 py-3 backdrop-blur lg:flex">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-lg font-bold tracking-tight">{titleMap[view] ?? "ILM"}</h1>
                <p className="text-xs text-muted-foreground">
                  {profile
                    ? role === "scholar"
                      ? `Reviewing as ${profile.displayName}`
                      : `Assalamu ʿalaykum, ${profile.displayName.split(" ")[0]}.`
                    : "Loading…"}
                </p>
              </div>
              <HeaderSearchButton />
            </div>
            {profile && showStudentHeader && (
              <div className="flex items-center gap-4">
                <StreakBadge streak={profile.streakCount} freezes={profile.streakFreezeCount} />
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2.5">
                  <LevelRing levelInfo={profile.levelInfo} size={40} />
                  <div className="text-right">
                    <div className="text-sm font-bold leading-none">{profile.xp} XP</div>
                    <div className="text-[11px] text-muted-foreground">{profile.levelInfo.title}</div>
                  </div>
                </div>
              </div>
            )}
            {profile && role === "scholar" && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ClipboardCheck className="size-4" />
                {profile.reviewerStats?.itemsReviewed ?? 0} items reviewed
              </div>
            )}
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              {view === "dashboard" && <DashboardView />}
              {view === "library" && <LibraryView />}
              {view === "tracks" && <TracksView />}
              {view === "learn" && <LearnView />}
              {view === "profile" && <ProfileView />}
              {view === "achievements" && <AchievementsView />}
              {view === "notes" && <NotesView />}
              {view === "settings" && <SettingsView />}
              {view === "leaderboard" && <LeaderboardView />}
              {view === "review" && <ReviewView />}
              {view === "authoring" && <AuthoringView />}
              {view === "my-reviews" && <MyReviewsView />}
              {view === "onboarding" && <OnboardingView />}
            </div>
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t bg-card/60">
            <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8">
              <div className="flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
                <p className="max-w-2xl leading-relaxed">
                  <span className="font-semibold text-foreground">ILM</span> — a study-completion
                  platform. Certificates recognise course completion only and are{" "}
                  <span className="font-semibold">not ijāzah</span>; they confer no scholarly
                  authority. All served content is traceable to reviewed primary sources.
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Scholar-reviewed</span>
                  <ChevronRight className="size-3" />
                  <span className="font-mono">v0.2</span>
                </div>
              </div>
              <div className="mt-3 border-t pt-3 text-center text-xs text-muted-foreground">
                Built by{" "}
                <a
                  href="https://fahadai.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Fahad Hussain
                </a>{" "}
                <span className="text-muted-foreground/60">· Developer</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
