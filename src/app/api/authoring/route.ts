import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { AuthoringNode } from "@/lib/types";

// GET the full curriculum tree for the authoring tool.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const tracks = await db.track.findMany({
    orderBy: { order: "asc" },
    include: {
      courses: {
        orderBy: { order: "asc" },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: {
                  _count: { select: { citedUnits: true, exercises: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const tree: AuthoringNode[] = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    type: "track",
    madhabScope: t.madhabScope,
    order: t.order,
    children: t.courses.map((c) => ({
      id: c.id,
      title: c.title,
      type: "course" as const,
      difficulty: c.difficulty,
      order: c.order,
      lessonCount: c.chapters.reduce((n, ch) => n + ch.lessons.length, 0),
      children: c.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        type: "chapter" as const,
        order: ch.order,
        children: ch.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: "lesson" as const,
          order: l.order,
          citedUnitCount: l._count.citedUnits,
          exerciseCount: l._count.exercises,
        })),
      })),
    })),
  }));
  return NextResponse.json({ tree });
}
