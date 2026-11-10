import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "elonlar_user";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;
const memory = new Map<string, WebUser>();

export type WebUser = {
  id: number;
  name: string;
  lastName: string;
  phone: string;
  address: string;
};

function secret() {
  const session = process.env["ADMIN_SESSION_SECRET"];
  if (session && session.length >= 16) return session;
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (token && token.length >= 16) return token;
  return null;
}

function sign(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

function withProfile(user: WebUser): WebUser {
  return {
    id: user.id,
    name: user.name,
    lastName: user.lastName ?? "",
    phone: user.phone,
    address: user.address ?? "",
  };
}

export function readWebUser(): WebUser | null {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const key = secret();
  if (!key) {
    const user = memory.get(token);
    return user ? withProfile(user) : null;
  }
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, key);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as WebUser & {
      exp?: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.id || !data.name || !data.phone) return null;
    return withProfile(data);
  } catch {
    return null;
  }
}

function cleanIdentity(name: string, lastName: string, phone: string, address: string) {
  const cleanName = name.trim().slice(0, 40);
  const cleanLast = lastName.trim().slice(0, 40);
  const cleanPhone = phone.trim().slice(0, 20);
  const cleanAddress = address.trim().slice(0, 120);
  if (cleanName.length < 2) throw new Error("Ismingizni kiriting");
  if (cleanLast.length < 2) throw new Error("Familiyangizni kiriting");
  if (cleanPhone.length < 7) throw new Error("Telefon raqamini kiriting");
  if (cleanAddress.length < 3) throw new Error("Manzilingizni kiriting");
  return { name: cleanName, lastName: cleanLast, phone: cleanPhone, address: cleanAddress };
}

function writeWebUser(user: WebUser) {
  const key = secret();
  if (!key) {
    const sid = getCookie(COOKIE) ?? randomBytes(16).toString("hex");
    memory.set(sid, user);
    setCookie(COOKIE, sid, cookieOptions());
    return user;
  }
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SEC * 1000 }),
  ).toString("base64url");
  setCookie(COOKIE, `${payload}.${sign(payload, key)}`, cookieOptions());
  return user;
}

export function startWebUser(name: string, lastName: string, phone: string, address: string) {
  const clean = cleanIdentity(name, lastName, phone, address);
  return writeWebUser({
    id: 9_000_000_000_000 + Math.floor(Math.random() * 1_000_000_000),
    ...clean,
  });
}

export function updateWebUser(name: string, lastName: string, phone: string, address: string) {
  const current = readWebUser();
  if (!current) throw new Error("Avval kiring");
  const clean = cleanIdentity(name, lastName, phone, address);
  return writeWebUser({ id: current.id, ...clean });
}

export function clearWebUser() {
  const token = getCookie(COOKIE);
  if (token) memory.delete(token);
  deleteCookie(COOKIE, { path: "/" });
}
