// ILM gamification engine — in-theme level names, streak logic, badge evaluation.
// Tuned to reward consistency & correctness, never compulsive grinding.

import type { LevelInfo } from "./types";

// ---------------------------------------------------------------------------
// LEVELS — in-theme names instead of "Level 1/2/3" (per spec §5).
// ---------------------------------------------------------------------------
export interface LevelDef {
  level: number;
  title: string; // English
  titleArabic: string; // transliteration of an Arabic scholastic rank
  minXp: number;
}

// Ascending scholastic ranks in the Shia tradition of learning.
export const LEVELS: LevelDef[] = [
  { level: 1, title: "Seeker", titleArabic: "Ṭālib", minXp: 0 },
  { level: 2, title: "Student", titleArabic: "Mutaʿallim", minXp: 150 },
  { level: 3, title: "Aspirant", titleArabic: "Rāghib", minXp: 400 },
  { level: 4, title: "Wayfarer", titleArabic: "Sālik", minXp: 800 },
  { level: 5, title: "Teacher", titleArabic: "Muʿallim", minXp: 1400 },
  { level: 6, title: "Jurist", titleArabic: "Faqīh", minXp: 2200 },
  { level: 7, title: "Scholar", titleArabic: "ʿĀlim", minXp: 3200 },
  { level: 8, title: "Sage", titleArabic: "Ḥakīm", minXp: 4500 },
  { level: 9, title: "Gnostic", titleArabic: "ʿĀrif", minXp: 6000 },
  { level: 10, title: "Pole of Knowledge", titleArabic: "Quṭb al-ʿIlm", minXp: 8500 },
];

export const MAX_LEVEL = LEVELS.length;

