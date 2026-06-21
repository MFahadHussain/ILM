# ILM — Gamified Shia Islamic Studies Platform — Worklog

Project root: `/home/z/my-project`
Stack: Next.js 16 (App Router) + TypeScript + Prisma (SQLite) + Tailwind 4 + shadcn/ui.
Single user-visible route: `/` (SPA-style view switching via client state).

---
Task ID: 0
Agent: orchestrator (main)
Task: Set up project plan, schema, and foundation.

Work Log:
- Explored existing scaffold (Next.js 16, shadcn new-york, Prisma, Tailwind 4, framer-motion, recharts, zustand, react-query all available).
- Designed Prisma schema covering: Book, TextUnit (review gate), TopicTag, Track, Course (prereqs + difficulty), Chapter, Lesson (cited TextUnits), Exercise (source-linked answer key), User, UserProfile, BadgeCatalog/MedalCatalog, UserBadge/UserMedal, ProgressRecord, ActivityLog (heatmap/streak), Bookmark, Note.
- Planning emerald+gold theme, RTL-aware Arabic, dark mode.

Stage Summary:
- Foundation ready. Schema next.

---
Task ID: 3-6
Agent: orchestrator (main)
Task: Gamification lib, types, all API routes, theme, app shell, shared components.

Work Log:
- src/lib/types.ts: full DTO type set (ProfileDto, TrackDto, CourseDto, LessonDto, ExerciseDto, TextUnitDto, LeaderboardEntry, ReviewQueueItem, BadgeDto, MedalDto, SubmitAnswerResult, LevelInfo, ActivityDay, etc.).
- src/lib/gamification.ts: in-theme LEVELS (Seeker→Quṭb al-ʿIlm), getLevelFromXp, updateStreak (humane freeze tokens), xpForExercise (diminishing returns), evaluateBadge (rule-based, server-side), checkAnswer (mcq/fill/order/matching).
- src/lib/session.ts: demo session via x-ilm-user header (student default, scholar switchable).
- src/lib/profile.ts: loadProfile (review-gate aware, computes badges/medals/heatmap/level) + loadDashboardExtras (continue learning, recommended).
- API routes: /api/me, /api/library (+ /filters), /api/tracks, /api/lessons/[id], /api/lessons/[id]/submit (XP+streak+progress+badge re-eval), /api/leaderboard (opt-in only), /api/review (+ /[id] approve-reject, /drafts), /api/exercises/[id] (publish draft), /api/ai/draft (grounded LLM exercise draft, saved as draft), /api/profile/settings (privacy toggle).
- src/app/globals.css: emerald+gold theme (light/dark), .arabic (RTL+Amiri), ilm-pattern, ilm-gradient-text, ilm-scroll, pulse animation.
- src/app/layout.tsx: Geist + Amiri fonts, ThemeProvider, Sonner toaster.
- src/lib/store.ts (zustand: view/role/activeLessonId/activeCourseId/refreshKey), src/lib/api.ts (apiFetch), src/lib/use-api.ts (useApi hook).
- src/components/ilm/*: ArabicText, GradeBadge, LevelRing, XpBar, StreakBadge, IlmIcon, ReviewGateBadge, MadhabBadge.
- src/components/ilm/app-shell.tsx: sidebar + topbar + view router + sticky footer + role switch + theme toggle.
- src/app/page.tsx renders <AppShell/>.

Stage Summary:
- Backend + shell + design system complete and compiling target.
- Remaining: 7 view components (dashboard, library, tracks, learn, profile, leaderboard, review) — delegating to parallel subagents with the contract below.
- Demo users: student (talib@ilm.dev, 285 XP, Lv2, 6-day streak) and scholar (reviewer@ilm.dev, Lv6).
- Review gate enforced at API layer: students only receive isReviewed=true units & status=published exercises.

---
Task ID: 8
Agent: full-stack-developer
Task: Built LibraryView — the standalone searchable Islamic Library Engine (spec §3.3) with scholar-only AI-assisted exercise drafting (spec §6).

Work Log:
- Read worklog.md and existing infrastructure (types.ts, store.ts, use-api.ts, api.ts, shared ILM components, shadcn UI primitives, globals.css, library & AI draft API routes) to align contracts.
- Created /home/z/my-project/src/components/views/library-view.tsx — "use client", default-exported LibraryView().
- Header: gradient title + descriptive subtitle + 3-card stats strip (Books, Reviewed units, Current results).
- Sticky filter Card: debounced (300ms) search Input with Search icon + clear glyph; Selects for Book / Topic / Grade driven by /api/library/filters; scholar-only Switch "Show pending review" with amber Alert when on; Clear button when any filter is active.
- Query path built with useMemo from (debouncedQ, bookId, topic, grade, pending, role); appends &pending=1 only when role==='scholar' && pending. useApi refetches automatically on path change.
- Results grid: grid-cols-1 lg:grid-cols-2 gap-4 with framer-motion AnimatePresence (layout + fade). Each TextUnitCard shows book title + Arabic title inline, MadhabBadge (derived via bookId→madhabScope map from filters, fallback "shia"), GradeBadge, ReviewGateBadge, line-clamp-3 Arabic via ArabicText, line-clamp-3 translation, mono locator with Quote icon, topic tag Badges, footer "View" + (if isReviewed) "Draft exercise (AI)" buttons.
- Loading state: 6 TextUnitSkeleton cards. Empty state: friendly dashed card with icon + Clear filters action. Error state: destructive Alert.
- Detail Dialog (sm:max-w-2xl, scrollable ilm-scroll): full Arabic, translation, italic transliteration, chain of narration, and a PROMINENT primary-tinted Alert showing authenticityGrade + the FULL gradeReference (spec §11 non-negotiable — always visible). Also reviewedAt, status, reviewNotes, AI-assisted Bot badge, topic tags.
- AI Draft Dialog (scholar only, opened from reviewed unit): Select for type (Multiple choice → "mcq" | Fill-in-the-blank → "fill_blank"), Generate button with Loader2 spinner calling apiFetch<AiDraftResponse>("/api/ai/draft", { method:"POST", body: JSON.stringify({ textUnitId, type }) }). On success renders prompt + options (with correctIndex highlighted emerald) or accept[] badges, plus an amber Alert banner repeating "DRAFT — saved as status=draft. It will NOT be shown to students until a reviewer publishes it." with source locator & grade. toast.success on success, toast.error on failure. Payload parsed defensively (string | object).
- Typechecked with `bunx tsc --noEmit` — zero errors in library-view.tsx (only pre-existing errors elsewhere). Lint clean for the new file.

Stage Summary:
- LibraryView is complete and self-contained; integrates with existing shared infra without modifying any other file.
- Enforces spec §3.3 (smallest-addressable-unit library, students see only reviewed units) and §6 (AI drafting grounded in reviewed source, saved as status=draft, never auto-published; gradeReference always visible per §11).

---
Task ID: 9+11
Agent: full-stack-developer
Task: Built TracksView (DataCamp-style track→course browser) and ProfileView (learner profile + gamification showcase + privacy controls).

Work Log:
- Read worklog.md, types.ts, store.ts, use-api.ts, api.ts, globals.css, app-shell.tsx, shared ilm components (IlmIcon, LevelRing, XpBar, StreakBadge, ArabicText, GradeBadge), and API routes (/api/tracks, /api/me, /api/profile/settings) to lock down the contract.
- Confirmed seed data track color tokens (emerald/amber/teal), difficulty enum (beginner/intermediate/advanced/hawza_prep), badge rarity & medal tier enums. Confirmed MadhabBadge is NOT among the existing ilm components, so rendered an inline `MadhabPill` in TracksView (and a similar inline pill in ProfileView header) to avoid breaking imports.
- Created `src/components/views/tracks-view.tsx`:
  - COLOR map helper for emerald/amber/teal (bar / ring / iconBg / iconText / softBg), fallback emerald.
  - DIFFICULTY map: beginner→emerald, intermediate→amber, advanced→rose, hawza_prep→fuchsia.
  - MadhabPill (shia→emerald, sunni→sky, else→zinc).
  - Header with ilm-gradient-text title + descriptive subtitle.
  - Per-track motion.section reveal: track header card (icon circle + title + madhab pill + course count + description) + responsive course grid (1/2/3 cols).
  - CourseCard: tinted top stripe + soft tint background, title, trackTitle, difficulty badge, line-clamp-2 description, meta row (lessons/chapters/hours), optional "🔒 Prerequisite required" pill with Tooltip ("Complete prerequisite course first"), full-width "Start course" Button.
  - Start handler sets `activeCourseId(course.id)` then `setView('learn')` — documented assumption that LearnView resolves the course's first lesson when activeLessonId is absent (no course→first-lesson endpoint available here).
  - Loading skeletons, error card, and empty state.
- Created `src/components/views/profile-view.tsx`:
  - Tabs: Overview | Badges & Medals | Bookmarks | Settings.
  - Overview: profile header card (initials in emerald→gold gradient circle, displayName, role pill, madhab pill, LevelRing size 80 with Arabic level title, XpBar, ilm-pattern background overlay) + stat chip grid (Total XP, Day streak w/ flame, Longest streak, Badges, Medals, Lessons completed/total) + Activity heatmap card with today/goal chips.
  - ActivityHeatmap: pure-divs contribution graph, 17 weeks × 7 days, last Sunday anchored, xpGained→5-step emerald intensity (bg-muted → /30 → /50 → /70 → full), per-cell Tooltip (date + XP), month labels above (show only on month change), Mon/Wed/Fri row labels, Less→More legend. Built with overflow-x-auto + ilm-scroll for mobile.
  - BadgeTile: IlmIcon in rarity-colored circle (common→zinc, rare→emerald, epic→amber, legendary→rose), lock overlay + grayscale + opacity-60 when locked; Tooltip shows description + humanized criteriaRule + earnedAt.
  - MedalTile: ring-2 in tier color (silver→zinc, gold→amber, platinum→cyan), IlmIcon, tier chip with MedalIcon; earned shown prominently, locked dimmed; Tooltip with description + humanized rule + awarded date.
  - humanizeRule: maps prefix patterns (lesson:/course_start:/course_done:/track_done:/book_3:) and known slugs to friendly text.
  - Bookmarks: scrollable list (max-h-96 + ilm-scroll) with lessonTitle + locator + note; empty state.
  - Settings: SettingRow component (Switch → PATCH /api/profile/settings with body `{ [field]: next }` → bumpRefresh + toast.success + pending state) for publicProfile & leaderboardOptIn; DailyGoalSelect (25/50/100 XP → PATCH dailyGoalXp); Account card with language/madhab/freezes/role + "not ijāzah" disclaimer.
- Fixed one tsc error: added missing `text` field to RARITY_STYLE entries (was referenced in BadgeTile).
- Verified both files: `bunx tsc --noEmit` reports zero errors in tracks-view.tsx and profile-view.tsx; `bunx eslint` on both files passes clean.

Stage Summary:
- TracksView + ProfileView delivered, type-clean, lint-clean, fully wired to existing store/api/hooks and shared ilm components.
- Key contract note for downstream LearnView agent: when `activeCourseId` is set and `activeLessonId` is null, LearnView must fetch the course's first lesson (TracksView's Start button relies on this — documented in code comment).
- Privacy controls (publicProfile / leaderboardOptIn / dailyGoalXp) all PATCH /api/profile/settings then bumpRefresh + toast.
- Activity heatmap is built from plain divs (no recharts), emerald intensity scale, mobile-scrollable.
- Did not modify any other file; remaining tsc errors are in other agents' WIP files (app-shell.tsx missing sibling views, profile.ts/session.ts relation typing, examples/skills).

---
Task ID: 7+12
Agent: full-stack-developer
Task: Built the Dashboard and Leaderboard client view components for ILM.

Work Log:
- Read prior worklog + scaffolding: confirmed shared infra (types, store, useApi, @/components/ilm/*, shadcn new-york, theme tokens, ilm-pattern/ilm-gradient-text/ilm-scroll helpers).
- Inspected /api/me shape (profile + continueLearning[] + recommended[]) and /api/leaderboard shape (entries with weeklyXp even though shared LeaderboardEntry type omits it — extended locally).
- Wrote /home/z/my-project/src/components/views/dashboard-view.tsx ("use client", named export DashboardView):
  * Hero greeting card with ilm-pattern + radial blur, time-of-day greeting, gradient first-name, level title (LTR + arabic inline), StreakBadge + longest-streak pill, daily-goal inline SVG ring (todayXp / dailyGoalXp, gold pulse when complete), and LevelRing.
  * 4 stat cards (Total XP / Day Streak / Badges Earned / Lessons Done) — grid-cols-2 lg:grid-cols-4, motion stagger.
  * Continue Learning card: max-h-96 scroll list (ilm-scroll), each row a left-border-tinted card (coverColor → COVER_BORDER map, emerald fallback), Progress bar, completed/total + %, next-lesson line, Resume button → openLesson(nextLessonId) or setView('tracks'). Empty state with "Browse tracks" CTA.
  * Recommended grid (1/2/3 cols): card with cover-tint header, difficulty badge, lesson count + hours + gated Lock pill, click → setActiveCourseId + setView('tracks').
  * Recent badges strip (2/4 cols): earned badges sorted by earnedAt desc, sliced 4, IlmIcon in rarity-tinted circle (zinc/emerald/amber/rose), muted "earned" tag. Empty state.
  * Weekly XP chart (recharts BarChart, 180px): builds last 7 UTC days from profile.activity, 0-fills missing days, emerald bars + gold bar for today, custom Tooltip with popover tokens, legend.
  * Loading skeleton + destructive Alert on error.
- Wrote /home/z/my-project/src/components/views/leaderboard-view.tsx ("use client", named export LeaderboardView):
  * Header card: ilm-pattern, Trophy, gradient title, ShieldCheck + privacy blurb.
  * Your-rank highlight: big #rank, displayName, levelTitle, total XP, streak — or, when not opted in, a "You're not on the board" card with Enable-in-Profile button → setView('profile').
  * Tabs (All Time / This Week): all-time list = API order; weekly list = copy sorted by weeklyXp desc with re-ranked `rank` field; mode drives which value + label renders.
  * Each row: rank cell (top-3 = Crown/Trophy tinted medals; else plain #), avatar with initials (primary fill when current user), bold displayName + "you" tag for current user, Lv + levelTitle, hidden-on-mobile streak flame, right-aligned XP/weekly value with tabular-nums. isCurrentUser rows highlighted bg-primary/10 ring-1 ring-primary/30.
  * Scrollable list max-h-[60vh] ilm-scroll, motion stagger on rows.
  * Loading skeleton + destructive Alert on error.
- Verified imports resolve: bunx tsc --noEmit shows NO errors in either view file (only pre-existing errors in profile.ts/session.ts/app-shell imports of not-yet-built views); bunx eslint on both files passes with zero warnings.

Stage Summary:
- Two polished, fully responsive client views delivered; both compile and lint clean.
- Dashboard visualises daily goal, level progress, streak, in-progress courses, recommendations, recent badges, and a 7-day XP bar chart — all driven by /api/me with graceful loading/error/empty states.
- Leaderboard respects opt-in privacy, surfaces the current user's rank prominently, and supports all-time vs weekly ranking via tabs.
- No files outside the two requested view files were modified.

---
Task ID: 10+13
Agent: full-stack-developer
Task: Built the LearnView (lesson player) and ReviewView (scholar review queue) client components.

Work Log:
- Read /home/z/my-project/worklog.md to align with the orchestrator's contract (types, store, api, design system).
- Inspected shared infrastructure: types.ts (DTOs + ExercisePayload union), store.ts (activeLessonId/activeCourseId/role/refreshKey), use-api.ts (refreshes on refreshKey/role), api.ts (apiFetch with x-ilm-user header), grade-badge.tsx, arabic-text.tsx, review-gate.tsx, icon.tsx, plus the relevant API routes (/api/lessons/[id], /api/lessons/[id]/submit, /api/review, /api/review/[id], /api/review/drafts, /api/exercises/[id]).
- Verified the submit route returns correctCount + totalExercises beyond the shared SubmitAnswerResult DTO; extended the type locally in LearnView rather than mutating types.ts (per "do not modify any other file").
- Wrote src/components/views/learn-view.tsx ("use client", named export LearnView):
  - Two-column desktop layout (main + 320px sidebar), single-column mobile with sidebar hidden.
  - Picker fallback when activeLessonId is null — friendly Card routing to Tracks, with a special note when activeCourseId is set (assumption documented in code comment per spec).
  - Lesson header (breadcrumb, title, est. minutes, "cites N reviewed sources", difficulty).
  - Lesson contentBody renderer: splits on \n\n into paragraphs, inlines *italics* as <em>.
  - Cited TextUnits section: per-unit Card with bookTitle + GradeBadge + mono locator, ArabicText, translation, transliteration, gradeReference (always shown), contextNote.
  - Exercises section with per-exercise local state (selected/submitted/result):
    - MCQ: RadioGroup with green-check on correct option, red-X on chosen wrong option.
    - fill_blank: Input + accepted answer reveal on submit.
    - ordering: arrow-button reorder (up/down) submitting JSON.stringify(indicesArr), correct sequence highlighted post-submit.
    - matching: Select-per-row with shuffled right options, submitting JSON.stringify([[left,right],...]).
    - short_answer: Textarea, "submitted for review" feedback.
  - AnimatePresence feedback banner (emerald correct / rose incorrect) with +XP, level-up toast, badge-unlock toasts, lessonCompleted → celebratory confetti LessonCompleteCard with spring animation.
  - Calls bumpRefresh() after every submit so the sidebar/topbar XP updates.
  - Prev/Next nav using the lessons array from /api/lessons/[id].
  - LessonSidebar groups sibling lessons by chapterTitle, highlights current, sticky on desktop, scrollable via ScrollArea + ilm-scroll.
  - Loading skeleton + error Alert.
- Wrote src/components/views/review-view.tsx ("use client", named export ReviewView):
  - Role gate: non-scholar users see an access-denied Card pointing to the sidebar role switch.
  - Header Card (ilm-pattern) explaining the API-enforced is_reviewed=true gate, with live counts of pending units and AI drafts.
  - Tabs("TextUnits (review)" | "AI Drafts (publish)") with count badges.
  - ReviewUnitCard: bookTitle + GradeBadge + ReviewGateBadge(reviewed=false) + locator, ArabicText, translation, chainOfNarration, gradeReference, topicTags. Approve opens a Dialog to set final grade (Select of 6 options), gradeReference (Input, prefilled), reviewNotes (Textarea) → PATCH /api/review/[id] with action:"approve". Reject → PATCH with action:"reject". Toasts + bumpRefresh on success.
  - DraftExerciseCard: amber "AI-assisted draft" Alert provenance banner, payload preview (mcq options with correct highlighted / accept[] badges / ordering sequence / matching pairs), source book + locator + grade. Publish → PATCH /api/exercises/[id] with action:"publish". "Keep as draft" → action:"reject".
  - Empty states for both tabs, skeleton while loading.
- Type-checked with `bunx tsc --noEmit`: zero errors in learn-view.tsx or review-view.tsx (pre-existing errors in lib/profile.ts, lib/session.ts, app-shell.tsx, examples/, skills/ are outside this task's scope).
- Linted both files with eslint: clean.

Stage Summary:
- Two production-ready client view components delivered, matching the spec §3.2, §4, §5, §6, §11 contracts.
- All imports resolve against the existing shared infrastructure (no new endpoints, no edits to other files).
- Lesson player feels responsive and rewarding: per-exercise immediate feedback with framer-motion, XP toasts, level-up + badge toasts, confetti completion card.
- Scholar review queue makes the human gate first-class: reviewer-only access, API-enforced gate messaging, per-action audit notes, AI provenance banners.
- Both files compile clean, typecheck clean, lint clean.

---
Task ID: 14
Agent: orchestrator (main)
Task: Integration fixes + end-to-end browser verification.

Work Log:
- Fixed Prisma schema: added Bookmark/Note relations to TextUnit & Lesson (onDelete: SetNull); re-pushed.
- Fixed src/lib/profile.ts: earnedAt → ISO string conversion (badges/medals), null-guard on pr.course in loadDashboardExtras.
- Fixed src/lib/session.ts: clean getCurrentUser typing.
- Fixed src/components/ilm/app-shell.tsx: removed broken NavItem tuple type.
- Fixed prisma/seed.ts: dynamic table delete via cast (no ts-expect-error).
- Removed 2 unused eslint-disable directives; lint now exit 0 (clean).
- Dev server running on :3000 (setsid-detached, persistent across tool calls).
- Agent Browser end-to-end verification (all PASS):
  1. Dashboard renders: greeting, daily-goal ring, level ring, 4 stat cards, Continue Learning (Virtues & Manners of Knowledge 2/4 · 50%, Next: Knowledge vs Wealth, Resume), Recommended, Recent badges, weekly XP bar chart.
  2. Learn player: breadcrumb, lesson prose, cited reviewed TextUnit with Arabic (RTL/Amiri), grade + gradeReference, interactive ordering + MCQ exercises.
  3. Exercise submission: MCQ "Who compiled Nahj al-Balagha?" → al-Sharif al-Radi → toast "+10 XP"; sidebar XP updated 285→295 (115→105 to next); Profile reflected 295 XP. XP/streak/progress/badge re-eval all working.
  4. Library: 5 books, 9 reviewed units, filter dropdowns, Arabic RTL cards, GradeBadge, ReviewGateBadge, AI-draft buttons, scholar "Show pending" toggle.
  5. Profile: Tabs (Overview/Badges&Medals/Bookmarks/Settings), 129-cell activity heatmap with month+weekday labels, badge case (rarity-colored), medal case, privacy switches.
  6. Leaderboard: opt-in privacy note, "Your Rank #4" highlighted, 7 ranked learners, All Time / This Week tabs.
  7. Scholar Review Queue: review-gate explanation, 2 pending TextUnits (Al-Kafi + Nahj al-Balagha Letter 31) with Approve/Reject + grade form, AI Drafts tab.
  8. AI-assisted draft: POST /api/ai/draft 200 in 2.9s — grounded generation from Bihar al-Anwar 75:118, saved as status=draft, dialog clearly states "NOT shown to students until published".
  9. Dark mode: html.dark toggled, body bg lab(3.8) dark / lab(98.9) light.
  10. Footer: pushed down naturally on long dashboard (footerTop 1282, bodyHeight 1623); sticky-to-bottom guaranteed by min-h-screen flex-col + mt-auto on short pages.
- Dev log: 37 requests all 200, zero errors/warnings.

Stage Summary:
- ILM platform COMPLETE and browser-verified end-to-end. Lint clean. All 6 build-phase pillars demonstrated (Library Engine, Course structure, Learning player, Gamification, AI-assisted authoring, Scholar review gate).
