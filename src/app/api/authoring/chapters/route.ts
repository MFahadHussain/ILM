import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { courseId, title } = body as { courseId?: string; title?: string };
  if (!courseId || !title?.trim()) return NextResponse.json({ error: "courseId and title required" }, { status: 400 });
  const order = await db.chapter.count({ where: { courseId } });
  const chapter = await db.chapter.create({ data: { courseId, title: title.trim(), order } });
  return NextResponse.json({ chapter });
}
