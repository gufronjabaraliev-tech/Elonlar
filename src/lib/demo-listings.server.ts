import type { Listing } from "./listings.functions";
import { readTenantKey, touchTenant, writeTenantKey } from "./tenant-scope.server";

const seed: Array<Omit<Listing, "placement_fee" | "payment_status">> = [
  {
    id: "demo-uy-chilonzor",
    owner_telegram_id: 100001,
    category: "uy",
    title: "Chilonzorda 3 xonali kvartira",
    description:
      "4-qavat, 68 m². Yevro ta'mir, oshxona jihozlangan, balkon va yerto'la bor. Maktab va bozor yaqin.",
    price: 85000,
    currency: "USD",
    city: "Toshkent, Chilonzor",
    phone: "+998 90 123 45 67",
    images: ["/demo/uy-1.jpg", "/demo/uy-4.jpg", "/demo/uy-5.jpg"],
    attributes: { rooms: 3, area: 68 },
    status: "approved",
    reject_reason: null,
    views: 128,
    created_at: "2026-09-20T08:00:00.000Z",
  },
  {
    id: "demo-uy-samarqand",
    owner_telegram_id: 100002,
    category: "uy",
    title: "Samarqandda yangi hovli",
    description:
      "4 sotix, 5 xona, yangi qurilgan. Gaz, suv va issiq suv ulangan. Hovlida garaj joyi bor.",
    price: 620000000,
    currency: "UZS",
    city: "Samarqand",
    phone: "+998 93 700 11 22",
    images: ["/demo/uy-6.jpg", "/demo/uy-2.jpg", "/demo/uy-3.jpg"],
    status: "approved",
    reject_reason: null,
    views: 86,
    created_at: "2026-09-22T10:30:00.000Z",
  },
  {
    id: "demo-uy-yunusobod",
    owner_telegram_id: 100003,
    category: "uy",
    title: "Yunusobodda 2 xonali kvartira",
    description: "7-qavat, 52 m². Metro yaqin. Ta'mir o'rtacha, mebel bilan beriladi.",
    price: 72000,
    currency: "USD",
    city: "Toshkent, Yunusobod",
    phone: "+998 97 555 01 02",
    images: ["/demo/uy-5.jpg", "/demo/uy-4.jpg"],
    status: "pending",
    reject_reason: null,
    views: 4,
    created_at: "2026-09-28T14:10:00.000Z",
  },
  {
    id: "demo-mashina-cobalt",
    owner_telegram_id: 100004,
    category: "mashina",
    title: "Chevrolet Cobalt 2022",
    description: "Avtomat, oq rang, 41 000 km. Bitta egasi, toza salon. Gaz uskunasi yo'q.",
    price: 145000000,
    currency: "UZS",
    city: "Toshkent",
    phone: "+998 91 200 33 44",
    images: ["/demo/mashina-1.jpg", "/demo/mashina-4.jpg"],
    attributes: { year: 2022, mileage: 41000 },
    status: "approved",
    reject_reason: null,
    views: 210,
    created_at: "2026-09-18T06:20:00.000Z",
  },
  {
    id: "demo-mashina-camry",
    owner_telegram_id: 100002,
    category: "mashina",
    title: "Toyota Camry 2019",
    description: "2.5, qora rang, 78 000 km. To'liq servis tarixi, qishki shinalar sovg'a.",
    price: 28500,
    currency: "USD",
    city: "Buxoro",
    phone: "+998 93 700 11 22",
    images: ["/demo/mashina-2.jpg", "/demo/mashina-5.jpg"],
    status: "approved",
    reject_reason: null,
    views: 164,
    created_at: "2026-09-21T12:00:00.000Z",
  },
  {
    id: "demo-mashina-nexia",
    owner_telegram_id: 100005,
    category: "mashina",
    title: "Nexia 3, 2018",
    description: "Mexanika, kulrang. Rasmlar noaniq, narx kelishiladi.",
    price: 78000000,
    currency: "UZS",
    city: "Andijon",
    phone: "+998 88 111 22 33",
    images: ["/demo/mashina-3.jpg", "/demo/mashina-4.jpg"],
    status: "rejected",
    reject_reason: "Rasm sifati past va tavsif to'liq emas.",
    views: 12,
    created_at: "2026-09-25T09:40:00.000Z",
  },
  {
    id: "demo-telefon",
    owner_telegram_id: 100001,
    category: "boshqa",
    title: "iPhone 14, 128 GB",
    description: "Qora, batareya 89%. Quti va zaryadlagich bor. Yuzi va orqasi himoyalangan.",
    price: 8500000,
    currency: "UZS",
    city: "Toshkent",
    phone: "+998 90 123 45 67",
    images: ["/demo/telefon.jpg", "/demo/telefon-2.jpg"],
    status: "approved",
    reject_reason: null,
    views: 73,
    created_at: "2026-09-26T16:15:00.000Z",
  },
  {
    id: "demo-divan",
    owner_telegram_id: 100006,
    category: "boshqa",
    title: "Burchakli divan",
    description: "Yangi, mato, kulrang. O'lchami 260×170 sm. Yetkazib berish alohida.",
    price: 4200000,
    currency: "UZS",
    city: "Toshkent, Sergeli",
    phone: "+998 94 300 40 50",
    images: ["/demo/divan.jpg", "/demo/divan-2.jpg"],
    status: "pending",
    reject_reason: null,
    views: 2,
    created_at: "2026-09-29T11:05:00.000Z",
  },
];

