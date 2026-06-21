import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { loadProfile, loadDashboardExtras } from "@/lib/profile";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "no user" }, { status: 404 });
  const profile = await loadProfile(user.id);
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 404 });
  const extras = await loadDashboardExtras(user.id);
  return NextResponse.json({ profile, ...extras });
}
