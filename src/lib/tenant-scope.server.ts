import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getRequestHeader } from "@tanstack/react-start/server";

type Ctx = {
  id: string;
  brand: string;
  state: TenantState;
  dirty: boolean;
};

export type TenantState = {
  listings?: unknown;
  platform?: unknown;
  fee?: number;
  favorites?: Record<string, string[]>;
  expenses?: unknown;
  sellerMessages?: unknown;
  adminMessages?: unknown;
  adminContacts?: Record<string, { name: string; phone: string }>;
  reports?: unknown;
  profiles?: Record<string, { phone: string; address: string; lastName: string }>;
};

const DATA_ROOT = process.env["ELONLAR_DATA"] || path.join(process.cwd(), "data");
const als = new AsyncLocalStorage<Ctx>();
const tails = new Map<string, Promise<void>>();

function safeId(value: string) {
  const first = value.split(",")[0] ?? "";
  const id = first.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return id || "local";
}

export function resolveTenantId() {
  try {
    const header = getRequestHeader("x-tenant") || getRequestHeader("x-subdomain") || "";
    if (header.trim()) return safeId(header);
    const host = (getRequestHeader("host") || "").split(":")[0]?.toLowerCase() || "";
    const appDomain = process.env["APP_DOMAIN"] || "elonlar.uz";
    if (host.endsWith(`.${appDomain}`)) {
      const sub = host.slice(0, -(appDomain.length + 1));
      if (sub && !["www", "admin", "miniapp"].includes(sub)) return safeId(sub);
    }
  } catch {
    /* request tashqarisida */
  }
  return "local";
}

function dirOf(id: string) {
  return path.join(DATA_ROOT, safeId(id));
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function loadState(id: string): TenantState {
  const raw = readJson(path.join(dirOf(id), "state.json"));
  if (!raw || typeof raw !== "object") return {};
  return raw as TenantState;
}

function readBrand(id: string) {
  const raw = readJson(path.join(dirOf(id), "brand.json"));
  if (!raw || typeof raw !== "object" || !("name" in raw)) return "";
  const name = (raw as { name?: unknown }).name;
  return typeof name === "string" ? name.trim().slice(0, 40) : "";
}

function saveState(id: string, state: TenantState) {
  const dir = dirOf(id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "state.json"), JSON.stringify(state));
}

function enqueue<T>(id: string, job: () => Promise<T>): Promise<T> {
  const prev = tails.get(id) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(job);
  tails.set(
    id,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export function runInTenant<T>(fn: () => Promise<T>): Promise<T> {
  const id = resolveTenantId();
  return enqueue(id, async () => {
    const ctx: Ctx = { id, brand: readBrand(id), state: loadState(id), dirty: false };
    try {
      return await als.run(ctx, fn);
    } finally {
      if (ctx.dirty) saveState(id, ctx.state);
    }
  });
}

function ctx(): Ctx {
  const current = als.getStore();
  if (current) return current;
  const fallback = fallbackCtx();
  return fallback;
}

let loose: Ctx | undefined;
function fallbackCtx(): Ctx {
  if (!loose) loose = { id: "local", brand: readBrand("local"), state: loadState("local"), dirty: false };
  return loose;
}

export function touchTenant() {
  const current = ctx();
  current.dirty = true;
  if (!als.getStore() && current.dirty) saveState(current.id, current.state);
}

export function tenantBrand() {
  return ctx().brand;
}

export function writeTenantBrand(name: string) {
  const clean = name.trim().slice(0, 40);
  const current = ctx();
  current.brand = clean;
  const dir = dirOf(current.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "brand.json"), JSON.stringify({ name: clean }));
}

export function tenantId() {
  return ctx().id;
}

export function readTenantKey<T>(key: keyof TenantState): T | undefined {
  return ctx().state[key] as T | undefined;
}

export function writeTenantKey(key: keyof TenantState, value: TenantState[keyof TenantState]) {
  ctx().state[key] = value;
  touchTenant();
}

export function tenantAdminCreds(): { login: string; password: string } | null {
  const raw = readJson(path.join(dirOf(tenantId()), "admin.json"));
  if (!raw || typeof raw !== "object") return null;
  const login = "login" in raw ? raw.login : "";
  const password = "password" in raw ? raw.password : "";
  if (typeof login !== "string" || typeof password !== "string") return null;
  if (!login || !password) return null;
  return { login, password };
}

function tenantBotFile(): { token?: unknown; ownerIds?: unknown } | null {
  const raw = readJson(path.join(dirOf(tenantId()), "bot.json"));
  if (!raw || typeof raw !== "object") return null;
  return raw as { token?: unknown; ownerIds?: unknown };
}

export function tenantBotToken() {
  const token = tenantBotFile()?.token;
  if (typeof token === "string" && token.trim()) return token.trim();
  const envToken = process.env["TELEGRAM_BOT_TOKEN"];
  return typeof envToken === "string" ? envToken.trim() : "";
}

export function tenantOwnerIds(): number[] {
  const raw = tenantBotFile()?.ownerIds;
  const ids: number[] = [];
  if (Array.isArray(raw)) {
    for (const value of raw) {
      const id = Number(value);
      if (Number.isInteger(id) && id > 0) ids.push(id);
    }
  }
  if (ids.length === 0) {
    const envIds = (process.env["ADMIN_TELEGRAM_IDS"] || process.env["ADMIN_TELEGRAM_ID"] || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    ids.push(...envIds);
  }
  return ids;
}

export function tenantImageFile(rel: string) {
  const clean = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.includes("\0")) throw new Error("Rasm noto'g'ri");
  return path.join(dirOf(tenantId()), "images", clean);
}
