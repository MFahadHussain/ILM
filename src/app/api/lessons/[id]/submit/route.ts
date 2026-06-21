import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { checkAnswer, getLevelFromXp, xpForExercise, updateStreak, evaluateBadge, todayKey, type BadgeEvalContext } from "@/lib/gamification";
import { loadProfile } from "@/lib/profile";

const BOOK_SLUGS: Record<string, string> = {
  "Nahj al-Balagha": "nhb",
  "Al-Kafi": "kf",
  "Tafsir al-Mizan": "miz",
  "Al-Sahifa al-Sajjadiya": "sf",
  "Bihar al-Anwar": "bihar",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lessonId } = await params;
  const user = await getCurrentUser(req);
  if (!user || !user.profile) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { exerciseId, answer } = body as { exerciseId?: string; answer?: string };
  if (!exerciseId || answer === undefined) {
    return NextResponse.json({ error: "exerciseId and answer required" }, { status: 400 });
  }

  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    include: { sourceTextUnit: { include: { book: true } } },
  });
  if (!exercise || exercise.lessonId !== lessonId || exercise.status !== "published") {
    return NextResponse.json({ error: "exercise not available" }, { status: 404 });
  }

  const isCorrect = checkAnswer(exercise.type, JSON.parse(exercise.payload), answer);

  // ---- diminishing returns: count today's attempts on this exercise ----
  const todayStart = new Date(todayKey() + "T00:00:00Z");
  const todayAttempts = await db.answerSubmission.count({
    where: { userId: user.id, exerciseId, createdAt: { gte: todayStart } },
  });
  // already correct before? no XP for re-correcting the same exercise
  const alreadyCorrect = await db.answerSubmission.findFirst({
    where: { userId: user.id, exerciseId, isCorrect: true },
    select: { id: true },
  });

  const xpAwarded = isCorrect && !alreadyCorrect ? xpForExercise(exercise.xpReward, todayAttempts) : 0;

  await db.answerSubmission.create({
    data: {
      userId: user.id,
      exerciseId,
      answer: String(answer),
      isCorrect,
      xpAwarded,
    },
  });

  let newTotalXp = user.profile.xp;
  let leveledUp = false;
  let newLevel = user.profile.level;
  const prevLevel = user.profile.level;

  if (isCorrect && xpAwarded > 0) {
    newTotalXp = user.profile.xp + xpAwarded;
    const newLevelInfo = getLevelFromXp(newTotalXp);
    newLevel = newLevelInfo.level;
    leveledUp = newLevel > prevLevel;

    // ---- streak update ----
    const tk = todayKey();
    const streakRes = updateStreak(
      user.profile.streakCount,
      user.profile.streakFreezeCount,
      user.profile.longestStreak,
      user.profile.lastActivityDate,
      tk
    );

    await db.userProfile.update({
      where: { userId: user.id },
      data: {
        xp: newTotalXp,
        level: newLevel,
        streakCount: streakRes.streakCount,
        streakFreezeCount: streakRes.streakFreezeCount,
        longestStreak: streakRes.longestStreak,
        lastActivityDate: tk,
      },
    });

    // ---- activity log upsert ----
    await db.activityLog.upsert({
      where: { userId_dateKey: { userId: user.id, dateKey: tk } },
      create: { userId: user.id, dateKey: tk, xpGained: xpAwarded, exercises: 1, lessons: 0 },
      update: { xpGained: { increment: xpAwarded }, exercises: { increment: 1 } },
    });
  }

  // ---- lesson completion check ----
  const lessonExercises = await db.exercise.findMany({
    where: { lessonId, status: "published" },
    select: { id: true },
  });
  const correctSubs = await db.answerSubmission.findMany({
    where: { userId: user.id, exerciseId: { in: lessonExercises.map((e) => e.id) }, isCorrect: true },
    select: { exerciseId: true },
  });
  const correctSet = new Set(correctSubs.map((s) => s.exerciseId));
  const allDone = lessonExercises.length > 0 && lessonExercises.every((e) => correctSet.has(e.id));

  let lessonCompleted = false;
  let lessonXpEarned = 0;
  if (allDone) {
    const existing = await db.progressRecord.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } },
    });
    if (!existing || existing.status !== "completed") {
      lessonXpEarned = 25; // completion bonus
      const score = Math.round((correctSet.size / lessonExercises.length) * 100);
      await db.progressRecord.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        create: { userId: user.id, lessonId, status: "completed", score, xpEarned: lessonXpEarned, completedAt: new Date() },
        update: { status: "completed", score, xpEarned: lessonXpEarned, completedAt: new Date() },
      });
      lessonCompleted = true;
      if (lessonXpEarned > 0) {
        newTotalXp += lessonXpEarned;
        const tk = todayKey();
        await db.userProfile.update({ where: { userId: user.id }, data: { xp: newTotalXp } });
        await db.activityLog.upsert({
          where: { userId_dateKey: { userId: user.id, dateKey: tk } },
          create: { userId: user.id, dateKey: tk, xpGained: lessonXpEarned, exercises: 0, lessons: 1 },
          update: { xpGained: { increment: lessonXpEarned }, lessons: { increment: 1 } },
        });
        const li = getLevelFromXp(newTotalXp);
        newLevel = li.level;
        leveledUp = li.level > prevLevel;
      }
    }
  }

  // ---- badge re-evaluation ----
  const profile = await loadProfile(user.id);
  const earnedBadgeIds = new Set((await db.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true } })).map((b) => b.badgeId));

  const completedLessonRows = await db.progressRecord.findMany({
    where: { userId: user.id, lessonId: { not: null }, status: "completed" },
    select: { lessonId: true },
  });
  const completedLessonIds = completedLessonRows.map((r) => r.lessonId!);
  const startedCourseRows = await db.progressRecord.findMany({ where: { userId: user.id, courseId: { not: null } }, select: { courseId: true } });
  const startedCourseIds = startedCourseRows.map((r) => r.courseId!);
  const completedCourseRows = await db.progressRecord.findMany({ where: { userId: user.id, courseId: { not: null }, status: "completed" }, select: { courseId: true } });
  const completedCourseIds = completedCourseRows.map((r) => r.courseId!);

  const distinctCorrect = await db.answerSubmission.findMany({
    where: { userId: user.id, isCorrect: true },
    select: { exerciseId: true },
    distinct: ["exerciseId"],
  });
  const daifExercises = await db.exercise.findMany({
    where: { sourceTextUnit: { authenticityGrade: "Da'if" } },
    select: { id: true },
  });
  const daifIds = new Set(daifExercises.map((e) => e.id));
  const correctDaif = distinctCorrect.filter((s) => daifIds.has(s.exerciseId)).length;

  const studiedUnits = await db.lessonTextUnit.findMany({
    where: { lessonId: { in: completedLessonIds } },
    include: { textUnit: { include: { book: true } } },
  });
  const studiedBookUnits: Record<string, number> = {};
  for (const lu of studiedUnits) {
    const slug = BOOK_SLUGS[lu.textUnit.book.title] ?? "other";
    studiedBookUnits[slug] = (studiedBookUnits[slug] ?? 0) + 1;
  }

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const weekKey = weekAgo.toISOString().slice(0, 10);
  const weeklyXp = (profile?.activity ?? []).filter((a) => a.dateKey >= weekKey).reduce((n, a) => n + a.xpGained, 0);

  const ctx: BadgeEvalContext = {
    completedLessonIds,
    startedCourseIds,
    completedCourseIds,
    streakCount: profile?.streakCount ?? 0,
    distinctCorrectExercises: distinctCorrect.length,
    correctDaifExercises: correctDaif,
    studiedBookUnits,
    weeklyXp,
  };

  const allBadges = await db.badgeCatalog.findMany();
  const newlyEarned: { name: string; slug: string; icon: string; rarity: string }[] = [];
  for (const b of allBadges) {
    if (earnedBadgeIds.has(b.id)) continue;
    let passes = evaluateBadge(b.criteriaRule, ctx);
    if (!passes && b.criteriaRule.startsWith("track_done:")) {
      const trackId = b.criteriaRule.slice("track_done:".length);
      const trackCourses = await db.course.count({ where: { trackId } });
      const doneInTrack = await db.progressRecord.count({
        where: { userId: user.id, courseId: { not: null }, status: "completed", course: { trackId } },
      });
      passes = trackCourses > 0 && doneInTrack >= trackCourses;
    }
    if (passes) {
      await db.userBadge.create({ data: { userId: user.id, badgeId: b.id } });
      newlyEarned.push({ name: b.name, slug: b.slug, icon: b.icon, rarity: b.rarity });
    }
  }

  return NextResponse.json({
    isCorrect,
    xpAwarded,
    newTotalXp,
    newLevel,
    leveledUp,
    newBadges: newlyEarned,
    lessonCompleted,
    lessonXpEarned,
    correctCount: correctSet.size,
    totalExercises: lessonExercises.length,
  });
}
