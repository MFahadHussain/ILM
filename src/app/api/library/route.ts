import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { TextUnitDto } from "@/lib/types";

// REVIEW GATE: students only ever receive isReviewed=true units.
// A reviewer (role) may see all statuses for the queue/inspection.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  const role = user?.role ?? "student";
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const bookId = url.searchParams.get("bookId") ?? undefined;
  const topic = url.searchParams.get("topic") ?? undefined;
  const grade = url.searchParams.get("grade") ?? undefined;
  const madhab = url.searchParams.get("madhab") ?? undefined;
  const includePending = url.searchParams.get("pending") === "1" && role === "reviewer";

  const where: Record<string, unknown> = {};
  if (!includePending) where.isReviewed = true;
  if (bookId) where.bookId = bookId;
  if (madhab) where.madhabScope = madhab;
  if (grade) where.authenticityGrade = grade;
  if (topic) where.topicTags = { some: { name: topic } };
  if (q) {
    where.OR = [
      { arabicText: { contains: q } },
      { translationText: { contains: q } },
      { locator: { contains: q } },
      { transliteration: { contains: q } },
    ];
  }

  const units = await db.textUnit.findMany({
    where,
    include: { book: true, topicTags: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const dtos: TextUnitDto[] = units.map((u) => ({
    id: u.id,
    bookId: u.bookId,
    bookTitle: u.book.title,
    bookTitleArabic: u.book.titleArabic,
    locator: u.locator,
    arabicText: u.arabicText,
    translationText: u.translationText,
    transliteration: u.transliteration,
    chainOfNarration: u.chainOfNarration,
    authenticityGrade: u.authenticityGrade,
    gradeReference: u.gradeReference,
    topicTags: u.topicTags.map((t) => t.name),
    isReviewed: u.isReviewed,
    status: u.status,
    reviewedAt: u.reviewedAt?.toISOString() ?? null,
    reviewNotes: u.reviewNotes,
    aiAssisted: u.aiAssisted,
  }));

  return NextResponse.json({ units: dtos });
}
