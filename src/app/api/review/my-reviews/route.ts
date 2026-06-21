import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { MyReviewItem } from "@/lib/types";

// Audit trail: TextUnits this scholar has reviewed (approved or rejected).
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const units = await db.textUnit.findMany({
    where: { reviewedBy: user.id },
    include: { book: true },
    orderBy: { reviewedAt: "desc" },
  });
  const items: MyReviewItem[] = units.map((u) => ({
    id: u.id,
    locator: u.locator,
    bookTitle: u.book.title,
    arabicText: u.arabicText,
    translationSnippet: u.translationText.slice(0, 140),
    status: u.status,
    authenticityGrade: u.authenticityGrade,
    reviewNotes: u.reviewNotes,
    reviewedAt: u.reviewedAt?.toISOString() ?? "",
    aiAssisted: u.aiAssisted,
  }));
  return NextResponse.json({ items });
}
