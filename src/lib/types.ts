// Shared DTO types for ILM frontend <-> API contracts.

export type View =
  | "dashboard"
  | "library"
  | "tracks"
  | "learn"
  | "profile"
  | "achievements"
  | "notes"
  | "settings"
  | "leaderboard"
  | "review"
  | "authoring"
  | "my-reviews"
  | "onboarding";

export type ExerciseType = "mcq" | "fill_blank" | "ordering" | "matching" | "short_answer";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "hawza_prep";

export type Grade = "Sahih" | "Hasan" | "Da'if" | "Muwaththaq" | "Authentic" | "Qur'an (Mutawatir)" | "Tafsir (authoritative commentary)" | "Attributed (compilation)" | "Pending review";

export interface BookDto {
  id: string;
  title: string;
  titleArabic: string | null;
  author: string;
  category: string;
  madhabScope: string;
  description: string | null;
  totalUnits: number;
  reviewedUnits: number;
}

export interface TextUnitDto {
  id: string;
  bookId: string;
  bookTitle: string;
  bookTitleArabic: string | null;
  locator: string;
  arabicText: string;
  translationText: string;
  transliteration: string | null;
  chainOfNarration: string | null;
  authenticityGrade: string;
  gradeReference: string;
  topicTags: string[];
  isReviewed: boolean;
  status: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  aiAssisted: boolean;
}

export interface ExerciseDto {
  id: string;
  lessonId: string;
  type: ExerciseType;
  prompt: string;
  payload: ExercisePayload;
  xpReward: number;
  difficulty: Difficulty;
  sourceTextUnitId: string | null;
  sourceGrade?: string;
  sourceLocator?: string;
  aiAssisted: boolean;
  order: number;
}

export type ExercisePayload =
  | { options: string[]; correctIndex: number }
  | { accept: string[] }
  | { items: string[]; correctOrder: number[] }
  | { pairs: [string, string][] };

export interface CitedTextUnitDto {
  id: string;
  locator: string;
  arabicText: string;
  translationText: string;
  transliteration: string | null;
  authenticityGrade: string;
  gradeReference: string;
  bookTitle: string;
  contextNote: string | null;
}

export interface LessonDto {
  id: string;
  chapterId: string;
  courseId: string;
  courseTitle: string;
  trackTitle: string;
  title: string;
  summary: string | null;
  contentBody: string;
  estimatedMin: number;
  order: number;
  citedUnits: CitedTextUnitDto[];
  exercises: ExerciseDto[];
}

export interface ChapterDto {
  id: string;
  title: string;
  order: number;
  lessons: { id: string; title: string; order: number; estimatedMin: number }[];
}

export interface CourseDto {
  id: string;
  trackId: string;
  trackTitle: string;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  order: number;
  estimatedHours: number;
  coverColor: string | null;
  prerequisiteIds: string | null;
  chapterCount: number;
  lessonCount: number;
}

export interface TrackDto {
  id: string;
  title: string;
  madhabScope: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  courses: CourseDto[];
}

export interface LevelInfo {
  level: number;
  title: string;
  titleArabic: string;
  minXp: number;
  nextXp: number | null;
  progress: number; // 0-100 toward next level
}

export interface BadgeDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  criteriaRule: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  icon: string;
  color: string | null;
  earned: boolean;
  earnedAt: string | null;
}

export interface MedalDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  criteriaRule: string;
  tier: "silver" | "gold" | "platinum";
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface ActivityDay {
  dateKey: string;
  xpGained: number;
  exercises: number;
  lessons: number;
}

export interface ProfileDto {
  userId: string;
  displayName: string;
  role: string;
  madhab: string;
  avatar: string | null;
  xp: number;
  level: number;
  levelInfo: LevelInfo;
  streakCount: number;
  streakFreezeCount: number;
  longestStreak: number;
  dailyGoalXp: number;
  todayXp: number;
  publicProfile: boolean;
  leaderboardOptIn: boolean;
  language: string;
  totalBadges: number;
  totalMedals: number;
  completedLessons: number;
  totalLessonsAvailable: number;
  activity: ActivityDay[];
  badges: BadgeDto[];
  medals: MedalDto[];
  bookmarks: { id: string; textUnitLocator: string | null; lessonTitle: string | null; note: string | null }[];
  // settings & onboarding (follow-up build)
  onboarded: boolean;
  interests: string[];
  rtlOverride: string | null;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string | null;
  streakAlertsEnabled: boolean;
  // scholar stats (populated when role === reviewer)
  reviewerStats?: {
    itemsReviewed: number;
    itemsApproved: number;
    itemsRejected: number;
    avgReviewHours: number | null;
    lastReviewAt: string | null;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  levelTitle: string;
  streakCount: number;
  isCurrentUser: boolean;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  xpAwarded: number;
  newTotalXp: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: { name: string; slug: string; icon: string; rarity: string }[];
  lessonCompleted: boolean;
  lessonXpEarned: number;
}

export interface ReviewQueueItem {
  id: string;
  locator: string;
  bookTitle: string;
  arabicText: string;
  translationText: string;
  authenticityGrade: string;
  gradeReference: string;
  chainOfNarration: string | null;
  topicTags: string[];
  status: string;
}

// ---------------------------------------------------------------------------
// Follow-up build DTOs
// ---------------------------------------------------------------------------

export interface NoteDto {
  id: string;
  userId: string;
  lessonId: string | null;
  lessonTitle: string | null;
  textUnitId: string | null;
  textUnitLocator: string | null;
  textUnitBookTitle: string | null;
  textUnitSnippet: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkDto {
  id: string;
  userId: string;
  textUnitId: string | null;
  textUnitLocator: string | null;
  textUnitBookTitle: string | null;
  textUnitBookId: string | null;
  textUnitSnippet: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  note: string | null;
  createdAt: string;
}

export interface SearchResult {
  textUnits: { id: string; locator: string; bookTitle: string; arabicText: string; translationSnippet: string; grade: string; madhabScope: string }[];
  courses: { id: string; title: string; trackTitle: string; difficulty: string; madhabScope: string }[];
  tracks: { id: string; title: string; madhabScope: string; description: string | null }[];
}

export interface MyReviewItem {
  id: string;
  locator: string;
  bookTitle: string;
  arabicText: string;
  translationSnippet: string;
  status: string;
  authenticityGrade: string;
  reviewNotes: string | null;
  reviewedAt: string;
  aiAssisted: boolean;
}

export interface AuthoringNode {
  id: string;
  title: string;
  type: "track" | "course" | "chapter" | "lesson";
  madhabScope?: string;
  difficulty?: string;
  order: number;
  children?: AuthoringNode[];
  lessonCount?: number;
  citedUnitCount?: number;
  exerciseCount?: number;
}
