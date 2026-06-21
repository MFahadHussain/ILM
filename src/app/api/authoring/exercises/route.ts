import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Create an exercise linked to a reviewed source TextUnit (answer key).
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { lessonId, type, prompt, payload, xpReward, difficulty, sourceTextUnitId } = body as {
    lessonId?: string; type?: string; prompt?: string; payload?: object;
    xpReward?: number; difficulty?: string; sourceTextUnitId?: string;
  };
  if (!lessonId || !prompt?.trim() || !type) {
    return NextResponse.json({ error: "lessonId, type, prompt required" }, { status: 400 });
  }
  // validate source is reviewed if provided
  let sourceId: string | undefined = sourceTextUnitId;
  if (sourceId) {
    const u = await db.textUnit.findUnique({ where: { id: sourceId } });
    if (!u?.isReviewed) {
      return NextResponse.json({ error: "source TextUnit must be reviewed" }, { status: 422 });
    }
  }
  const order = await db.exercise.count({ where: { lessonId } });
  const exercise = await db.exercise.create({
    data: {
      lessonId,
      type,
      prompt: prompt.trim(),
      payload: JSON.stringify(payload ?? {}),
      xpReward: xpReward ?? 10,
      difficulty: difficulty ?? "beginner",
      sourceTextUnitId: sourceId ?? null,
      status: "published", // scholar-authored exercises are published directly
      order,
    },
  });
  return NextResponse.json({ exercise });
}
