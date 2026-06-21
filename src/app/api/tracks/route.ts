import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const tracks = await db.track.findMany({
    orderBy: { order: "asc" },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: { chapters: { include: { lessons: true } } },
      },
    },
  });

  const dtos = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    madhabScope: t.madhabScope,
    description: t.description,
    icon: t.icon,
    color: t.color,
    order: t.order,
    courses: t.courses.map((c) => ({
      id: c.id,
      trackId: t.id,
      trackTitle: t.title,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty,
      order: c.order,
      estimatedHours: c.estimatedHours,
      coverColor: c.coverColor,
      prerequisiteIds: c.prerequisiteIds,
      chapterCount: c.chapters.length,
      lessonCount: c.chapters.reduce((n, ch) => n + ch.lessons.length, 0),
      // Include lesson ids so the Learn view can resolve the first lesson
      chapters: c.chapters
        .sort((a, b) => a.order - b.order)
        .map((ch) => ({
          id: ch.id,
          title: ch.title,
          order: ch.order,
          lessons: ch.lessons
            .sort((a, b) => a.order - b.order)
            .map((l) => ({ id: l.id, title: l.title, order: l.order })),
        })),
    })),
  }));

  return NextResponse.json({ tracks: dtos });
}
