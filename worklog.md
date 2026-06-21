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

---
Task ID: F4+F9
Agent: full-stack-developer
Task: Built SettingsView (spec §4) and OnboardingView (spec §9) client components — the final two stub views for the ILM platform.

Work Log:
- Read /home/z/my-project/worklog.md to align with prior agents' contracts (types.ts ProfileDto, store.ts setUserMadhab/bumpRefresh, use-api.ts useApi, api.ts apiFetch, design system emerald+gold, existing views' PATCH /api/profile/settings + bumpRefresh + toast pattern from profile-view.tsx).
- Inspected the actual /api/profile/settings PATCH route to confirm field contract: publicProfile, leaderboardOptIn, dailyGoalXp, language, rtlOverride (string|null), madhab ("shia"|"sunni"), onboarded, interests (string[]), dailyReminderEnabled, dailyReminderTime (string|null), streakAlertsEnabled → returns { ok: true }. Confirmed madhab lives on User model and re-filters the whole app.
- Confirmed AppShell gates OnboardingView when `profile && !profile.onboarded && role === "student"` — so finishing onboarding (PATCH { onboarded: true }) + bumpRefresh triggers the AppShell to re-render into the sidebar layout automatically.
- Wrote src/components/views/settings-view.tsx ("use client", named export SettingsView):
  * useApi<{ profile: ProfileDto }>("/api/me") for current state; loading → 6-card Skeleton; error → destructive Alert; missing profile → friendly Alert.
  * usePatchSetting() hook: thin wrapper that calls apiFetch PATCH /api/profile/settings + bumpRefresh + toast.success + optional onOk callback. Throws on error so per-section handlers can show the right toast.
  * SectionHeader (icon tile + title + description) reused across all 7 sections for visual consistency.
  * ToggleRow: reusable switch row (icon, title, description, accent = muted/primary/amber) — drives the privacy/notifications/language-RTL sections.
  * §1 Language & Script: Select (en/ar/ur/fa) with native-script preview, RTL auto-detect badge, RTL-override Switch (PATCH rtlOverride: "rtl" | null). Both changes PATCH immediately + toast.
  * §2 Madhab Track: RadioGroup with two custom MadhabOption labels — Shia emerald accent, Sunni sky-blue accent, each with check-circle when selected. On change → PATCH { madhab } + setUserMadhab(madhab) + toast. Info Alert reiterates "Shia and Sunni content are never merged".
  * §3 Privacy: publicProfile + leaderboardOptIn switches (each PATCHes immediately). Info Alert notes "opt-in and off by default" + "we respect learners who prefer private study".
  * §4 Notifications: dailyReminderEnabled switch + framer-motion height-animated time Input (type=time) revealed when on (PATCH dailyReminderTime on blur). Streak-at-risk alert switch (streakAlertsEnabled). Each PATCH + toast.
  * §5 Streak & Freeze (READ-ONLY): dashed Card with 3 stat tiles (freeze tokens / current streak / longest streak), each with tinted icon. Info Alert repeats the humane-freeze rule verbatim ("3 freeze tokens per month ... humane, not predatory ... we don't shame missed days").
  * §6 Appearance: useTheme from next-themes. Two-button grid (Light / Dark) — mounted guard to avoid hydration mismatch. Note: "Choose your preferred theme. This is stored locally."
  * §7 Onboarding (footer): AlertDialog confirmation → PATCH { onboarded: false } + bumpRefresh → AppShell re-renders into the OnboardingView gate. Loader2 spinner while pending.
