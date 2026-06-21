import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { body: noteBody } = body as { body?: string };
  if (!noteBody?.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });
  const note = await db.note.updateMany({ where: { id, userId: user.id }, data: { body: noteBody.trim() } });
  if (note.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  await db.note.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
