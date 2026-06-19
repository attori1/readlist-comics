import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import db from "./db.js";

// scrypt = a memory-hard key derivation function, good for passwords.
// We store "salt:hash"; the salt is random per user.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, 64);
  // timingSafeEqual avoids leaking info through how long the compare takes
  return hashBuf.length === test.length && timingSafeEqual(hashBuf, test);
}

export type User = { id: string; email: string };

export function createUser(email: string, password: string): User {
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(id, email.toLowerCase(), hashPassword(password), new Date().toISOString());
  return { id, email: email.toLowerCase() };
}

export function findUserByEmail(email: string): any {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)")
    .run(token, userId, new Date().toISOString());
  return token;
}

export function getUserByToken(token: string): User | null {
  const row: any = db.prepare(`
    SELECT users.id, users.email FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `).get(token);
  return row ? { id: row.id, email: row.email } : null;
}

export function deleteSession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}