import { db } from "./db";

// Demo "session" — no real auth. The client picks one of the seeded demo users
// (student or scholar) and sends its id as the `x-ilm-user` header.
// Default: the demo student.

const STUDENT_EMAIL = "talib@ilm.dev";
const SCHOLAR_EMAIL = "reviewer@ilm.dev";

export async function getCurrentUser(req: Request) {
  const header = req.headers.get("x-ilm-user");
  if (header === "scholar") {
    return db.user.findUnique({ where: { email: SCHOLAR_EMAIL }, include: { profile: true } });
  }
  if (header && header !== "student") {
    return db.user.findUnique({ where: { id: header }, include: { profile: true } });
  }
  return db.user.findUnique({ where: { email: STUDENT_EMAIL }, include: { profile: true } });
}

export async function getCurrentUserId(req: Request): Promise<string> {
  const u = await getCurrentUser(req);
  return u?.id ?? "";
}