export function getLevelFromXp(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) idx = i;
    else break;
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next
    ? Math.round(
        ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
      )
    : 100;
  return {
    level: current.level,
    title: current.title,
    titleArabic: current.titleArabic,
    minXp: current.minXp,
    nextXp: next ? next.minXp : null,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

// ---------------------------------------------------------------------------
// STREAKS — humane, not predatory. Limited monthly freeze tokens.
// ---------------------------------------------------------------------------
export const MAX_FREEZES_PER_MONTH = 3;

export interface StreakUpdate {
  streakCount: number;
  streakFreezeCount: number;
  longestStreak: number;
  usedFreeze: boolean;
}

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayDiff(aKey: string, bKey: string): number {
  const a = new Date(aKey + "T00:00:00Z").getTime();
  const b = new Date(bKey + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Compute the new streak given the previous last-activity date.
 * - same day: unchanged (no double counting)
 * - exactly 1 day gap: +1
 * - 2-day gap with a freeze available: consume a freeze, +1
 * - larger gap (or no freezes left): reset to 1
 */
export function updateStreak(
  prevStreak: number,
  prevFreezes: number,
  longestStreak: number,
  lastActivityKey: string | null,
  nowKey: string = todayKey()
): StreakUpdate {
  if (!lastActivityKey) {
    return {
      streakCount: 1,
      streakFreezeCount: prevFreezes,
      longestStreak: Math.max(longestStreak, 1),
      usedFreeze: false,
    };
  }
  if (lastActivityKey === nowKey) {
    // already active today — no change
    return {
      streakCount: Math.max(prevStreak, 1),
      streakFreezeCount: prevFreezes,
      longestStreak,
      usedFreeze: false,
    };
  }
  const diff = dayDiff(lastActivityKey, nowKey);
  if (diff === 1) {
    const s = prevStreak + 1;
    return {
      streakCount: s,
      streakFreezeCount: prevFreezes,
      longestStreak: Math.max(longestStreak, s),
      usedFreeze: false,
    };
  }
  if (diff === 2 && prevFreezes > 0) {
    const s = prevStreak + 1;
    return {
      streakCount: s,
      streakFreezeCount: prevFreezes - 1,
      longestStreak: Math.max(longestStreak, s),
      usedFreeze: true,
    };
  }
  // reset
  return {
    streakCount: 1,
    streakFreezeCount: prevFreezes,
    longestStreak,
    usedFreeze: false,
  };
}

// ---------------------------------------------------------------------------
// XP RULES — diminishing returns on retries to discourage grinding.
// ---------------------------------------------------------------------------
export function xpForExercise(
  baseXp: number,
  attemptsToday: number
): number {
  if (attemptsToday <= 0) return baseXp;
  // first retry full, subsequent retries halved, min 1
  if (attemptsToday === 1) return baseXp;
  return Math.max(1, Math.floor(baseXp / Math.pow(2, attemptsToday - 1)));
}

// ---------------------------------------------------------------------------
// BADGE CRITERIA EVALUATION (server-side, rule-based).
// Rule keys (from BadgeCatalog.criteriaRule):
//   first_lesson, streak_7, streak_30, identify_daif, perfect_5,
//   lesson:<lessonId>, course_start:<courseId>, course_done:<courseId>,
//   book_3:<bookSlug>, weekly_xp_500
// ---------------------------------------------------------------------------
export interface BadgeEvalContext {
  completedLessonIds: string[];
  startedCourseIds: string[];
  completedCourseIds: string[];
  streakCount: number;
  distinctCorrectExercises: number;
  correctDaifExercises: number; // exercises whose source is graded Da'if, answered correctly
  studiedBookUnits: Record<string, number>; // bookSlug -> count of cited units studied
  weeklyXp: number;
}

export function evaluateBadge(
  rule: string,
  ctx: BadgeEvalContext
): boolean {
  if (rule === "first_lesson") return ctx.completedLessonIds.length >= 1;
  if (rule === "streak_7") return ctx.streakCount >= 7;
  if (rule === "streak_30") return ctx.streakCount >= 30;
  if (rule === "identify_daif") return ctx.correctDaifExercises >= 1;
  if (rule === "perfect_5") return ctx.distinctCorrectExercises >= 5;
  if (rule === "weekly_xp_500") return ctx.weeklyXp >= 500;
  if (rule.startsWith("lesson:")) {
    const id = rule.slice("lesson:".length);
    return ctx.completedLessonIds.includes(id);
  }
  if (rule.startsWith("course_start:")) {
    const id = rule.slice("course_start:".length);
    return ctx.startedCourseIds.includes(id);
  }
  if (rule.startsWith("course_done:")) {
    const id = rule.slice("course_done:".length);
    return ctx.completedCourseIds.includes(id);
  }
  if (rule.startsWith("book_3:")) {
    const slug = rule.slice("book_3:".length);
    return (ctx.studiedBookUnits[slug] ?? 0) >= 3;
  }
  if (rule.startsWith("track_done:")) {
    // handled by caller using track completion aggregate; default false here
    return false;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Answer checking (auto-graded types)
// ---------------------------------------------------------------------------
export function checkAnswer(
  type: string,
  payload: unknown,
  answer: string
): boolean {
  const p = payload as Record<string, unknown>;
  if (type === "mcq") {
    const correct = Number(p.correctIndex);
    return Number(answer) === correct;
  }
  if (type === "fill_blank") {
    const accept = (p.accept as string[]) ?? [];
    const norm = answer.trim().toLowerCase().replace(/[\u064b-\u0652]/g, "");
    return accept.some(
      (a) => a.trim().toLowerCase().replace(/[\u064b-\u0652]/g, "") === norm
    );
  }
  if (type === "ordering") {
    try {
      const order = JSON.parse(answer) as number[];
      const correct = p.correctOrder as number[];
      return (
        order.length === correct.length &&
        order.every((v, i) => v === correct[i])
      );
    } catch {
      return false;
    }
  }
  if (type === "matching") {
    try {
      const given = JSON.parse(answer) as [string, string][];
      const pairs = p.pairs as [string, string][];
      if (given.length !== pairs.length) return false;
      return pairs.every(([l, r]) => given.some(([gl, gr]) => gl === l && gr === r));
    } catch {
      return false;
    }
  }
  // short_answer — AI-assisted grading handled in API; default: queue for review
  return false;
}
