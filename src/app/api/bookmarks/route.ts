import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { BookmarkDto } from "@/lib/types";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id },
    include: { textUnit: { include: { book: true } }, lesson: true },
    orderBy: { createdAt: "desc" },
  });
  const dtos: BookmarkDto[] = bookmarks.map((b) => ({
    id: b.id,
    userId: b.userId,
    textUnitId: b.textUnitId,
    textUnitLocator: b.textUnit?.locator ?? null,
    textUnitBookTitle: b.textUnit?.book.title ?? null,
    textUnitBookId: b.textUnit?.bookId ?? null,
    textUnitSnippet: b.textUnit ? b.textUnit.translationText.slice(0, 160) : null,
    lessonId: b.lessonId,
    lessonTitle: b.lesson?.title ?? null,
    note: b.note,
    createdAt: b.createdAt.toISOString(),
  }));
  return NextResponse.json({ bookmarks: dtos });
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { textUnitId, lessonId, note } = body as { textUnitId?: string; lessonId?: string; note?: string };
  if (!textUnitId && !lessonId) return NextResponse.json({ error: "textUnitId or lessonId required" }, { status: 400 });
  // dedupe: if same bookmark exists, update note instead
  const existing = await db.bookmark.findFirst({ where: { userId: user.id, textUnitId: textUnitId ?? null, lessonId: lessonId ?? null } });
  if (existing) {
    const updated = await db.bookmark.update({ where: { id: existing.id }, data: { note: note ?? existing.note } });
    return NextResponse.json({ bookmark: updated });
  }
  const bookmark = await db.bookmark.create({ data: { userId: user.id, textUnitId: textUnitId ?? null, lessonId: lessonId ?? null, note } });
  return NextResponse.json({ bookmark });
}
