import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Publish or reject an AI-assisted draft exercise (reviewer gate).
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
  const { action } = body as { action: "publish" | "reject" };
  if (action !== "publish" && action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  const updated = await db.exercise.update({
    where: { id },
    data: { status: action === "publish" ? "published" : "draft" },
  });
  return NextResponse.json({ ok: true, status: updated.status });
}
