import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SearchResult } from "@/lib/types";

// Global search across TextUnits, Courses, and Tracks — grouped by type.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json<SearchResult>({ textUnits: [], courses: [], tracks: [] });
  }

  const [textUnits, tracks] = await Promise.all([
    db.textUnit.findMany({
      where: {
        isReviewed: true,
        OR: [
          { arabicText: { contains: q } },
          { translationText: { contains: q } },
          { locator: { contains: q } },
          { transliteration: { contains: q } },
        ],
      },
      include: { book: true },
      take: 8,
    }),
    db.track.findMany({
      where: { title: { contains: q } },
      take: 5,
    }),
  ]);

  const courses = await db.course.findMany({
    where: { title: { contains: q } },
    include: { track: true },
    take: 5,
  });

  const result: SearchResult = {
    textUnits: textUnits.map((u) => ({
      id: u.id,
      locator: u.locator,
      bookTitle: u.book.title,
      arabicText: u.arabicText,
      translationSnippet: u.translationText.slice(0, 100),
      grade: u.authenticityGrade,
      madhabScope: u.madhabScope,
    })),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      trackTitle: c.track.title,
      difficulty: c.difficulty,
      madhabScope: c.track.madhabScope,
    })),
    tracks: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      madhabScope: t.madhabScope,
      description: t.description,
    })),
  };
  return NextResponse.json(result);
}
