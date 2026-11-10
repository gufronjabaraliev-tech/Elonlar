import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

export function readPlacementFee() {
  const stored = readTenantKey<number>("fee");
  if (typeof stored === "number" && Number.isFinite(stored)) return stored;
  writeTenantKey("fee", 20_000);
  return 20_000;
}

export function writePlacementFee(next: number) {
  const rounded = Math.round(next);
  if (!Number.isFinite(rounded) || rounded < 0 || rounded > 100_000_000) {
    throw new Error("Joylashtirish narxi noto'g'ri");
  }
  writeTenantKey("fee", rounded);
  return rounded;
}
