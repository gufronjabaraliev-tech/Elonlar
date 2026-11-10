import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const session = process.env["ADMIN_SESSION_SECRET"];
  if (session && session.length >= 16) return session;
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (token && token.length >= 16) return token;
  return null;
}

export function signListingAccess(id: string) {
  const key = secret();
  if (!key) return null;
  const payload = Buffer.from(
    JSON.stringify({ id, exp: Date.now() + 60 * 60 * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyListingAccess(token: string | null | undefined, id: string) {
  const key = secret();
  if (!key || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      id?: string;
      exp?: number;
    };
    return data.id === id && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
