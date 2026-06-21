import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Reviewer: list AI-assisted DRAFT exercises awaiting publication.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const drafts = await db.exercise.findMany({
    where: { status: "draft", aiAssisted: true },
    include: { lesson: { select: { title: true } }, sourceTextUnit: { select: { locator: true, authenticityGrade: true, book: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    drafts: drafts.map((e) => ({
      id: e.id,
      type: e.type,
      prompt: e.prompt,
      payload: JSON.parse(e.payload),
      lessonTitle: e.lesson?.title ?? null,
      sourceLocator: e.sourceTextUnit?.locator ?? null,
      sourceBook: e.sourceTextUnit?.book.title ?? null,
      sourceGrade: e.sourceTextUnit?.authenticityGrade ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
