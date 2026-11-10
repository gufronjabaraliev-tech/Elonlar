import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { tenantId } from "./tenant-scope.server";

const COOKIE = "elonlar_operator";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function sessionSecret() {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret || secret.length < 16) return null;
  return secret;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function webAdminConfigured() {
  return false;
}

export function checkWebAdminCredentials(_username: string, _password: string) {
  return false;
}

export function adminSessionCookie() {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + MAX_AGE_SEC * 1000,
      n: randomBytes(8).toString("hex"),
    }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function readWebAdminSession() {
  const secret = sessionSecret();
  if (!secret) return false;
  const token = getCookie(COOKIE);
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload, secret);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    if (!data.exp || data.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function startWebAdminSession() {
  const secret = sessionSecret();
  if (!secret) throw new Error("Admin sessiyasi sozlanmagan");
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + MAX_AGE_SEC * 1000,
      n: randomBytes(8).toString("hex"),
    }),
  ).toString("base64url");
  setCookie(COOKIE, `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearWebAdminSession() {
  deleteCookie(COOKIE, { path: "/" });
}

const loginFails = new Map<string, { count: number; until: number }>();
const LOCK_MS = 15 * 60 * 1000;

function loginKey(username: string) {
  return `${tenantId()}:${username}`;
}

export function assertLoginAllowed(username: string) {
  const row = loginFails.get(loginKey(username));
  if (row && row.count >= 5 && row.until > Date.now()) {
    throw new Error("Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.");
  }
}

export function noteLoginFailure(username: string) {
  const key = loginKey(username);
  const row = loginFails.get(key);
  const fresh = !row || row.until < Date.now();
  loginFails.set(key, {
    count: fresh ? 1 : row.count + 1,
    until: Date.now() + LOCK_MS,
  });
}

export function noteLoginSuccess(username: string) {
  loginFails.delete(loginKey(username));
}