- Wrote src/components/views/onboarding-view.tsx ("use client", named export OnboardingView):
  * Full-screen OnboardingShell — NO sidebar, NO topbar. ilm-pattern background + radial emerald/gold tint. Centered max-w-lg container, vertically centered. Brand header (Sparkles + ILM gradient text).
  * Progress: thin gradient bar (emerald→gold) animating width via framer-motion + 4 dot indicators (current = wider emerald pill, completed = dim emerald, pending = muted).
  * Step content wrapped in <Step> with AnimatePresence mode="wait" — slide-x + fade transition (24px enter from right, exit to left).
  * Step 1 Welcome: spring-animated gradient circle with Sparkles, "Welcome to ILM" gradient heading, intro paragraph mentioning "source-of-truth library" + "every text you study is traceable to a reviewed primary source", 3 Feature chips (Sourced / Structured / Humane), "Let's take 30 seconds" CTA.
  * Step 2 Madhab track: two large MadhabCard buttons (Shia emerald / Sunni sky), each with accent tile, tagline, description, animated check-circle on select. Default = shia. Info Alert about re-filtering.
  * Step 3 Language: 2-col grid of language option buttons (en/ar/ur/fa) — each shows Globe icon, English label, native script (Arabic font), RTL/LTR auto-detect hint. Selected = primary ring + tint. Note about RTL override in Settings.
  * Step 4 Interests: 2-col toggle grid of 8 chips (Fiqh, Aqeedah, History, Akhlaq, Tafsir, Arabic-for-Quran, Hadith Science, Supplication) — each with a check-square toggle. "Clear" button when any selected. Counter shows selection count.
  * Nav row: Back (ghost) when step > 0 | Skip (link, muted) + Continue (default) when step < last | Finish (default with Sparkles) on last step. Loader2 spinner on Finish during PATCH.
  * finish() helper: PATCH /api/profile/settings with { madhab, language, interests, onboarded: true } all at once → setUserMadhab(madhab) + bumpRefresh() + setView("dashboard") + toast.success "Welcome to ILM!".
  * Skip button: same finish() with defaults (madhab="shia", language="en", interests=[]).
  * Already-onboarded branch: friendly Card with green check-circle + "You're already onboarded" + "Go to dashboard" button (setView("dashboard")).
  * Loading state: spinner in shell. Error state: destructive Alert in shell.
- Verified imports resolve: bunx tsc --noEmit reports zero errors in either new file (only pre-existing errors in .next/dev/types/validator.ts, examples/websocket, skills/). bunx eslint on both files: clean, zero warnings.
- Dev log confirms: app compiles cleanly after both files replaced (prior "module-not-found" was for the old stubs); GET / 200, GET /api/me 200.
- Did not modify any file other than the two requested view stubs.

Stage Summary:
- Two final stub views delivered, type-clean + lint-clean, fully wired to existing store/api/hooks/design system.
- SettingsView: 7 sections covering language/RTL, madhab track, privacy, notifications, streak-freeze read-only overview, dark-mode appearance, and restart-onboarding — all PATCH immediately with toast + bumpRefresh; madhab changes also call setUserMadhab; restart onboarding confirmed via AlertDialog.
- OnboardingView: full-screen 4-step wizard (Welcome → Madhab → Language → Interests) with framer-motion step transitions, progress bar + dots, AnimatePresence, Skip link with defaults, and a single combined PATCH on Finish that flips onboarded=true so the AppShell gate re-routes into the dashboard automatically. Gracefully handles already-onboarded, loading, and error states.
- ILM platform now feature-complete on the client side: every view (dashboard, library, tracks, learn, profile, achievements, notes, settings, leaderboard, review, authoring, my-reviews, onboarding) has a real implementation wired to its API.

---
Task ID: F2+F3
Agent: full-stack-developer
Task: Built AchievementsView (badge & medal showcase, spec §2) and NotesView (notes & bookmarks grouped by source book, spec §3) client view components.

