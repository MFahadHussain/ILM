import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Update privacy / display / onboarding / madhab-track settings.
// Madhab is on the User model; everything else on UserProfile.
export async function PATCH(req: Request) {
  const user = await getCurrentUser(req);
  if (!user || !user.profile) {
    return NextResponse.json({ error: "no session" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    publicProfile, leaderboardOptIn, dailyGoalXp,
    language, rtlOverride, madhab, onboarded, interests,
    dailyReminderEnabled, dailyReminderTime, streakAlertsEnabled,
  } = body as {
    publicProfile?: boolean;
    leaderboardOptIn?: boolean;
    dailyGoalXp?: number;
    language?: string;
    rtlOverride?: string | null;
    madhab?: string;
    onboarded?: boolean;
    interests?: string[];
    dailyReminderEnabled?: boolean;
    dailyReminderTime?: string | null;
    streakAlertsEnabled?: boolean;
  };

  const profileData: Record<string, unknown> = {};
  if (typeof publicProfile === "boolean") profileData.publicProfile = publicProfile;
  if (typeof leaderboardOptIn === "boolean") profileData.leaderboardOptIn = leaderboardOptIn;
  if (typeof dailyGoalXp === "number" && dailyGoalXp > 0) profileData.dailyGoalXp = dailyGoalXp;
  if (typeof language === "string") profileData.language = language;
  if (rtlOverride !== undefined) profileData.rtlOverride = rtlOverride || null;
  if (typeof onboarded === "boolean") profileData.onboarded = onboarded;
  if (Array.isArray(interests)) profileData.interests = interests.join(",");
  if (typeof dailyReminderEnabled === "boolean") profileData.dailyReminderEnabled = dailyReminderEnabled;
  if (dailyReminderTime !== undefined) profileData.dailyReminderTime = dailyReminderTime || null;
  if (typeof streakAlertsEnabled === "boolean") profileData.streakAlertsEnabled = streakAlertsEnabled;

  // madhab lives on User — changing it re-filters the whole app
  if (typeof madhab === "string" && (madhab === "shia" || madhab === "sunni")) {
    if (user.madhab !== madhab) {
      await db.user.update({ where: { id: user.id }, data: { madhab } });
    }
  }

  if (Object.keys(profileData).length > 0) {
    await db.userProfile.update({ where: { userId: user.id }, data: profileData });
  } else if (typeof madhab !== "string") {
    return NextResponse.json({ error: "no fields" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
