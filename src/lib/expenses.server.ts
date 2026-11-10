import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  created_at: string;
};

const SEED: Expense[] = [
  { id: "exp-reklama", title: "Reklama", amount: 150_000, created_at: "2026-09-18T08:00:00.000Z" },
  { id: "exp-server", title: "Server", amount: 50_000, created_at: "2026-09-25T08:00:00.000Z" },
];

function rows(): Expense[] {
  const stored = readTenantKey<Expense[]>("expenses");
  if (Array.isArray(stored)) return stored;
  const next = SEED.map((item) => ({ ...item }));
  writeTenantKey("expenses", next);
  return next;
}

export function listExpenses() {
  return rows()
    .map((item) => ({ ...item }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addExpense(title: string, amount: number) {
  const clean = title.trim();
  const rounded = Math.round(amount);
  if (clean.length < 2) throw new Error("Harajat nomini yozing");
  if (!Number.isFinite(rounded) || rounded <= 0 || rounded > 100_000_000) {
    throw new Error("Harajat summasi noto'g'ri");
  }
  const expense: Expense = {
    id: crypto.randomUUID(),
    title: clean.slice(0, 80),
    amount: rounded,
    created_at: new Date().toISOString(),
  };
  writeTenantKey("expenses", [expense, ...rows()]);
  return expense;
}

export function removeExpense(id: string) {
  writeTenantKey(
    "expenses",
    rows().filter((item) => item.id !== id),
  );
  return { ok: true };
}