Work Log:
- Read /home/z/my-project/worklog.md and inspected shared infra: types.ts (BadgeDto/MedalDto/NoteDto/BookmarkDto/ProfileDto), store.ts (view/setView/openLesson/bumpRefresh/role), use-api.ts (refresh on refreshKey/role), api.ts (apiFetch with x-ilm-user header), IlmIcon component, ArabicText/GradeBadge, shadcn new-york primitives (Card/Tabs/Progress/Tooltip/AlertDialog/Skeleton/Alert/Separator/Textarea/Badge/Button), and the relevant API routes (/api/me, /api/notes, /api/notes/[id], /api/bookmarks, /api/bookmarks/[id]).
- Cross-referenced seed data (prisma/seed.ts) to confirm actual criteriaRule values (first_lesson, streak_7, lesson:<id>, identify_daif, course_start:<id>, perfect_5, book_3:nhb, course_done:<id>, track_done:<id>, weekly_xp_500, streak_30) so the humanizeRule helper covers every real rule plus graceful fallback.
- Created src/components/views/achievements-view.tsx ("use client", named export AchievementsView):
  * Fetches useApi<{ profile: ProfileDto }>("/api/me") and reads profile.badges / profile.medals.
  * Summary header Card (ilm-pattern overlay, gradient title) with "X / Y badges" + "Z / W medals" counts and two Progress bars (badges emerald via default primary, medals amber-tinted via indicator override).
  * Filter Tabs (All / Earned / Locked) in a single control — drives both badge and medal sections simultaneously. Live count caption below.
  * BadgeTile: circular icon tile (size-14 rounded-full ring-inset), rarity palette common→zinc, rare→emerald, epic→amber, legendary→rose; earned = full color + hover lift + glow shadow; locked = grayscale + opacity-50 + Lock badge overlay. Tooltip shows name + description + humanized criteriaRule (Info icon) + earnedAt date when earned. framer-motion stagger entrance (scale/opacity/y, capped delay).
  * MedalTile: hexagonal shield styling via inline clip-path polygon on the icon container (distinct from round badges); tier palette silver→zinc, gold→amber, platinum→teal; tier chip with MedalIcon below name; same earned/locked logic + Tooltip with awarded date.
  * humanizeRule: prefix pattern matching for lesson:/course_start:/course_done:/track_done:/book_N:slug (with a small BOOK_SLUG_NAMES map: nhb→Nahj al-Balagha, alkafi/kafi→Al-Kafi, bikar/bihar→Bihar al-Anwar, etc.) plus a known-slug table for streak_7/streak_30/identify_daif/perfect_5/weekly_xp_500/first_lesson; final fallback splits on _.
  * Legend strip at bottom explaining rarity + tier color tokens.
  * Loading: skeleton grid mirroring the layout (round skeletons for badges, count-aware). Error: destructive Alert. Per-section empty states for filtered views (e.g. "No badges earned yet — keep studying!").
- Created src/components/views/notes-view.tsx ("use client", named export NotesView):
  * Parallel fetches useApi<{ notes: NoteDto[] }>("/api/notes") and useApi<{ bookmarks: BookmarkDto[] }>("/api/bookmarks"); loading = either in flight, error = either failed.
  * Header Card with counts (notes emerald badge, bookmarks amber badge).
  * Tabs (All / Notes / Bookmarks) with live count pills on each trigger.
  * UnifiedEntry discriminated union ({ kind:"note", data } | { kind:"bookmark", data }); helpers extract bookTitle/lessonTitle/locator/snippet/noteBody/lessonId/textUnitId/timestamp uniformly. groupKey: textUnitBookTitle ?? (lessonTitle ? "Lessons" : "Unsorted").
  * Groups rendered as Cards with header (book icon + title + item-count Badge) and a scrollable entry list (max-h-96 overflow-y-auto ilm-scroll) separated by <Separator/>.
  * EntryRow: kind icon (StickyNote emerald / Bookmark amber), mono locator (text-[11px]) + timestamp + kind Badge, line-clamp-2 snippet, personal note shown in a dashed sub-box with "Your note" label. Actions row: "Jump to lesson" (openLesson) when lessonId exists, else "Open in Library" (setView('library')) when only textUnitId; Edit (notes only) toggles inline Textarea + Save/Cancel (Save → PATCH /api/notes/[id] body { body }, bumpRefresh + toast); Delete with AlertDialog confirmation (notes → DELETE /api/notes/[id], bookmarks → DELETE /api/bookmarks/[id]; destructive rose-tinted action button; bumpRefresh + toast on success). Saving/deleting states disable buttons.
  * Empty state: dashed Card with Inbox icon, contextual message per tab, and a "Browse the Library" Button → setView('library').
  * Loading: 2-card skeleton with entry rows. Error: destructive Alert with AlertCircle. AnimatePresence + layout animations on group cards and entry rows for smooth add/remove.
