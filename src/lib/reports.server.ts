import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

export type ListingReport = {
  id: string;
  listingId: string;
  userId: number;
  reason: string;
  at: string;
};

function rows(): ListingReport[] {
  const stored = readTenantKey<ListingReport[]>("reports");
  if (Array.isArray(stored)) return stored;
  const next: ListingReport[] = [];
  writeTenantKey("reports", next);
  return next;
}

export function addReport(listingId: string, userId: number, reason: string) {
  const reports = rows();
  const clean = reason.trim().slice(0, 300);
  if (clean.length < 4) throw new Error("Shikoyat sababini yozing");
  const recent = reports.find(
    (item) => item.listingId === listingId && item.userId === userId && Date.now() - new Date(item.at).getTime() < 86_400_000,
  );
  if (recent) throw new Error("Bu e'lon bo'yicha shikoyat yuborilgan");
  const report: ListingReport = {
    id: crypto.randomUUID(),
    listingId,
    userId,
    reason: clean,
    at: new Date().toISOString(),
  };
  reports.unshift(report);
  writeTenantKey("reports", reports);
  return report;
}

export function reportsFor(listingId: string) {
  return rows()
    .filter((item) => item.listingId === listingId)
    .map((item) => ({ ...item }));
}
