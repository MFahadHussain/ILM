import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

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
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.madhabScope === "string") data.madhabScope = body.madhabScope;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "no fields" }, { status: 400 });
  await db.track.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  await db.track.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