function seedListings(): Listing[] {
  return seed.map((item) => ({
    ...item,
    images: [...item.images],
    placement_fee: 20000,
    payment_status:
      item.status === "approved" ? "paid" : item.id === "demo-uy-yunusobod" ? "checking" : "unpaid",
  }));
}

function allListings(): Listing[] {
  const stored = readTenantKey<Listing[]>("listings");
  if (Array.isArray(stored)) return stored;
  const next = seedListings();
  writeTenantKey("listings", next);
  return next;
}

function matches(
  listing: Listing,
  filter: {
    category?: string | undefined;
    q?: string | undefined;
    city?: string | undefined;
    region?: string | undefined;
    min?: number | undefined;
    max?: number | undefined;
    currency?: string | undefined;
    rooms?: number | undefined;
    area?: number | undefined;
    year?: number | undefined;
    mileage?: number | undefined;
  },
) {
  if (filter.category && filter.category !== "all" && listing.category !== filter.category) {
    return false;
  }
  if (filter.city && !listing.city.toLowerCase().includes(filter.city.toLowerCase())) return false;
  if (filter.region && !listing.city.toLowerCase().includes(filter.region.toLowerCase())) return false;
  if (filter.q) {
    const haystack = `${listing.title} ${listing.description}`.toLowerCase();
    if (!haystack.includes(filter.q.toLowerCase())) return false;
  }
  if (filter.currency && listing.currency !== filter.currency) return false;
  if (typeof filter.min === "number" && listing.price < filter.min) return false;
  if (typeof filter.max === "number" && filter.max > 0 && listing.price > filter.max) return false;
  const extra = listing.attributes ?? {};
  if (typeof filter.rooms === "number" && filter.rooms > 0 && (extra.rooms ?? 0) < filter.rooms) return false;
  if (typeof filter.area === "number" && filter.area > 0 && (extra.area ?? 0) < filter.area) return false;
  if (typeof filter.year === "number" && filter.year > 0 && (extra.year ?? 0) < filter.year) return false;
  if (typeof filter.mileage === "number" && filter.mileage > 0 && (extra.mileage ?? 0) > filter.mileage) return false;
  return true;
}

function byNewest(a: Listing, b: Listing) {
  return b.created_at.localeCompare(a.created_at);
}

function copy(listing: Listing) {
  return { ...listing, images: [...listing.images], attributes: { ...(listing.attributes ?? {}) } };
}

function page(rows: Listing[], offset = 0, limit = 12) {
  const slice = rows.slice(offset, offset + limit);
  return { items: slice.map(copy), hasMore: offset + limit < rows.length };
}

export function listDemoApproved(filter: {
  category?: string | undefined;
  q?: string | undefined;
  city?: string | undefined;
  region?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  currency?: string | undefined;
  rooms?: number | undefined;
  area?: number | undefined;
  year?: number | undefined;
  mileage?: number | undefined;
  sort?: string | undefined;
  offset?: number | undefined;
  limit?: number | undefined;
}) {
  const rows = allListings().filter((listing) => listing.status === "approved" && matches(listing, filter));
  if (filter.sort === "cheap") rows.sort((a, b) => a.price - b.price);
  else if (filter.sort === "expensive") rows.sort((a, b) => b.price - a.price);
  else rows.sort(byNewest);
  return page(rows, filter.offset ?? 0, filter.limit ?? 12);
}

export function demoSellerName(ownerId: number) {
  return DEMO_NAMES[ownerId] ?? "Sotuvchi";
}

export function demoRelated(ownerId: number, exceptId: string) {
  return allListings()
    .filter((listing) => listing.owner_telegram_id === ownerId && listing.id !== exceptId && listing.status === "approved")
    .sort(byNewest)
    .slice(0, 4)
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      currency: listing.currency,
      city: listing.city,
    }));
}

export function findDemoListing(id: string) {
  const listing = allListings().find((item) => item.id === id);
  if (!listing) return null;
  return { ...listing, images: [...listing.images] };
}

export function bumpDemoView(id: string) {
  const listing = allListings().find((item) => item.id === id);
  if (!listing || listing.status !== "approved") return null;
  listing.views += 1;
  touchTenant();
  return copy(listing);
}

export function listDemoMine(ownerId: number) {
  return allListings()
    .filter((listing) => listing.owner_telegram_id === ownerId)
    .sort(byNewest)
    .map(copy);
}

const DEMO_NAMES: Record<number, string> = {
  100001: "Jasur Karimov",
  100002: "Malika Yusupova",
  100003: "Aziz Toshpulatov",
  100004: "Sardor Aliyev",
  100005: "Dilshod Rahimov",
  100006: "Nilufar Saidova",
};

