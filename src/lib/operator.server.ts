import { createHmac, timingSafeEqual } from "node:crypto";

import { adminSessionCookie } from "./admin-session.server";
import { tenantId } from "./tenant-scope.server";

function validOperatorToken(token: string, tenant: string) {
  const secret = process.env["ADMIN_SECRET"] || "elonlar-admin-secret-hmac";
  if (!secret || !token || !tenant) return false;
  const pad = "=".repeat((4 - (token.length % 4)) % 4);
  let blob = "";
  try {
    blob = Buffer.from(token + pad, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const cut = blob.lastIndexOf(".");
  if (cut < 1) return false;
  const payload = blob.slice(0, cut);
  const sig = blob.slice(cut + 1);
  const expect = createHmac("sha256", secret).update(payload).digest("hex");
  const left = Buffer.from(sig);
  const right = Buffer.from(expect);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  const parts = payload.split(":");
  if (parts.length !== 3) return false;
  const sub = (parts[1] || "").toLowerCase();
  const exp = Number(parts[2]);
  if (!sub || sub !== tenant || !Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return true;
}

export async function operatorEnterCookie(token: string) {
  const clean = token.trim();
  if (!clean || clean.length > 500) return null;
  if (!validOperatorToken(clean, tenantId())) return null;
  return adminSessionCookie();
}

export function demoAdminCookie() {
  if (tenantId() !== "elon-demo") return null;
  return adminSessionCookie();
}
