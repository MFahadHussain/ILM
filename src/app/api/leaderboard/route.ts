import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getLevelFromXp } from "@/lib/gamification";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  const currentId = user?.id ?? "";

  // Opt-in only: respect users who do not want public ranking (spec §5).
  const profiles = await db.userProfile.findMany({
    where: { leaderboardOptIn: true },
    include: { user: true },
  });

  // weekly XP from activity logs
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekKey = weekAgo.toISOString().slice(0, 10);

  const entries = await Promise.all(
    profiles.map(async (p) => {
      const act = await db.activityLog.findMany({
        where: { userId: p.userId, dateKey: { gte: weekKey } },
        select: { xpGained: true },
      });
      const weeklyXp = act.reduce((n, a) => n + a.xpGained, 0);
      return {
        userId: p.userId,
        displayName: p.displayName,
        xp: p.xp,
        level: p.level,
        levelTitle: getLevelFromXp(p.xp).title,
        streakCount: p.streakCount,
        weeklyXp,
      };
    })
  );

  // sort by total XP desc
  entries.sort((a, b) => b.xp - a.xp);
  const ranked = entries.map((e, i) => ({
    rank: i + 1,
    ...e,
    isCurrentUser: e.userId === currentId,
  }));

  return NextResponse.json({ entries: ranked });
}
