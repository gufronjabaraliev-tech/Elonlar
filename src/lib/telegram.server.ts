import { createHmac } from "crypto";

import { tenantBotToken, tenantOwnerIds } from "./tenant-scope.server";

export function adminTelegramIds() {
  return tenantOwnerIds();
}

export function adminTelegramId() {
  return adminTelegramIds()[0] ?? 0;
}

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

/**
 * Verifies Telegram Mini App initData using the bot token (HMAC-SHA256).
 * Returns the trusted user, or null when the payload is missing/invalid.
 */
export function verifyInitData(initData: string | undefined | null): TelegramUser | null {
  if (!initData) return null;
  const token = tenantBotToken();
  if (!token) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash" || key === "signature") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computed !== hash) return null;

  // Reject payloads older than 24 hours.
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as TelegramUser;
    if (!user || typeof user.id !== "number") return null;
    return user;
  } catch {
    return null;
  }
}

export function requireTelegramUser(initData: string | undefined | null): TelegramUser {
  const user = verifyInitData(initData);
  if (!user) throw new Error("Telegram orqali kiring");
  return user;
}

export function isAdminId(id: number) {
  return tenantOwnerIds().includes(id);
}

export async function notifyTelegram(chatId: number, text: string) {
  const token = tenantBotToken();
  if (!token || !Number.isFinite(chatId) || chatId <= 0 || chatId >= 9_000_000_000_000) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    /* xabar ketmasa ham holat saqlanadi */
  }
}
