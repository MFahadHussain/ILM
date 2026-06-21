import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { trackId, title, description, difficulty } = body as {
    trackId?: string; title?: string; description?: string; difficulty?: string;
  };
  if (!trackId || !title?.trim()) return NextResponse.json({ error: "trackId and title required" }, { status: 400 });
  const order = await db.course.count({ where: { trackId } });
  const course = await db.course.create({
    data: {
      trackId,
      title: title.trim(),
      description: description ?? null,
      difficulty: difficulty ?? "beginner",
      order,
    },
  });
  return NextResponse.json({ course });
}
