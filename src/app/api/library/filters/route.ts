import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Filter facet options for the Library search UI.
export async function GET() {
  const books = await db.book.findMany({ orderBy: { title: "asc" } });
  const topics = await db.topicTag.findMany({ orderBy: { name: "asc" } });
  const grades = await db.textUnit.findMany({
    where: { isReviewed: true },
    select: { authenticityGrade: true },
    distinct: ["authenticityGrade"],
  });
  return NextResponse.json({
    books: books.map((b) => ({ id: b.id, title: b.title, titleArabic: b.titleArabic, category: b.category, madhabScope: b.madhabScope, totalUnits: b.totalUnits, reviewedUnits: b.reviewedUnits })),
    topics: topics.map((t) => t.name),
    grades: grades.map((g) => g.authenticityGrade),
  });
}
