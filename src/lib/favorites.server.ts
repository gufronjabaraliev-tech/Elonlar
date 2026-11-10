import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

function bag() {
  const stored = readTenantKey<Record<string, string[]>>("favorites");
  if (stored && typeof stored === "object") return stored;
  const next: Record<string, string[]> = {};
  writeTenantKey("favorites", next);
  return next;
}

function clean(ids: string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0 && id.length < 80))].slice(0, 100);
}

export function readFavorites(userId: number) {
  return [...(bag()[String(userId)] ?? [])];
}

export function mergeFavorites(userId: number, extra: string[]) {
  const saved = bag();
  const next = clean([...(saved[String(userId)] ?? []), ...extra]);
  saved[String(userId)] = next;
  writeTenantKey("favorites", saved);
  return [...next];
}

export function toggleFavorite(userId: number, listingId: string) {
  const saved = bag();
  const current = saved[String(userId)] ?? [];
  const next = current.includes(listingId)
    ? current.filter((id) => id !== listingId)
    : [listingId, ...current].slice(0, 100);
  saved[String(userId)] = next;
  writeTenantKey("favorites", saved);
  return [...next];
}
