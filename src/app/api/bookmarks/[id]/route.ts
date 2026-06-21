import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  await db.bookmark.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
