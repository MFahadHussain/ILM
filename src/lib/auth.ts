import crypto from "crypto";

const SALT = "ilm-platform-2024";

// Hash a password with SHA-256 + salt.
// (Adequate for a demo; a production system would use bcrypt/argon2.)
export function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + SALT).digest("hex");
}

export function verifyPassword(pw: string, hash: string | null): boolean {
  if (!hash) return false;
  return hashPassword(pw) === hash;
}