export function demoCustomers() {
  const map = new Map<
    number,
    { id: number; name: string; phone: string; city: string; listings: number }
  >();
  for (const listing of allListings()) {
    const current = map.get(listing.owner_telegram_id);
    if (!current) {
      map.set(listing.owner_telegram_id, {
        id: listing.owner_telegram_id,
        name: DEMO_NAMES[listing.owner_telegram_id] ?? "Mijoz",
        phone: listing.phone,
        city: listing.city,
        listings: 1,
      });
    } else {
      current.listings += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.listings - a.listings || a.name.localeCompare(b.name));
}

export function addDemoListing(
  ownerId: number,
  payload: import("./listings.functions").ListingInput,
  status = "pending",
  payment: { fee: number; paymentStatus: string } = { fee: 0, paymentStatus: "paid" },
) {
  const listing: Listing = {
    id: `demo-${crypto.randomUUID()}`,
    owner_telegram_id: ownerId,
    category: payload.category,
    title: payload.title.trim(),
    description: payload.description.trim(),
    price: payload.price,
    currency: payload.currency,
    city: payload.city.trim(),
    phone: payload.phone.trim(),
    images: [...payload.images],
    attributes: payload.attributes ?? {},
    status,
    reject_reason: null,
    views: 0,
    created_at: new Date().toISOString(),
    placement_fee: payment.fee,
    payment_status: payment.paymentStatus,
  };
  writeTenantKey("listings", [listing, ...allListings()]);
  return { id: listing.id };
}

export function updateDemoListing(
  id: string,
  ownerId: number,
  telegramAdmin: boolean,
  payload: import("./listings.functions").ListingInput,
) {
  const listing = allListings().find((item) => item.id === id);
  if (!listing) throw new Error("E'lon topilmadi");
  if (listing.owner_telegram_id !== ownerId && !telegramAdmin) throw new Error("Ruxsat yo'q");
  listing.category = payload.category;
  listing.title = payload.title.trim();
  listing.description = payload.description.trim();
  listing.price = payload.price;
  listing.currency = payload.currency;
  listing.city = payload.city.trim();
  listing.phone = payload.phone.trim();
  listing.images = [...payload.images];
  listing.attributes = payload.attributes ?? {};
  if (!telegramAdmin) listing.status = "pending";
  listing.reject_reason = null;
  touchTenant();
}

export function listDemoAdmin(filter: {
  status: string;
  q?: string;
  city?: string;
  offset?: number;
  limit?: number;
}) {
  const rows = allListings()
    .filter((listing) => filter.status === "all" || listing.status === filter.status)
    .filter((listing) =>
      matches(listing, { q: filter.q, city: filter.city }),
    )
    .sort(byNewest);
  return page(rows, filter.offset ?? 0, filter.limit ?? 20);
}

export function setDemoStatus(id: string, status: string, reason?: string) {
  const listing = allListings().find((item) => item.id === id);
  if (!listing) throw new Error("E'lon topilmadi");
  listing.status = status;
  listing.reject_reason = reason ?? null;
  touchTenant();
  return copy(listing);
}

export function setDemoPayment(id: string, paymentStatus: string) {
  const listing = allListings().find((item) => item.id === id);
  if (!listing) throw new Error("E'lon topilmadi");
  listing.payment_status = paymentStatus;
  touchTenant();
  return copy(listing);
}

export function claimDemoPayment(id: string, ownerId: number) {
  const listing = allListings().find((item) => item.id === id);
  if (!listing || listing.owner_telegram_id !== ownerId) throw new Error("Ruxsat yo'q");
  if (listing.payment_status === "paid") throw new Error("To'lov allaqachon qabul qilingan");
  listing.payment_status = listing.placement_fee > 0 ? "checking" : "paid";
  touchTenant();
  return copy(listing);
}

export function demoIncome() {
  let income = 0;
  let paidCount = 0;
  let waiting = 0;
  for (const listing of allListings()) {
    const fee = listing.placement_fee;
    if (listing.payment_status === "paid" && fee > 0) {
      income += fee;
      paidCount += 1;
    } else if (
      fee > 0 &&
      (listing.payment_status === "checking" ||
        (listing.payment_status === "unpaid" && listing.status === "pending"))
    ) {
      waiting += fee;
    }
  }
  return { income, paidCount, waiting };
}

export function deleteDemoListing(id: string) {
  writeTenantKey(
    "listings",
    allListings().filter((item) => item.id !== id),
  );
}

export function demoActivity() {
  return allListings().map((listing) => ({
    id: listing.id,
    created_at: listing.created_at,
    owner: listing.owner_telegram_id,
    category: listing.category,
    city: listing.city,
    status: listing.status,
    views: listing.views,
    fee: listing.placement_fee,
    payment: listing.payment_status,
    title: listing.title,
  }));
}

export function demoStats() {
  const count = (status?: string) =>
    allListings().filter((listing) => !status || listing.status === status).length;
  return {
    total: count(),
    pending: count("pending"),
    approved: count("approved"),
    rejected: count("rejected"),
    hidden: count("hidden"),
    users: new Set(allListings().map((listing) => listing.owner_telegram_id)).size,
  };
}
