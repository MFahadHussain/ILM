# Task 9+11 — full-stack-developer — TracksView + ProfileView

## What was built
Two `"use client"` view components for the ILM platform:

1. `src/components/views/tracks-view.tsx` — `export function TracksView()`
   - DataCamp-style track → course browser.
   - Fetches `useApi<{ tracks: TrackDto[] }>("/api/tracks")`.
   - Per-track `motion.section` reveal with header card (icon + madhab pill + course count + description) + responsive course grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`).
   - CourseCard: tinted top stripe (color token: emerald/amber/teal), difficulty badge (beginner→emerald, intermediate→amber, advanced→rose, hawza_prep→fuchsia), meta row (lessons/chapters/hours), line-clamp-2 description, optional "🔒 Prerequisite required" pill with Tooltip, full-width "Start course" Button.

2. `src/components/views/profile-view.tsx` — `export function ProfileView()`
   - Fetches `useApi<{ profile: ProfileDto }>("/api/me")`.
   - Tabs: Overview / Badges & Medals / Bookmarks / Settings.
   - Profile header (initials in emerald→gold gradient, role + madhab pills, LevelRing size 80 with Arabic level title, XpBar) + stat chip grid.
   - Activity heatmap: 17-week × 7-day pure-div contribution graph with 5-step emerald intensity, per-cell Tooltip, month labels, Less→More legend, mobile scroll.
   - Badge case (rarity-colored circles, lock overlay when locked, tooltip w/ humanized criteria).
   - Medal case (tier-colored rings silver/gold/platinum).
   - Settings: Switches for publicProfile & leaderboardOptIn (PATCH /api/profile/settings + bumpRefresh + toast), Select for dailyGoalXp (25/50/100).

## Contract note for downstream LearnView agent
TracksView's "Start course" button calls:
```ts
setActiveCourseId(course.id);
setView("learn");
```
It intentionally does NOT call `openLesson()` because TracksView has no course→first-lesson endpoint. LearnView MUST handle the case where `activeCourseId` is set but `activeLessonId` is null by fetching the course's first lesson.

## Decisions / deviations
- `MadhabBadge` was listed in the task's shared-component inventory but does NOT exist in `src/components/ilm/`. To avoid breaking imports, rendered inline `MadhabPill` components inside both views (shia→emerald, sunni→sky, else→zinc). Did not create a new shared file (task said create only the two view files).
- Per spec, SKIPPED per-course progress bars (no lesson-list endpoint available in this view's scope); course cards show chapterCount/lessonCount/estimatedHours/difficulty only.
- Prereq-gated courses keep the Start button enabled but show a warning pill + tooltip (per spec).
- Activity heatmap uses 17 weeks (119 days) ending at the most recent Sunday, emerald intensity buckets: 0→bg-muted, 1-20→/30, 21-40→/50, 41-60→/70, >60→full.

## Verification
- `bunx tsc --noEmit` → zero errors in `tracks-view.tsx` and `profile-view.tsx` (remaining tsc errors are in other agents' WIP files: app-shell.tsx missing sibling views, profile.ts/session.ts relation typing, examples/skills — untouched).
- `bunx eslint src/components/views/tracks-view.tsx src/components/views/profile-view.tsx` → clean, no warnings.

## Files touched
- CREATED `/home/z/my-project/src/components/views/tracks-view.tsx`
- CREATED `/home/z/my-project/src/components/views/profile-view.tsx`
- APPENDED section to `/home/z/my-project/worklog.md`
- No other files modified.
