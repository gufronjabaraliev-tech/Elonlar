import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

export type TelegramProfile = {
  phone: string;
  address: string;
  lastName: string;
};

const empty: TelegramProfile = { phone: "", address: "", lastName: "" };

function store() {
  const stored = readTenantKey<Record<string, TelegramProfile>>("profiles");
  if (stored && typeof stored === "object") return stored;
  const next: Record<string, TelegramProfile> = {};
  writeTenantKey("profiles", next);
  return next;
}

export function readTelegramProfile(id: number): TelegramProfile {
  const row = store()[String(id)];
  return row ? { ...row } : { ...empty };
}

export function saveTelegramProfile(id: number, next: TelegramProfile): TelegramProfile {
  const saved = {
    phone: next.phone.trim().slice(0, 20),
    address: next.address.trim().slice(0, 120),
    lastName: next.lastName.trim().slice(0, 40),
  };
  if (saved.lastName.length < 2) throw new Error("Familiyangizni kiriting");
  if (saved.phone.length < 7) throw new Error("Telefon raqamini kiriting");
  if (saved.address.length < 3) throw new Error("Manzilingizni kiriting");
  const bag = store();
  bag[String(id)] = saved;
  writeTenantKey("profiles", bag);
  return { ...saved };
}

export function rememberTelegramPhone(id: number, phone: string) {
  const current = readTelegramProfile(id);
  const clean = phone.trim().slice(0, 20);
  if (clean.length < 7) return current;
  const next = { ...current, phone: clean.startsWith("+") ? clean : `+${clean}` };
  const bag = store();
  bag[String(id)] = next;
  writeTenantKey("profiles", bag);
  return { ...next };
}
