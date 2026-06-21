import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { LessonDto, ExerciseDto, CitedTextUnitDto, ExercisePayload } from "@/lib/types";

// REVIEW GATE enforced here: only PUBLISHED exercises are returned, and only
// REVIEWED cited TextUnits are included. A lesson is only reachable if every
// unit it cites is reviewed (authored that way); we filter defensively.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      chapter: { include: { course: { include: { track: true } } } },
      citedUnits: { include: { textUnit: { include: { book: true, topicTags: true } } } },
      exercises: { where: { status: "published" }, orderBy: { order: "asc" } },
    },
  });
  if (!lesson) return NextResponse.json({ error: "not found" }, { status: 404 });

  const citedUnits: CitedTextUnitDto[] = lesson.citedUnits
    .filter((cu) => cu.textUnit.isReviewed)
    .map((cu) => ({
      id: cu.textUnit.id,
      locator: cu.textUnit.locator,
      arabicText: cu.textUnit.arabicText,
      translationText: cu.textUnit.translationText,
      transliteration: cu.textUnit.transliteration,
      authenticityGrade: cu.textUnit.authenticityGrade,
      gradeReference: cu.textUnit.gradeReference,
      bookTitle: cu.textUnit.book.title,
      contextNote: cu.contextNote,
    }));

  const exercises: ExerciseDto[] = lesson.exercises.map((e) => ({
    id: e.id,
    lessonId: e.lessonId,
    type: e.type as ExerciseDto["type"],
    prompt: e.prompt,
    payload: JSON.parse(e.payload) as ExercisePayload,
    xpReward: e.xpReward,
    difficulty: e.difficulty as ExerciseDto["difficulty"],
    sourceTextUnitId: e.sourceTextUnitId,
    aiAssisted: e.aiAssisted,
    order: e.order,
  }));

  const dto: LessonDto = {
    id: lesson.id,
    chapterId: lesson.chapterId,
    courseId: lesson.chapter.course.id,
    courseTitle: lesson.chapter.course.title,
    trackTitle: lesson.chapter.course.track.title,
    title: lesson.title,
    summary: lesson.summary,
    contentBody: lesson.contentBody,
    estimatedMin: lesson.estimatedMin,
    order: lesson.order,
    citedUnits,
    exercises,
  };

  // also return the lesson list for the chapter (sidebar nav)
  const siblings = await db.lesson.findMany({
    where: { chapter: { courseId: lesson.chapter.course.id } },
    orderBy: [{ chapter: { order: "asc" } }, { order: "asc" }],
    include: { chapter: true },
  });

  return NextResponse.json({
    lesson: dto,
    course: {
      id: lesson.chapter.course.id,
      title: lesson.chapter.course.title,
      trackTitle: lesson.chapter.course.track.title,
      difficulty: lesson.chapter.course.difficulty,
    },
    lessons: siblings.map((l) => ({
      id: l.id,
      title: l.title,
      chapterId: l.chapterId,
      chapterTitle: l.chapter.title,
      order: l.order,
      estimatedMin: l.estimatedMin,
    })),
  });
}
