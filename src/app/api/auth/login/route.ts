import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";

// Validate credentials and return the userId. The client stores this and sends
// it as the x-ilm-user header on every subsequent request.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };

  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: trimmedEmail },
    include: { profile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
  }

  // Demo accounts (seeded without a password) accept any password.
  // Real registered accounts require a correct password.
  if (user.password !== null && !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  return NextResponse.json({
    userId: user.id,
    role: user.role,
    displayName: user.profile?.displayName ?? user.name,
  });
}
