import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { chapterId, title, contentBody, summary, citedTextUnitIds, estimatedMin } = body as {
    chapterId?: string; title?: string; contentBody?: string; summary?: string;
    citedTextUnitIds?: string[]; estimatedMin?: number;
  };
  if (!chapterId || !title?.trim()) return NextResponse.json({ error: "chapterId and title required" }, { status: 400 });
  const order = await db.lesson.count({ where: { chapter: { courseId: (await db.chapter.findUnique({ where: { id: chapterId } }))?.courseId } } });
  const lesson = await db.lesson.create({
    data: {
      chapterId,
      title: title.trim(),
      contentBody: contentBody ?? "",
      summary: summary ?? null,
      estimatedMin: estimatedMin ?? 10,
      order,
    },
  });
  // cite reviewed TextUnits (only reviewed ones allowed — spec §4)
  if (Array.isArray(citedTextUnitIds) && citedTextUnitIds.length > 0) {
    const reviewed = await db.textUnit.findMany({
      where: { id: { in: citedTextUnitIds }, isReviewed: true },
      select: { id: true },
    });
    await db.lessonTextUnit.createMany({
      data: reviewed.map((u) => ({ lessonId: lesson.id, textUnitId: u.id })),
    });
  }
  return NextResponse.json({ lesson });
}

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
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.contentBody === "string") data.contentBody = body.contentBody;
  if (typeof body.summary === "string") data.summary = body.summary;
  if (typeof body.estimatedMin === "number") data.estimatedMin = body.estimatedMin;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "no fields" }, { status: 400 });
  await db.lesson.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
