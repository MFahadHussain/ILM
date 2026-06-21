import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { NoteDto } from "@/lib/types";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  const notes = await db.note.findMany({
    where: { userId: user.id },
    include: { textUnit: { include: { book: true } }, lesson: true },
    orderBy: { updatedAt: "desc" },
  });
  const dtos: NoteDto[] = notes.map((n) => ({
    id: n.id,
    userId: n.userId,
    lessonId: n.lessonId,
    lessonTitle: n.lesson?.title ?? null,
    textUnitId: n.textUnitId,
    textUnitLocator: n.textUnit?.locator ?? null,
    textUnitBookTitle: n.textUnit?.book.title ?? null,
    textUnitSnippet: n.textUnit ? n.textUnit.translationText.slice(0, 120) : null,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));
  return NextResponse.json({ notes: dtos });
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { body: noteBody, textUnitId, lessonId } = body as {
    body?: string;
    textUnitId?: string;
    lessonId?: string;
  };
  if (!noteBody?.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });
  const note = await db.note.create({
    data: { userId: user.id, body: noteBody.trim(), textUnitId: textUnitId ?? null, lessonId: lessonId ?? null },
  });
  return NextResponse.json({ note });
}
