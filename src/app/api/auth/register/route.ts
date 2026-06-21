import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// Register a new student account. Each registrant gets a FRESH profile —
// their own XP, streaks, badges, progress, bookmarks, and notes.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password, name } = body as {
    email?: string;
    password?: string;
    name?: string;
  };

  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedName = name?.trim();

  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }
  if (!trimmedName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      email: trimmedEmail,
      name: trimmedName,
      password: hashPassword(password),
      role: "student",
      madhab: "shia",
      profile: {
        create: {
          displayName: trimmedName,
          xp: 0,
          level: 1,
          streakCount: 0,
          streakFreezeCount: 3,
          onboarded: false, // triggers the onboarding flow
        },
      },
    },
    include: { profile: true },
  });

  return NextResponse.json({
    userId: user.id,
    role: user.role,
    displayName: user.profile?.displayName ?? user.name,
  });
}
