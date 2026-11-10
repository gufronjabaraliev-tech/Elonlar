import { readTenantKey, writeTenantKey } from "./tenant-scope.server";

export type SellerMessage = {
  id: string;
  listingId: string;
  listingTitle: string;
  ownerId: number;
  buyerId: number;
  buyerName: string;
  from: "buyer" | "owner";
  text: string;
  at: string;
};

function messages(): SellerMessage[] {
  const stored = readTenantKey<SellerMessage[]>("sellerMessages");
  if (Array.isArray(stored)) return stored;
  const next: SellerMessage[] = [];
  writeTenantKey("sellerMessages", next);
  return next;
}

function save(next: SellerMessage[]) {
  writeTenantKey("sellerMessages", next);
}

export function threadMessages(listingId: string, buyerId: number) {
  return messages()
    .filter((item) => item.listingId === listingId && item.buyerId === buyerId)
    .map((item) => ({ ...item }));
}

export function threadsFor(userId: number) {
  const map = new Map<string, SellerMessage>();
  for (const item of messages()) {
    if (item.buyerId !== userId && item.ownerId !== userId) continue;
    const key = `${item.listingId}:${item.buyerId}`;
    const prev = map.get(key);
    if (!prev || item.at > prev.at) map.set(key, item);
  }
  return [...map.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((item) => ({ ...item }));
}

export function rememberSellerMessage(message: Omit<SellerMessage, "id">) {
  const bag = messages();
  const exists = bag.some(
    (item) =>
      item.listingId === message.listingId &&
      item.buyerId === message.buyerId &&
      item.from === message.from &&
      item.text === message.text,
  );
  if (exists) return;
  bag.push({ ...message, id: crypto.randomUUID() });
  save(bag);
}

export function pushSellerMessage(input: {
  listingId: string;
  listingTitle: string;
  ownerId: number;
  buyerId: number;
  buyerName: string;
  from: "buyer" | "owner";
  text: string;
}) {
  const clean = input.text.trim();
  if (clean.length < 1) throw new Error("Xabar yozing");
  if (clean.length > 1000) throw new Error("Xabar juda uzun");
  if (input.buyerId === input.ownerId) throw new Error("O'z e'loningizga yozib bo'lmaydi");
  const message: SellerMessage = {
    id: crypto.randomUUID(),
    listingId: input.listingId,
    listingTitle: input.listingTitle.slice(0, 80),
    ownerId: input.ownerId,
    buyerId: input.buyerId,
    buyerName: input.buyerName.trim().slice(0, 40) || "Xaridor",
    from: input.from,
    text: clean,
    at: new Date().toISOString(),
  };
  const bag = messages();
  bag.push(message);
  save(bag);
  return { ...message };
}
