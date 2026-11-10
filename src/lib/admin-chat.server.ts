import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

export type ChatMessage = {
  id: string;
  customerId: number;
  from: "admin" | "customer";
  text: string;
  at: string;
  image?: string;
  listingId?: string;
  orderCode?: string;
};

type Contact = { name: string; phone: string };

const SEED: ChatMessage[] = [
  {
    id: "m1",
    customerId: 100001,
    from: "customer",
    text: "Chilonzordagi kvartira hali sotuvdami?",
    at: "2026-09-29T09:10:00.000Z",
  },
  {
    id: "m2",
    customerId: 100001,
    from: "admin",
    text: "Ha, e'lon tasdiqlangan va saytda ko'rinib turibdi.",
    at: "2026-09-29T09:18:00.000Z",
  },
  {
    id: "m3",
    customerId: 100003,
    from: "customer",
    text: "Yunusoboddagi kvartira qachon chiqadi?",
    at: "2026-09-29T15:40:00.000Z",
  },
  {
    id: "m4",
    customerId: 100006,
    from: "customer",
    text: "Divan rasmlarini tekshirib bering.",
    at: "2026-09-29T18:02:00.000Z",
  },
];

function messages(): ChatMessage[] {
  const stored = readTenantKey<ChatMessage[]>("adminMessages");
  if (Array.isArray(stored)) return stored;
  const next = SEED.map((item) => ({ ...item }));
  writeTenantKey("adminMessages", next);
  return next;
}

function contacts() {
  const stored = readTenantKey<Record<string, Contact>>("adminContacts");
  if (stored && typeof stored === "object") return stored;
  const next: Record<string, Contact> = {};
  writeTenantKey("adminContacts", next);
  return next;
}

export function messagesFor(customerId: number) {
  return messages()
    .filter((item) => item.customerId === customerId)
    .map((item) => ({ ...item }));
}

export function lastMessage(customerId: number) {
  const rows = messages().filter((item) => item.customerId === customerId);
  const last = rows[rows.length - 1];
  return last ? { ...last } : null;
}

export function contactOf(customerId: number) {
  return contacts()[String(customerId)] ?? null;
}

export function chatCustomerIds() {
  return [...new Set(messages().map((item) => item.customerId))];
}

export function pushCustomerMessage(
  customerId: number,
  text: string,
  contact: { name: string; phone: string },
  extra?: { image?: string; listingId?: string; orderCode?: string },
) {
  const clean = text.trim();
  if (!clean && !extra?.image) throw new Error("Xabar yozing");
  if (clean.length > 1000) throw new Error("Xabar juda uzun");
  const book = contacts();
  book[String(customerId)] = {
    name: contact.name.trim().slice(0, 40) || "Mijoz",
    phone: contact.phone.trim().slice(0, 20),
  };
  writeTenantKey("adminContacts", book);
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    customerId,
    from: "customer",
    text: clean,
    at: new Date().toISOString(),
  };
  if (extra?.image) message.image = extra.image;
  if (extra?.listingId) message.listingId = extra.listingId;
  if (extra?.orderCode) message.orderCode = extra.orderCode;
  const bag = messages();
  bag.push(message);
  writeTenantKey("adminMessages", bag);
  return message;
}

export function pushAdminMessage(customerId: number, text: string) {
  const clean = text.trim();
  if (!clean) throw new Error("Xabar yozing");
  if (clean.length > 1000) throw new Error("Xabar juda uzun");
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    customerId,
    from: "admin",
    text: clean,
    at: new Date().toISOString(),
  };
  const bag = messages();
  bag.push(message);
  writeTenantKey("adminMessages", bag);
  return message;
}