- Verified: `bunx tsc --noEmit` reports ZERO errors in either new file (remaining errors are all pre-existing in .next/dev/types validator, examples/, skills/). `bunx eslint` on both files: clean, zero warnings.

Stage Summary:
- Two production-ready client view components delivered; both compile, typecheck, and lint clean.
- AchievementsView: full badge & medal showcase with rarity/tier coloring, hexagonal medal shields, earned/locked filtering, tooltips with humanized unlock criteria + award dates, summary progress bars, framer-motion stagger reveals.
- NotesView: unified notes+bookmarks workspace grouped by source book, inline note editing, confirmed deletes via AlertDialog, smart "jump to lesson / open in library" routing, scrollable groups, graceful loading/error/empty states.
- No files outside the two requested view files were modified. All imports resolve via @/ aliases; both views already wired into app-shell.tsx (lines 28-29, 367-368).

---
Task ID: F8a+F8b
Agent: full-stack-developer
Task: Built the AuthoringView (scholar curriculum-authoring tool) and MyReviewsView (scholar review audit trail) client components — spec §8 follow-up build.

Work Log:
- Read /home/z/my-project/worklog.md to align with prior contract; inspected shared infra (types.ts → AuthoringNode, MyReviewItem, TextUnitDto, Difficulty; store.ts → role/bumpRefresh/setView/setRole; use-api.ts; api.ts; ArabicText + GradeBadge ilm components; shadcn new-york primitives; the existing /api/authoring/* routes (tracks POST/PATCH/DELETE, courses POST, chapters POST, lessons POST, exercises POST) and /api/review/my-reviews GET).
- Confirmed MadhabBadge is NOT present in src/components/ilm (Task 9+11 had made the same observation); rendered an inline `MadhabPill` to avoid breaking imports.
- Wrote /home/z/my-project/src/components/views/authoring-view.tsx ("use client", named export AuthoringView):
  * Role gate: non-scholar users get a friendly AccessDenied Card with a "Switch to scholar" button (real gate is server-side on /api/authoring/* which requires role==='reviewer').
  * Fetches the curriculum tree via `useApi<{ tree: AuthoringNode[] }>("/api/authoring")`. Loading → two-column skeleton; error → destructive Alert with Retry (calls bumpRefresh).
  * Header card with ilm-pattern background, PenSquare icon, ilm-gradient-text title, and a dynamic breadcrumb (nodePath(tree, selectedId)) that appears once a node is selected.
  * Two-panel layout: `grid-cols-1 lg:grid-cols-[320px_1fr]`.
  * LEFT — TreePanel (Card, sticky on lg): Collapsible recursive TreeRow component (4 levels: track→course→chapter→lesson). Each row has a chevron toggle (auto-open at depth 0), a NodeIcon (FolderTree/BookOpen/Layers/FileText, emerald/amber/teal/foreground colored), the title, an inline MadhabPill on tracks, and a set of secondary badges (lessonCount, citedUnitCount with Quote icon, exerciseCount with ListChecks icon, difficulty pill on courses). Selected row gets `bg-primary/10 ring-1 ring-primary/40`. Scroll area: `max-h-[70vh] overflow-y-auto ilm-scroll`.
  * RIGHT — AnimatePresence(mode=wait) panel that switches on the selected node's type:
      · nothing selected → CreateTrackCard (POST /api/authoring/tracks) with title / madhabScope Select / accent color Select / icon Select / description Textarea.
      · track selected → TrackDetailCard: inline editable form (PATCH /api/authoring/tracks/[id]), "Add course" Dialog (POST /api/authoring/courses with trackId/title/difficulty/description), "Delete track" AlertDialog confirm (DELETE) with destructive styling.
      · course selected → CourseDetailCard: details header (difficulty pill + chapter/lesson counts), list of child chapters, "Add chapter" Dialog (POST /api/authoring/chapters with courseId/title).
      · chapter selected → ChapterDetailCard: list of child lessons (with citedUnitCount/exerciseCount badges), "Add lesson" Dialog (POST /api/authoring/lessons with chapterId/title/contentBody/summary/estimatedMin/citedTextUnitIds). Cited TextUnit picker is a scrollable Checkbox list (max-h-64, ilm-scroll) populated from `useApi<{units:TextUnitDto[]}>("/api/library")` (reviewed units only by default) — each row shows bookTitle + mono locator + translation snippet.
      · lesson selected → LessonDetailCard: shows citedUnitCount/exerciseCount summary, "Add exercise" Dialog (POST /api/authoring/exercises with lessonId/type/prompt/payload/xpReward/difficulty/sourceTextUnitId). Type select (mcq/fill_blank/ordering/matching) drives a per-type JSON payload placeholder (PAYLOAD_PLACEHOLDERS); payload validated via JSON.parse with toast on syntax error; source TextUnit selected from the reviewed-units list via Select.
  * Every mutation: bumpRefresh() + toast.success / toast.error. All Dialog/AlertDialog bodies stay scrollable on small screens.
- Wrote /home/z/my-project/src/components/views/my-reviews-view.tsx ("use client", named export MyReviewsView):
  * Role gate: AccessDenied Card for non-scholar (API also enforces reviewer-only).
  * Fetches `useApi<{ items: MyReviewItem[] }>("/api/review/my-reviews")`.
  * Header card (ilm-pattern, History icon, ilm-gradient-text title, descriptive subtitle "A full audit trail of every TextUnit you have reviewed — for accountability.") + a "Open Review Queue" outline button → setView('review').
  * 3-card stats strip (Total reviewed / Approved / Rejected) with tinted icon chips.
  * Tabs filter (All / Approved / Rejected) with per-tab count badges and a "Showing X of Y" subtitle. Filter logic is a useMemo over items by status field (published → approved, rejected → rejected).
  * Scrollable list `max-h-[70vh] overflow-y-auto ilm-scroll` of ReviewItemCard, each with framer-motion stagger (delay capped at 0.2s). Card shows: bookTitle + status badge (published→emerald Approved with CheckCircle2, rejected→rose Rejected with XCircle); optional AI-assisted badge (amber, Bot icon); mono locator (MapPin); ArabicText with `line-clamp-2`; translation snippet (line-clamp-3, muted); GradeBadge; reviewedAt formatted via toLocaleDateString; reviewNotes (if present) in a muted dashed box with StickyNote icon.
  * Empty state (items.length===0): friendly Card with Inbox icon + descriptive text + Button → setView('review'). Filter-empty state: muted "No items match this filter." dashed box.
  * Loading skeleton + destructive Alert on error.
- Typechecked with `bunx tsc --noEmit`: ZERO errors in authoring-view.tsx or my-reviews-view.tsx (only pre-existing errors in .next/dev/types/validator.ts for the lessons PATCH route type mismatch, examples/websocket, skills/* — all outside this task's scope).
- Linted both files with `bunx eslint`: clean (exit 0, no warnings).

Stage Summary:
- Two production-ready client view components delivered, type-clean and lint-clean, fully wired to the existing shared infra (store, useApi, apiFetch, shadcn new-york, framer-motion, sonner, ArabicText/GradeBadge ilm components) without modifying any other file.
- AuthoringView implements spec §8 "Content Authoring": a scholar-only two-panel tool for building/editing the Track→Course→Chapter→Lesson→Exercise tree, with cited TextUnit multi-select grounded in reviewed library units (spec §4), exercise payloads with per-type JSON shapes, and proper CRUD (POST/PATCH/DELETE) against the existing /api/authoring/* routes.
- MyReviewsView implements spec §8 "My Reviews": a scholar audit trail with status-aware filtering, stats, AI-assisted flag, and full per-item provenance (book/locator/grade/reviewNotes/reviewedAt).
- Both views are responsive, dark-mode aware (emerald+gold semantic tokens via shadcn primitives), and use framer-motion for panel/list transitions.

---
Task ID: F1-F9 (Follow-up Build)
Agent: orchestrator (main)
Task: Complete follow-up build — 9 features extending the ILM platform.

Work Log:
- Schema: extended UserProfile with onboarded, interests, rtlOverride, dailyReminder*, streakAlertsEnabled, preferredTranslations. Re-pushed.
- Seed: added Sunni secondary track (Sahih al-Bukhari book + TextUnit + track/course/lesson/exercise); set student onboarded=true + interests; assigned reviewedBy=scholar for My Reviews audit trail.
- APIs: /api/search (global TextUnits+Courses+Tracks), /api/notes (CRUD), /api/bookmarks (CRUD), /api/review/my-reviews (audit trail), /api/authoring (tree + CRUD for tracks/courses/chapters/lessons/exercises), extended /api/profile/settings (madhab, language, interests, onboarded, rtlOverride, dailyReminder*, streakAlerts), extended /api/me (reviewer stats + settings fields).
- Store: added searchOpen, userMadhab; View type extended with achievements/notes/settings/authoring/my-reviews/onboarding.
- Shared components: MadhabBadge (blue for Sunni per spec), CitationStrip+Modal (tap to expand full TextUnit), CommandPalette (Cmd+K global search), ActivityHeatmap (reusable), DailyGoalRing.
- AppShell rewrite: student nav (Dashboard/Library/Tracks/Learn/Profile/Achievements/Notes/Leaderboard + Settings), scholar nav entirely swapped (Review Queue/Content Authoring/Library/My Reviews), global search in header, onboarding gate, reviewer stats card for scholar, theme toggle moved to Settings.
- Dashboard: added activity heatmap (17 weeks) + daily goal widget with progress ring.
- LearnView: added CitationStrip under lesson title (tap opens full TextUnit modal).
- TracksView: madhab pills on course cards (green Shia / blue Sunni).
- Delegated 6 new views to 3 parallel subagents: Achievements+Notes, Settings+Onboarding, Authoring+MyReviews — all typecheck+lint clean.
- Agent Browser end-to-end verification (all PASS):
  1. Student nav: all 8 items + Settings + Search present.
  2. Dashboard: heatmap (124 cells) + daily goal widget visible.
  3. Achievements: 3/8 badges, 0/3 medals, All/Earned/Locked filter, rarity labels, locked criteria.
  4. Notes: 3 bookmarks grouped by book, Jump-to-lesson, edit/delete.
  5. Settings: 7 sections (Language/Madhab/Privacy/Notifications/Streak/Appearance/Onboarding), madhab switch works.
  6. Global search (Cmd+K): grouped results (Tracks/Courses/TextUnits) with madhab+grade badges.
  7. Scholar mode: nav entirely swapped, reviewer stats card (10 reviewed, 10 approved).
  8. Content Authoring: curriculum tree (4 tracks, 4 courses), CRUD forms.
  9. My Reviews: 10-item audit trail, All/Approved/Rejected filter.
  10. Citation strip: present under lesson title, tap opens full TextUnit modal (Arabic+grade+reference).
  11. Madhab tags: green SHIA / blue SUNNI pills on track + course cards.
  12. Onboarding: 4-step flow (Welcome→Madhab→Language→Interests→Finish) completes to Dashboard.
- Dev log: 43 requests all 200, zero errors. Lint exit 0. Typecheck zero src errors.

Stage Summary:
- All 9 follow-up features complete and browser-verified. Platform now has full student+scholar navigation, achievements, notes, settings, onboarding, global search, citation strips, madhab indicators, content authoring, and review audit trail.

---
Task ID: AUTH+FOLLOWUP
Agent: orchestrator (main)
Task: Login page, complete profile (edit dialog), developer credit.

Work Log:
- Store: added auth state (isAuthenticated, login/logout) with localStorage persistence; initial view respects role (scholar→review, student→dashboard).
- API: extended /api/profile/settings PATCH to accept displayName + avatar (User-level fields).
- LoginView: full-screen branded login with hero panel (Arabic hadith, feature list), quick demo access (Student/Scholar buttons), email/password form with show/hide password, sign-in/sign-up toggle. Footer credit "Built by Fahad Hussain · Developer" with link to https://fahadai.netlify.app/.
- AppShell: auth gate at top (if !isAuthenticated → LoginView); fixed React Hooks order (all hooks before conditional returns); added Sign out button in sidebar footer; added "Built by Fahad Hussain · Developer" credit to main footer.
- ProfileView: added EditProfileDialog (display name edit with live initials preview, PATCH /api/profile/settings, toast feedback, bumpRefresh); added Edit Profile + Sign out buttons in profile header.
- Agent Browser verification (all PASS):
  1. Login page renders: hero panel, Arabic hadith, quick demo access, email/password form.
  2. Quick Student login → Dashboard, sidebar profile, footer credit.
  3. Sign out → back to login page.
  4. Email/password login as scholar (reviewer@ilm.dev) → Scholar Review Queue.
  5. Login persists across page reload (localStorage).
  6. Scholar starts on Review Queue, Student on Dashboard (role-aware initial view).
  7. Edit Profile dialog: opens, changes display name, saves, toast "Profile updated.", name updates live.
  8. Footer credit "Built by Fahad Hussain · Developer" with link on both login page and main app.
  9. Sign out button in sidebar footer + profile header.
- Dev log: 40 requests all 200, zero errors. Lint exit 0. Typecheck zero src errors.

Stage Summary:
- Login page, complete profile (edit dialog + sign out), and developer credit all built and browser-verified.

---
Task ID: INDIVIDUAL-PROFILES
Agent: orchestrator (main)
Task: Real individual profiles — each student has their own account, XP, progress, bookmarks.

Work Log:
- Schema: added `password String?` to User model (hashed SHA-256+salt); re-pushed.
- Auth utility: src/lib/auth.ts (hashPassword, verifyPassword).
- Auth API: POST /api/auth/register (creates new User + fresh UserProfile with xp=0, onboarded=false → triggers onboarding); POST /api/auth/login (validates email+password against DB, demo accounts with null password accept any).
- Store: changed from storing `role` string to storing real `userId` (persisted in localStorage); login(userId, role) takes the actual DB user ID; setRole preserves userId.
- apiFetch + useApi: send `userId ?? role` as x-ilm-user header (real user ID for authenticated users, falls back to role string for legacy).
- LoginView: rewritten to call real auth API — register mode creates a new account (name + email + password), login mode validates credentials; quick demo buttons call /api/auth/login with seeded demo emails.
- LearnView: added auto-resolve — when activeCourseId is set without activeLessonId, fetches /api/tracks and opens the course's first lesson automatically.
- Tracks API: extended to include chapter/lesson IDs in the response so LearnView can resolve.
- Agent Browser end-to-end verification:
  1. Register "Bilal Ahmed" (bilal@test.com) → new account created → onboarding triggered.
  2. Complete onboarding → Dashboard with 0 XP, Level 1, no badges, no progress.
  3. Go to Tracks → Start course (Virtues & Manners of Knowledge) → LearnView auto-resolves first lesson.
  4. Answer MCQ correctly → "+10 XP" toast → sidebar updates to 10 XP.
  5. API verification: Bilal (10 XP, Lv1, streak 1) vs Talib demo (285 XP, Lv2, streak 6) — completely separate profiles.
  6. Logout → login page → login with Bilal's credentials → profile persists (10 XP).
  7. Each user's data is isolated: XP, streaks, badges, progress, bookmarks, notes.
- Lint exit 0, typecheck zero errors, 51 requests all 200, zero runtime errors.

Stage Summary:
- Real individual profiles complete. Each registration creates a fresh user with their own XP/progress/badges. Login validates against the DB. Multiple users have completely isolated data.
