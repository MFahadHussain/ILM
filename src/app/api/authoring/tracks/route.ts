import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (user?.role !== "reviewer") {
    return NextResponse.json({ error: "reviewers only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { title, madhabScope, description, icon, color } = body as {
    title?: string; madhabScope?: string; description?: string; icon?: string; color?: string;
  };
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const order = await db.track.count();
  const track = await db.track.create({
    data: {
      title: title.trim(),
      madhabScope: madhabScope === "sunni" ? "sunni" : "shia",
      description: description ?? null,
      icon: icon ?? "BookOpen",
      color: color ?? "emerald",
      order,
    },
  });
  return NextResponse.json({ track });
}
