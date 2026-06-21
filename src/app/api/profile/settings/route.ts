import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Update privacy / display settings (spec §7 privacy controls).
export async function PATCH(req: Request) {
  const user = await getCurrentUser(req);
  if (!user || !user.profile) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { publicProfile, leaderboardOptIn, dailyGoalXp } = body as {
    publicProfile?: boolean;
    leaderboardOptIn?: boolean;
    dailyGoalXp?: number;
  };
  const data: Record<string, unknown> = {};
  if (typeof publicProfile === "boolean") data.publicProfile = publicProfile;
  if (typeof leaderboardOptIn === "boolean") data.leaderboardOptIn = leaderboardOptIn;
  if (typeof dailyGoalXp === "number" && dailyGoalXp > 0) data.dailyGoalXp = dailyGoalXp;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }
  await db.userProfile.update({ where: { userId: user.id }, data });
  return NextResponse.json({ ok: true });
}
