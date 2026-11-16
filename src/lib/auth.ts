import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE = "bs_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(brokerId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { id, brokerId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id } });
  jar.delete(COOKIE);
}

export async function currentBroker() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const session = await db.session.findUnique({ where: { id }, include: { broker: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.broker;
}

export async function requireBroker() {
  const broker = await currentBroker();
  if (!broker) redirect("/login");
  return broker;
}
