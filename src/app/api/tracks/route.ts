import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TrackDto, CourseDto } from "@/lib/types";

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

  const dtos: TrackDto[] = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    madhabScope: t.madhabScope,
    description: t.description,
    icon: t.icon,
    color: t.color,
    order: t.order,
    courses: t.courses.map((c): CourseDto => ({
      id: c.id,
      trackId: t.id,
      trackTitle: t.title,
      title: c.title,
      description: c.description,
      difficulty: c.difficulty as CourseDto["difficulty"],
      order: c.order,
      estimatedHours: c.estimatedHours,
      coverColor: c.coverColor,
      prerequisiteIds: c.prerequisiteIds,
      chapterCount: c.chapters.length,
      lessonCount: c.chapters.reduce((n, ch) => n + ch.lessons.length, 0),
    })),
  }));

  return NextResponse.json({ tracks: dtos });
}
