import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Approve / reject a TextUnit. Approving flips is_reviewed and publishes it
// so it becomes available to students. This is the human scholarly gate.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { action, reviewNotes, grade, gradeReference } = body as {
    action: "approve" | "reject";
    reviewNotes?: string;
    grade?: string;
    gradeReference?: string;
  };
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const unit = await db.textUnit.findUnique({ where: { id } });
  if (!unit) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await db.textUnit.update({
    where: { id },
    data: {
      isReviewed: action === "approve",
      status: action === "approve" ? "published" : "rejected",
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes ?? null,
      ...(grade ? { authenticityGrade: grade } : {}),
      ...(gradeReference ? { gradeReference } : {}),
    },
  });

  // refresh book stats
  const total = await db.textUnit.count({ where: { bookId: unit.bookId } });
  const reviewed = await db.textUnit.count({ where: { bookId: unit.bookId, isReviewed: true } });
  await db.book.update({ where: { id: unit.bookId }, data: { totalUnits: total, reviewedUnits: reviewed } });

  return NextResponse.json({ ok: true, unit: updated });
}
