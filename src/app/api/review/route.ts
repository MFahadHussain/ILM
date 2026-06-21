import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Reviewer-only: list TextUnits awaiting scholarly review.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const units = await db.textUnit.findMany({
    where: { isReviewed: false, status: { in: ["draft", "in_review"] } },
    include: { book: true, topicTags: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    units: units.map((u) => ({
      id: u.id,
      locator: u.locator,
      bookTitle: u.book.title,
      arabicText: u.arabicText,
      translationText: u.translationText,
      authenticityGrade: u.authenticityGrade,
      gradeReference: u.gradeReference,
      chainOfNarration: u.chainOfNarration,
      topicTags: u.topicTags.map((t) => t.name),
      status: u.status,
    })),
  });
}
