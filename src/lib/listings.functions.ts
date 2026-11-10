import { createServerFn } from "@tanstack/react-start";

export type ListingAttributes = {
  rooms?: number;
  area?: number;
  year?: number;
  mileage?: number;
  lat?: number;
  lng?: number;
};

export type Listing = {
  id: string;
  owner_telegram_id: number;
  category: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  phone: string;
  images: string[];
  attributes?: ListingAttributes | null;
  status: string;
  reject_reason: string | null;
  views: number;
  created_at: string;
  placement_fee: number;
  payment_status: string;
  imageToken?: string;
};

const SELECT =
  "id, owner_telegram_id, category, title, description, price, currency, city, phone, images, attributes, status, reject_reason, views, created_at, placement_fee, payment_status";

const PAGE = 12;
const ADMIN_PAGE = 20;

export type ListingPage = { items: Listing[]; hasMore: boolean };

export type ListingInput = {
  category: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  phone: string;
  images: string[];
  attributes?: ListingAttributes;
};

type FeedFilter = {
  category?: string | undefined;
  q?: string | undefined;
  city?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
  currency?: string | undefined;
  sort?: string | undefined;
  rooms?: number | undefined;
  area?: number | undefined;
  year?: number | undefined;
  mileage?: number | undefined;
  offset?: number | undefined;
};

function databaseReady() {
  return Boolean(process.env["SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

async function loadPlatform() {
  if (!databaseReady()) {
    const { readPlatform } = await import("./platform.server");
    return readPlatform();
  }
  const db = await admin();
  const { data, error } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", "platform")
    .maybeSingle();
  if (error || !data?.value) {
    const { readPlatform } = await import("./platform.server");
    return readPlatform();
  }
  const { parsePlatform } = await import("./platform.server");
  return parsePlatform(data.value);
}

async function currentFee() {
  if (!databaseReady()) {
    const { readPlacementFee } = await import("./placement.server");
    return readPlacementFee();
  }
  const db = await admin();
  const { data, error } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", "placement_fee")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const amount = Number(data?.value ?? 20000);
  return Number.isFinite(amount) && amount >= 0 ? amount : 20000;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function safeSearch(value: string | undefined) {
  if (!value) return "";
  return value.replace(/[^\p{L}\p{N}\s'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function asListing(row: unknown): Listing {
  const listing = row as Listing;
  return {
    ...listing,
    price: Number(listing.price),
    placement_fee: Number(listing.placement_fee ?? 0),
    payment_status: listing.payment_status || "paid",
    attributes: listing.attributes ?? {},
    images: listing.images ?? [],
  };
}

async function withAccess(listing: Listing, priv: boolean) {
  if (!priv || listing.status === "approved") return listing;
  const { signListingAccess } = await import("./image-access.server");
  const token = signListingAccess(listing.id);
  return token ? { ...listing, imageToken: token } : listing;
}

function slicePage(rows: Listing[], limit: number): ListingPage {
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

async function resolveOwner(initData: string) {
  const { verifyInitData } = await import("./telegram.server");
  const { readWebUser } = await import("./web-user-session.server");
  const { readTelegramProfile } = await import("./telegram-profile.server");
  const telegram = verifyInitData(initData);
  if (telegram) return { id: telegram.id, telegram, profile: readTelegramProfile(telegram.id) };
  const web = readWebUser();
  if (web) {
    return {
      id: web.id,
      telegram: null,
      web,
      profile: { phone: web.phone, address: web.address, lastName: web.lastName },
    };
  }
  return null;
}

const creates = new Map<number, number[]>();

function assertCreateRate(id: number) {
  const now = Date.now();
  const recent = (creates.get(id) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 10) throw new Error("Soatiga 10 tadan ko'p e'lon joylab bo'lmaydi");
  recent.push(now);
  creates.set(id, recent);
}

function numberIn(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) throw new Error("Maydon qiymati noto'g'ri");
  return rounded;
}

function coord(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n * 1e6) / 1e6;
}

function put(out: ListingAttributes, key: keyof ListingAttributes, value: number | undefined) {
  if (value !== undefined) out[key] = value;
}

function cleanAttributes(category: string, raw: ListingAttributes | undefined): ListingAttributes {
  const src = raw ?? {};
  const out: ListingAttributes = {};
  if (category === "uy") {
    if (src.rooms) put(out, "rooms", numberIn(src.rooms, 1, 30));
    if (src.area) put(out, "area", numberIn(src.area, 1, 100000));
  } else if (category === "mashina") {
    if (src.year) put(out, "year", numberIn(src.year, 1950, new Date().getFullYear() + 1));
    if (src.mileage || src.mileage === 0) put(out, "mileage", numberIn(src.mileage, 0, 2_000_000));
  }
  put(out, "lat", coord(src.lat, -90, 90));
  put(out, "lng", coord(src.lng, -180, 180));
  return out;
}

function validate(p: ListingInput) {
  if (!["uy", "mashina", "boshqa"].includes(p.category)) throw new Error("Bo'lim noto'g'ri");
  if (!p.title || p.title.trim().length < 3) throw new Error("Sarlavha juda qisqa");
  if (!p.phone || p.phone.trim().length < 7) throw new Error("Telefon raqamini kiriting");
  if (p.price < 0 || Number.isNaN(Number(p.price))) throw new Error("Narx noto'g'ri");
  if (!["UZS", "USD"].includes(p.currency)) throw new Error("Valyuta noto'g'ri");
  if (p.images.length > 10) throw new Error("Ko'pi bilan 10 ta rasm");
}

function assertImages(ownerId: number, images: string[]) {
  for (const img of images) {
    if (img.startsWith("data:image/")) {
      if (!/^data:image\/(?:jpeg|png|webp|gif);base64,/.test(img) || img.length > 1_800_000) {
        throw new Error("Rasm noto'g'ri");
      }
      continue;
    }
    if (img.startsWith("/demo/")) continue;
    if (img.includes("..") || img.includes("?") || img.startsWith("/")) {
      throw new Error("Rasm noto'g'ri");
    }
    if (!img.startsWith(`${ownerId}/`)) throw new Error("Rasm ruxsatsiz");
  }
}

/* ---------------------------------- session --------------------------------- */

export const getSession = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const { verifyInitData, isAdminId } = await import("./telegram.server");
    const user = verifyInitData(data.initData);
    if (!user) return { user: null, isAdmin: false } as const;

    if (databaseReady()) {
      const db = await admin();
      const { readTelegramProfile } = await import("./telegram-profile.server");
      const extra = readTelegramProfile(user.id);
      await db.from("profiles").upsert(
        {
          telegram_id: user.id,
          first_name: user.first_name ?? null,
          last_name: user.last_name || extra.lastName || null,
          username: user.username ?? null,
          photo_url: user.photo_url ?? null,
          phone: extra.phone || null,
        },
        { onConflict: "telegram_id" },
      );
    }

    return { user, isAdmin: isAdminId(user.id) } as const;
  });

export const webUserSession = createServerFn({ method: "POST" }).handler(async () => {
  const { readWebUser } = await import("./web-user-session.server");
  return { user: readWebUser() };
});

export const webUserStart = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; lastName: string; phone: string; address: string }) => input)
  .handler(async ({ data }) => {
    const { startWebUser } = await import("./web-user-session.server");
    return { user: startWebUser(data.name, data.lastName, data.phone, data.address) };
  });

export const telegramProfileGet = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const { verifyInitData } = await import("./telegram.server");
    const user = verifyInitData(data.initData);
    if (!user) return null;
    const { readTelegramProfile } = await import("./telegram-profile.server");
    const extra = readTelegramProfile(user.id);
    return {
      phone: extra.phone,
      address: extra.address,
      lastName: user.last_name || extra.lastName,
    };
  });

export const telegramProfileSave = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; lastName: string; phone: string; address: string }) => input)
  .handler(async ({ data }) => {
    const { verifyInitData } = await import("./telegram.server");
    const user = verifyInitData(data.initData);
    if (!user) throw new Error("Ilovani Telegram ichida oching");
    const { saveTelegramProfile } = await import("./telegram-profile.server");
    const saved = saveTelegramProfile(user.id, {
      lastName: user.last_name || data.lastName,
      phone: data.phone,
      address: data.address,
    });
    if (databaseReady()) {
      const db = await admin();
      await db.from("profiles").upsert(
        {
          telegram_id: user.id,
          first_name: user.first_name ?? null,
          last_name: saved.lastName,
          username: user.username ?? null,
          photo_url: user.photo_url ?? null,
          phone: saved.phone,
          address: saved.address,
        },
        { onConflict: "telegram_id" },
      );
    }
    return saved;
  });

export const webUserLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearWebUser } = await import("./web-user-session.server");
  clearWebUser();
  return { ok: true };
});

export const webUserUpdate = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; lastName: string; phone: string; address: string }) => input)
  .handler(async ({ data }) => {
    const { updateWebUser } = await import("./web-user-session.server");
    return { user: updateWebUser(data.name, data.lastName, data.phone, data.address) };
  });

/* ----------------------------------- feed ----------------------------------- */

export const listApproved = createServerFn({ method: "POST" })
  .inputValidator((input: FeedFilter) => input)
  .handler(async ({ data }) => {
    const platform = await loadPlatform();
    const region =
      platform.coverage === "region" ? safeSearch(platform.region) : "";
    const q = safeSearch(data.q);
    const city = safeSearch(data.city);
    const offset = Math.max(0, Math.floor(data.offset ?? 0));
    const currency = data.currency === "USD" || data.currency === "UZS" ? data.currency : undefined;
    const sort = data.sort === "cheap" || data.sort === "expensive" ? data.sort : "new";
    const filter = {
      ...data,
      q,
      city,
      offset,
      limit: PAGE,
      sort,
      ...(currency ? { currency } : {}),
      ...(region ? { region } : {}),
    };
    if (!databaseReady()) {
      const { listDemoApproved } = await import("./demo-listings.server");
      return listDemoApproved(filter);
    }
    const db = await admin();
    let query = db.from("listings").select(SELECT).eq("status", "approved");

    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (region) query = query.ilike("city", `%${region}%`);
    if (city) query = query.ilike("city", `%${city}%`);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (currency) query = query.eq("currency", currency);
    if (typeof data.min === "number") query = query.gte("price", data.min);
    if (typeof data.max === "number" && data.max > 0) query = query.lte("price", data.max);
    if (typeof data.rooms === "number" && data.rooms > 0) query = query.filter("attributes->>rooms", "gte", String(data.rooms));
    if (typeof data.area === "number" && data.area > 0) query = query.filter("attributes->>area", "gte", String(data.area));
    if (typeof data.year === "number" && data.year > 0) query = query.filter("attributes->>year", "gte", String(data.year));
    if (typeof data.mileage === "number" && data.mileage > 0) {
      query = query.filter("attributes->>mileage", "lte", String(data.mileage));
    }
    query =
      sort === "cheap"
        ? query.order("price", { ascending: true })
        : sort === "expensive"
          ? query.order("price", { ascending: false })
          : query.order("created_at", { ascending: false });

    const { data: rows, error } = await query.range(offset, offset + PAGE);
    if (error) throw new Error(error.message);
    return slicePage((rows ?? []).map(asListing), PAGE);
  });

export const listingsByIds = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[] }) => ({
    ids: (input.ids ?? []).filter((id) => typeof id === "string" && id.length < 80).slice(0, 50),
  }))
  .handler(async ({ data }) => {
    if (data.ids.length === 0) return [] as Listing[];
    if (!databaseReady()) {
      const { findDemoListing } = await import("./demo-listings.server");
      return data.ids
        .map((id) => findDemoListing(id))
        .filter((item): item is Listing => Boolean(item && item.status === "approved"));
    }
    const db = await admin();
    const { data: rows, error } = await db
      .from("listings")
      .select(SELECT)
      .in("id", data.ids)
      .eq("status", "approved");
    if (error) throw new Error(error.message);
    return (rows ?? []).map(asListing);
  });

export const getListing = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; initData?: string; countView?: boolean }) => input)
  .handler(async ({ data }) => {
    const { verifyInitData, isAdminId } = await import("./telegram.server");
    const { readWebAdminSession } = await import("./admin-session.server");
    const { readWebUser } = await import("./web-user-session.server");
    const viewer = verifyInitData(data.initData ?? "");
    const webUser = readWebUser();
    const webAdmin = readWebAdminSession();
    const ownerId = viewer?.id ?? webUser?.id;

    if (!databaseReady()) {
      const { findDemoListing, bumpDemoView } = await import("./demo-listings.server");
      const listing = findDemoListing(data.id);
      if (!listing) return null;
      const allowed =
        listing.status === "approved" ||
        webAdmin ||
        (ownerId != null && (isAdminId(ownerId) || ownerId === listing.owner_telegram_id));
      if (!allowed) return null;
      const counted =
        Boolean(data.countView) &&
        listing.status === "approved" &&
        ownerId !== listing.owner_telegram_id &&
        !(viewer && isAdminId(viewer.id)) &&
        !webAdmin;
      const next = counted ? bumpDemoView(data.id) ?? listing : listing;
      const visible = await withAccess(next, allowed && next.status !== "approved");
      return { ...visible, ...(await sellerCard(visible)) };
    }

    const db = await admin();
    const { data: row, error } = await db
      .from("listings")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const listing = asListing(row);
    const telegramAdmin = viewer ? isAdminId(viewer.id) : false;
    const allowed =
      listing.status === "approved" ||
      webAdmin ||
      telegramAdmin ||
      (ownerId != null && ownerId === listing.owner_telegram_id);
    if (!allowed) return null;

    const count =
      Boolean(data.countView) &&
      listing.status === "approved" &&
      ownerId !== listing.owner_telegram_id &&
      !telegramAdmin &&
      !webAdmin;
    if (count) {
      await db
        .from("listings")
        .update({ views: listing.views + 1 })
        .eq("id", listing.id);
      listing.views += 1;
    }
    const visible = await withAccess(listing, listing.status !== "approved");
    return { ...visible, ...(await sellerCard(visible)) };
  });

async function sellerCard(listing: Listing) {
  if (!databaseReady()) {
    const { demoSellerName, demoRelated } = await import("./demo-listings.server");
    return {
      sellerName: demoSellerName(listing.owner_telegram_id),
      more: demoRelated(listing.owner_telegram_id, listing.id),
    };
  }
  const db = await admin();
  const { data: profile } = await db
    .from("profiles")
    .select("first_name, last_name, username")
    .eq("telegram_id", listing.owner_telegram_id)
    .maybeSingle();
  const sellerName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "Sotuvchi";
  const { data: rows } = await db
    .from("listings")
    .select("id, title, price, currency, city")
    .eq("owner_telegram_id", listing.owner_telegram_id)
    .eq("status", "approved")
    .neq("id", listing.id)
    .limit(4);
  return {
    sellerName,
    more: (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      price: Number(row.price),
      currency: row.currency,
      city: row.city,
    })),
  };
}

/* --------------------------------- my listings ------------------------------- */

export const myListings = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    if (!databaseReady()) {
      const { listDemoMine } = await import("./demo-listings.server");
      const rows = listDemoMine(owner.id);
      return Promise.all(rows.map((row) => withAccess(row, true)));
    }
    const db = await admin();
    const { data: rows, error } = await db
      .from("listings")
      .select(SELECT)
      .eq("owner_telegram_id", owner.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return Promise.all((rows ?? []).map((row) => withAccess(asListing(row), true)));
  });

export const createListing = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; payload: ListingInput }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    const platform = await loadPlatform();
    if (!platform.userPosting) throw new Error("E'lon joylash yopiq. E'lonlarni admin joylaydi.");
    validate(data.payload);
    assertCreateRate(owner.id);
    const attributes = cleanAttributes(data.payload.category, data.payload.attributes);
    assertImages(owner.id, data.payload.images);
    if (!databaseReady()) {
      const { addDemoListing } = await import("./demo-listings.server");
      const fee = await currentFee();
      return addDemoListing(owner.id, { ...data.payload, attributes }, "pending", {
        fee,
        paymentStatus: fee > 0 ? "unpaid" : "paid",
      });
    }
    const db = await admin();
    const fee = await currentFee();
    const { data: row, error } = await db
      .from("listings")
      .insert({
        owner_telegram_id: owner.id,
        category: data.payload.category,
        title: data.payload.title.trim(),
        description: data.payload.description.trim(),
        price: data.payload.price,
        currency: data.payload.currency,
        city: data.payload.city.trim(),
        phone: data.payload.phone.trim(),
        images: data.payload.images,
        attributes,
        status: "pending",
        placement_fee: fee,
        payment_status: fee > 0 ? "unpaid" : "paid",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

export const updateListing = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string; payload: ListingInput }) => input)
  .handler(async ({ data }) => {
    const { isAdminId } = await import("./telegram.server");
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    validate(data.payload);
    const attributes = cleanAttributes(data.payload.category, data.payload.attributes);
    assertImages(owner.id, data.payload.images);
    const telegramAdmin = owner.telegram ? isAdminId(owner.telegram.id) : false;
    if (!databaseReady()) {
      const { updateDemoListing } = await import("./demo-listings.server");
      updateDemoListing(data.id, owner.id, telegramAdmin, { ...data.payload, attributes });
      return { ok: true };
    }
    const db = await admin();
    const { data: row } = await db
      .from("listings")
      .select("owner_telegram_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("E'lon topilmadi");
    if (row.owner_telegram_id !== owner.id && !telegramAdmin) throw new Error("Ruxsat yo'q");

    const { error } = await db
      .from("listings")
      .update({
        category: data.payload.category,
        title: data.payload.title.trim(),
        description: data.payload.description.trim(),
        price: data.payload.price,
        currency: data.payload.currency,
        city: data.payload.city.trim(),
        phone: data.payload.phone.trim(),
        images: data.payload.images,
        attributes,
        ...(telegramAdmin ? {} : { status: "pending" }),
        reject_reason: null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string }) => input)
  .handler(async ({ data }) => {
    const { isAdminId } = await import("./telegram.server");
    const { readWebAdminSession } = await import("./admin-session.server");
    const owner = await resolveOwner(data.initData);
    const webAdmin = readWebAdminSession();
    if (!owner && !webAdmin) throw new Error("Avval ism va telefoningizni kiriting");
    const telegramAdmin = owner?.telegram ? isAdminId(owner.telegram.id) : false;
    if (!databaseReady()) {
      const { deleteDemoListing, findDemoListing } = await import("./demo-listings.server");
      const listing = findDemoListing(data.id);
      if (!listing) return { ok: true };
      if (!webAdmin && !telegramAdmin && listing.owner_telegram_id !== owner?.id) {
        throw new Error("Ruxsat yo'q");
      }
      deleteDemoListing(data.id);
      return { ok: true };
    }
    const db = await admin();
    const { data: row } = await db
      .from("listings")
      .select("owner_telegram_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };
    if (!webAdmin && !telegramAdmin && row.owner_telegram_id !== owner?.id) {
      throw new Error("Ruxsat yo'q");
    }
    const { error } = await db.from("listings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------- upload ---------------------------------- */

export const uploadListingImage = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; dataUrl: string; forAdmin?: boolean }) => input)
  .handler(async ({ data }) => {
    let ownerId: number;
    if (data.forAdmin) {
      const user = await requireAdmin(data.initData);
      ownerId = user?.id ?? 1;
    } else {
      const owner = await resolveOwner(data.initData);
      if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
      ownerId = owner.id;
    }
    const { parseDataUrl, putImage } = await import("./local-images.server");
    const parsed = parseDataUrl(data.dataUrl);
    if (!parsed) throw new Error("Rasm noto'g'ri yoki juda katta");
    const path = `${ownerId}/${crypto.randomUUID()}.jpg`;
    putImage(path, parsed.type, parsed.bytes);
    if (!databaseReady()) return { path };
    const db = await admin();
    const { error } = await db.storage.from("listing-images").upload(path, Buffer.from(parsed.bytes), {
      contentType: parsed.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { path };
  });

export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; ext: string; forAdmin?: boolean }) => input)
  .handler(async ({ data }) => {
    let ownerId: number;
    if (data.forAdmin) {
      const user = await requireAdmin(data.initData);
      ownerId = user?.id ?? 1;
    } else {
      const owner = await resolveOwner(data.initData);
      if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
      ownerId = owner.id;
    }
    const safeExt = /^(jpg|jpeg|png|webp|gif)$/i.test(data.ext) ? data.ext.toLowerCase() : "jpg";
    const path = `${ownerId}/${crypto.randomUUID()}.${safeExt}`;
    const db = await admin();
    const { data: signed, error } = await db.storage
      .from("listing-images")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Yuklash imkonsiz");
    return { path, token: signed.token };
  });

/* ----------------------------------- admin ----------------------------------- */

async function requireAdmin(initData: string) {
  const { verifyInitData, isAdminId } = await import("./telegram.server");
  const { readWebAdminSession } = await import("./admin-session.server");
  const user = verifyInitData(initData);
  if (user) {
    if (!isAdminId(user.id)) throw new Error("Faqat admin uchun");
    return user;
  }
  if (readWebAdminSession()) return null;
  throw new Error("Kirish talab qilinadi");
}

export const adminListings = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { initData: string; status: string; q?: string; city?: string; offset?: number }) =>
      input,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const q = safeSearch(data.q);
    const city = safeSearch(data.city);
    const offset = Math.max(0, Math.floor(data.offset ?? 0));
    if (!databaseReady()) {
      const { listDemoAdmin } = await import("./demo-listings.server");
      const page = listDemoAdmin({ status: data.status, q, city, offset, limit: ADMIN_PAGE });
      return {
        hasMore: page.hasMore,
        items: await Promise.all(page.items.map((item) => withAccess(item, true))),
      };
    }
    const db = await admin();
    let query = db.from("listings").select(SELECT).order("created_at", { ascending: false });
    if (data.status !== "all") query = query.eq("status", data.status);
    if (city) query = query.ilike("city", `%${city}%`);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    const { data: rows, error } = await query.range(offset, offset + ADMIN_PAGE);
    if (error) throw new Error(error.message);
    const page = slicePage((rows ?? []).map(asListing), ADMIN_PAGE);
    page.items = await Promise.all(page.items.map((item) => withAccess(item, true)));
    return page;
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { initData: string; id: string; status: string; reason?: string }) => input,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    if (!["approved", "rejected", "pending", "hidden"].includes(data.status)) {
      throw new Error("Noto'g'ri holat");
    }
    const { notifyTelegram } = await import("./telegram.server");
    if (!databaseReady()) {
      const { setDemoStatus, findDemoListing } = await import("./demo-listings.server");
      const current = findDemoListing(data.id);
      if (data.status === "approved" && current && current.payment_status !== "paid") {
        throw new Error("Avval to'lovni qabul qiling");
      }
      const listing = setDemoStatus(data.id, data.status, data.reason);
      if (data.status === "approved" || data.status === "rejected") {
        const reason = data.reason?.trim();
        await notifyTelegram(
          listing.owner_telegram_id,
          data.status === "approved"
            ? `E'loningiz tasdiqlandi: ${listing.title}`
            : `E'loningiz rad etildi: ${listing.title}${reason ? `. Sabab: ${reason}` : ""}`,
        );
      }
      return { ok: true };
    }
    const db = await admin();
    const { data: current } = await db
      .from("listings")
      .select("owner_telegram_id, title, payment_status")
      .eq("id", data.id)
      .maybeSingle();
    if (data.status === "approved" && current?.payment_status !== "paid") {
      throw new Error("Avval to'lovni qabul qiling");
    }
    const { error } = await db
      .from("listings")
      .update({ status: data.status, reject_reason: data.reason ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (current && (data.status === "approved" || data.status === "rejected")) {
      const reason = data.reason?.trim();
      await notifyTelegram(
        current.owner_telegram_id,
        data.status === "approved"
          ? `E'loningiz tasdiqlandi: ${current.title}`
          : `E'loningiz rad etildi: ${current.title}${reason ? `. Sabab: ${reason}` : ""}`,
      );
    }
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    if (!databaseReady()) {
      const { demoStats } = await import("./demo-listings.server");
      return demoStats();
    }
    const db = await admin();
    const count = async (status?: string) => {
      let q = db.from("listings").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      const { count: c } = await q;
      return c ?? 0;
    };
    const { count: users } = await db
      .from("profiles")
      .select("telegram_id", { count: "exact", head: true });
    return {
      total: await count(),
      pending: await count("pending"),
      approved: await count("approved"),
      rejected: await count("rejected"),
      hidden: await count("hidden"),
      users: users ?? 0,
    };
  });

export type Customer = {
  id: number;
  name: string;
  phone: string;
  city: string;
  listings: number;
};

async function loadCustomers(): Promise<Customer[]> {
  if (!databaseReady()) {
    const { demoCustomers } = await import("./demo-listings.server");
    return demoCustomers();
  }
  const db = await admin();
  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("telegram_id, first_name, last_name, username, phone");
  if (profileError) throw new Error(profileError.message);
  const { data: rows, error } = await db.from("listings").select("owner_telegram_id, phone, city");
  if (error) throw new Error(error.message);

  const map = new Map<number, Customer>();
  for (const profile of profiles ?? []) {
    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      profile.username ||
      "Mijoz";
    map.set(profile.telegram_id, {
      id: profile.telegram_id,
      name,
      phone: profile.phone ?? "",
      city: "",
      listings: 0,
    });
  }
  for (const row of rows ?? []) {
    const current = map.get(row.owner_telegram_id) ?? {
      id: row.owner_telegram_id,
      name: "Mijoz",
      phone: row.phone ?? "",
      city: row.city ?? "",
      listings: 0,
    };
    current.listings += 1;
    if (!current.phone && row.phone) current.phone = row.phone;
    if (!current.city && row.city) current.city = row.city;
    map.set(row.owner_telegram_id, current);
  }
  return [...map.values()].sort(
    (a, b) => b.listings - a.listings || a.name.localeCompare(b.name, "uz"),
  );
}

export const adminCustomers = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    return loadCustomers();
  });

export const adminCreateListing = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; payload: ListingInput }) => input)
  .handler(async ({ data }) => {
    const user = await requireAdmin(data.initData);
    validate(data.payload);
    const ownerId = user?.id ?? 1;
    const attributes = cleanAttributes(data.payload.category, data.payload.attributes);
    assertImages(ownerId, data.payload.images);
    if (!databaseReady()) {
      const { addDemoListing } = await import("./demo-listings.server");
      return addDemoListing(ownerId, { ...data.payload, attributes }, "approved");
    }
    const db = await admin();
    const { data: row, error } = await db
      .from("listings")
      .insert({
        owner_telegram_id: ownerId,
        category: data.payload.category,
        title: data.payload.title.trim(),
        description: data.payload.description.trim(),
        price: data.payload.price,
        currency: data.payload.currency,
        city: data.payload.city.trim(),
        phone: data.payload.phone.trim(),
        images: data.payload.images,
        attributes,
        status: "approved",
        placement_fee: 0,
        payment_status: "paid",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

async function chatParty(customerId: number): Promise<Customer | null> {
  const customers = await loadCustomers();
  const found = customers.find((item) => item.id === customerId);
  if (found) return found;
  const { contactOf, lastMessage } = await import("./admin-chat.server");
  const contact = contactOf(customerId);
  if (!contact && !lastMessage(customerId)) return null;
  return {
    id: customerId,
    name: contact?.name || "Mijoz",
    phone: contact?.phone || "",
    city: "",
    listings: 0,
  };
}

export const adminChatThreads = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { lastMessage, chatCustomerIds } = await import("./admin-chat.server");
    const customers = await loadCustomers();
    const ids = new Set<number>([...customers.map((item) => item.id), ...chatCustomerIds()]);
    const rows = [];
    for (const id of ids) {
      const last = lastMessage(id);
      if (!last) continue;
      const customer = await chatParty(id);
      if (!customer) continue;
      const preview = last.text || (last.orderCode ? `Buyurtma ${last.orderCode}` : last.image ? "Chek rasmi" : "");
      rows.push({ ...customer, last: preview, at: last.at, from: last.from });
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  });

export const adminChatMessages = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; customerId: number }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const customer = await chatParty(data.customerId);
    if (!customer) throw new Error("Mijoz topilmadi");
    const { messagesFor } = await import("./admin-chat.server");
    return { customer, messages: messagesFor(data.customerId) };
  });

export const adminSendChat = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; customerId: number; text: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const customer = await chatParty(data.customerId);
    if (!customer) throw new Error("Mijoz topilmadi");
    const { pushAdminMessage } = await import("./admin-chat.server");
    return pushAdminMessage(data.customerId, data.text);
  });

export const userChat = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    const { messagesFor } = await import("./admin-chat.server");
    const platform = await loadPlatform();
    return { messages: messagesFor(owner.id), adminName: platform.managerName || "Admin" };
  });

export const userSendChat = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { initData: string; text: string; image?: string; listingId?: string }) => input,
  )
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    const name = owner.telegram
      ? [owner.telegram.first_name, owner.telegram.last_name || owner.profile?.lastName]
          .filter(Boolean)
          .join(" ") ||
        owner.telegram.username ||
        "Mijoz"
      : owner.web.name;
    const phone = owner.profile?.phone || (owner.telegram ? "" : owner.web.phone);
    const extra: { image?: string; listingId?: string; orderCode?: string } = {};
    if (data.listingId) {
      const listing = await ownedListing(owner.id, data.listingId);
      if (!listing) throw new Error("E'lon topilmadi");
      extra.listingId = listing.id;
      const { orderCode } = await import("./telegram");
      extra.orderCode = orderCode(listing.id);
    }
    if (data.image) {
      const { parseDataUrl } = await import("./local-images.server");
      if (!parseDataUrl(data.image)) throw new Error("Chek rasmi noto'g'ri");
      extra.image = data.image;
    }
    const { pushCustomerMessage } = await import("./admin-chat.server");
    return pushCustomerMessage(owner.id, data.text, { name, phone }, extra);
  });

async function ownedListing(ownerId: number, listingId: string) {
  if (!databaseReady()) {
    const { findDemoListing } = await import("./demo-listings.server");
    const listing = findDemoListing(listingId);
    if (!listing || listing.owner_telegram_id !== ownerId) return null;
    return { id: listing.id };
  }
  const db = await admin();
  const { data } = await db
    .from("listings")
    .select("id, owner_telegram_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!data || data.owner_telegram_id !== ownerId) return null;
  return { id: data.id };
}

function personName(owner: {
  telegram: { first_name?: string; last_name?: string; username?: string } | null;
  profile?: { lastName?: string };
  web?: { name: string; lastName?: string };
}) {
  if (owner.telegram) {
    return (
      [owner.telegram.first_name, owner.telegram.last_name || owner.profile?.lastName]
        .filter(Boolean)
        .join(" ") ||
      owner.telegram.username ||
      "Foydalanuvchi"
    );
  }
  return [owner.web?.name, owner.web?.lastName].filter(Boolean).join(" ") || "Foydalanuvchi";
}

export const userFavorites = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; localIds?: string[] }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) return { ids: [] as string[] };
    const { mergeFavorites, readFavorites } = await import("./favorites.server");
    const local = (data.localIds ?? []).filter((id) => typeof id === "string");
    const ids = local.length ? mergeFavorites(owner.id, local) : readFavorites(owner.id);
    return { ids };
  });

export const userToggleFavorite = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    const { toggleFavorite } = await import("./favorites.server");
    return { ids: toggleFavorite(owner.id, data.id) };
  });

export const userReportListing = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string; reason: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    const { addReport } = await import("./reports.server");
    return addReport(data.id, owner.id, data.reason);
  });

export const adminListingReports = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { reportsFor } = await import("./reports.server");
    return reportsFor(data.id);
  });

async function briefListing(id: string) {
  if (!databaseReady()) {
    const { findDemoListing } = await import("./demo-listings.server");
    const listing = findDemoListing(id);
    if (!listing) return null;
    return { id: listing.id, title: listing.title, ownerId: listing.owner_telegram_id };
  }
  const db = await admin();
  const { data } = await db.from("listings").select("id, title, owner_telegram_id").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, title: data.title, ownerId: data.owner_telegram_id };
}

const replySeed = new Set<number>();

async function ensureDemoReplies(owner: {
  id: number;
  telegram: { first_name?: string; last_name?: string; username?: string } | null;
  profile?: { phone: string; lastName?: string };
  web?: { name: string; phone: string };
}) {
  if (databaseReady() || replySeed.has(owner.id)) return;
  replySeed.add(owner.id);
  const { addDemoListing, findDemoListing, listDemoMine } = await import("./demo-listings.server");
  const { rememberSellerMessage } = await import("./seller-chat.server");
  let mine = listDemoMine(owner.id);
  if (mine.length === 0) {
    const phone = owner.profile?.phone || owner.web?.phone || "+998 90 000 00 00";
    addDemoListing(
      owner.id,
      {
        category: "uy",
        title: "Chilonzordagi 3 xonali",
        description: "Yevro ta'mir, 4-qavat, 68 m². Maktab yaqin.",
        price: 85000,
        currency: "USD",
        city: "Toshkent, Chilonzor",
        phone,
        images: ["/demo/uy-4.jpg", "/demo/uy-5.jpg"],
        attributes: { rooms: 3, area: 68 },
      },
      "approved",
      { fee: 20000, paymentStatus: "paid" },
    );
    addDemoListing(
      owner.id,
      {
        category: "mashina",
        title: "Cobalt, 2021",
        description: "Avtomat, oq rang, 54 000 km.",
        price: 138000000,
        currency: "UZS",
        city: "Toshkent",
        phone,
        images: ["/demo/mashina-1.jpg", "/demo/mashina-4.jpg"],
        attributes: { year: 2021, mileage: 54000 },
      },
      "approved",
      { fee: 20000, paymentStatus: "paid" },
    );
    mine = listDemoMine(owner.id);
  }

  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  const write = (
    listing: { id: string; title: string; ownerId: number },
    buyerId: number,
    buyerName: string,
    lines: Array<["buyer" | "owner", string, number]>,
  ) => {
    for (const [from, text, minutes] of lines) {
      rememberSellerMessage({
        listingId: listing.id,
        listingTitle: listing.title,
        ownerId: listing.ownerId,
        buyerId,
        buyerName,
        from,
        text,
        at: ago(minutes),
      });
    }
  };

  const own = mine.slice(0, 2).map((listing) => ({
    id: listing.id,
    title: listing.title,
    ownerId: listing.owner_telegram_id,
  }));
  const first = own[0];
  const second = own[1];
  if (first) {
    write(first, 910000000001, "Madina", [
      ["buyer", "Assalomu alaykum, e'lon hali joyidami?", 50],
      ["owner", "Ha, joyida. Qachon kelib ko'rasiz?", 28],
      ["buyer", "Ertaga soat 4 da kelsam bo'ladimi?", 6],
    ]);
  }
  if (second) {
    write(second, 910000000002, "Sardor", [
      ["buyer", "Narxida biroz kelishsak bo'ladimi?", 36],
      ["owner", "Ha, kelib ko'rsangiz gaplashamiz.", 16],
      ["buyer", "Bugun kechqurun mos. Manzilni yuborasizmi?", 3],
    ]);
  }

  const name = personName(owner);
  const scripts: Array<Array<["buyer" | "owner", string, number]>> = [
    [
      ["buyer", "Salom, hali sotilmaganmi?", 44],
      ["owner", "Hali bor. Toshkentda ko'rsataman, qachon qulay?", 8],
    ],
    [
      ["buyer", "Bitta egasimi, servisi qanday?", 33],
      ["owner", "Bitta egasi. Servis daftari bor, ertaga ko'rsataman.", 5],
    ],
  ];
  const others = ["demo-telefon", "demo-mashina-camry", "demo-uy-samarqand"]
    .map((id) => findDemoListing(id))
    .filter((listing) => listing && listing.owner_telegram_id !== owner.id)
    .slice(0, 2);
  others.forEach((listing, index) => {
    const lines = scripts[index];
    if (!listing || !lines) return;
    write(
      { id: listing.id, title: listing.title, ownerId: listing.owner_telegram_id },
      owner.id,
      name,
      lines,
    );
  });
}

export const listingThread = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; listingId: string; buyerId?: number }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    await ensureDemoReplies(owner);
    const listing = await briefListing(data.listingId);
    if (!listing) throw new Error("E'lon topilmadi");
    const { threadMessages, threadsFor } = await import("./seller-chat.server");
    if (owner.id === listing.ownerId) {
      const buyers = threadsFor(owner.id).filter((item) => item.listingId === listing.id);
      const buyerId = data.buyerId && buyers.some((item) => item.buyerId === data.buyerId) ? data.buyerId : buyers[0]?.buyerId;
      return {
        role: "owner" as const,
        title: listing.title,
        buyerId: buyerId ?? 0,
        buyerName: buyers.find((item) => item.buyerId === buyerId)?.buyerName ?? "",
        buyers: buyers.map((item) => ({
          buyerId: item.buyerId,
          buyerName: item.buyerName,
          text: item.text,
          at: item.at,
        })),
        messages: buyerId ? threadMessages(listing.id, buyerId) : [],
      };
    }
    return {
      role: "buyer" as const,
      title: listing.title,
      buyerId: owner.id,
      buyerName: personName(owner),
      buyers: [],
      messages: threadMessages(listing.id, owner.id),
    };
  });

export const sendListingMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; listingId: string; text: string; buyerId?: number }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    const listing = await briefListing(data.listingId);
    if (!listing) throw new Error("E'lon topilmadi");
    const { pushSellerMessage, threadMessages } = await import("./seller-chat.server");
    if (owner.id === listing.ownerId) {
      const buyerId = data.buyerId;
      if (!buyerId) throw new Error("Xaridor tanlanmagan");
      const known = threadMessages(listing.id, buyerId)[0];
      return pushSellerMessage({
        listingId: listing.id,
        listingTitle: listing.title,
        ownerId: listing.ownerId,
        buyerId,
        buyerName: known?.buyerName || "Xaridor",
        from: "owner",
        text: data.text,
      });
    }
    return pushSellerMessage({
      listingId: listing.id,
      listingTitle: listing.title,
      ownerId: listing.ownerId,
      buyerId: owner.id,
      buyerName: personName(owner),
      from: "buyer",
      text: data.text,
    });
  });

export const userThreads = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) return [];
    await ensureDemoReplies(owner);
    const { threadsFor } = await import("./seller-chat.server");
    return threadsFor(owner.id);
  });

export const userNotices = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) return [];
    return buildNotices(owner.id, owner);
  });

async function loadMine(userId: number) {
  if (!databaseReady()) {
    const { listDemoMine } = await import("./demo-listings.server");
    return listDemoMine(userId);
  }
  const db = await admin();
  const { data, error } = await db.from("listings").select(SELECT).eq("owner_telegram_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(asListing);
}

async function buildNotices(userId: number, owner?: Parameters<typeof ensureDemoReplies>[0]) {
  if (owner) await ensureDemoReplies(owner);
  const items: { id: string; title: string; body: string; at: string; href: string }[] = [];
  for (const listing of await loadMine(userId)) {
    if (listing.status !== "pending" && listing.status !== "rejected") continue;
    items.push({
      id: `status-${listing.id}`,
      title: listing.title,
      body:
        listing.status === "pending"
          ? "Admin tekshiruvida"
          : `Rad etildi${listing.reject_reason ? `: ${listing.reject_reason}` : ""}`,
      at: listing.created_at,
      href: "/my",
    });
  }
  const { lastMessage } = await import("./admin-chat.server");
  const adminLast = lastMessage(userId);
  if (adminLast?.from === "admin") {
    items.push({
      id: `admin-${adminLast.id}`,
      title: "Admin javobi",
      body: adminLast.text,
      at: adminLast.at,
      href: "/chat",
    });
  }
  const { threadsFor } = await import("./seller-chat.server");
  for (const thread of threadsFor(userId)) {
    const incoming = thread.ownerId === userId ? thread.from === "buyer" : thread.from === "owner";
    if (!incoming) continue;
    items.push({
      id: `seller-${thread.id}`,
      title: thread.listingTitle,
      body: thread.text,
      at: thread.at,
      href: `/messages/${thread.listingId}${thread.ownerId === userId ? `?buyer=${thread.buyerId}` : ""}`,
    });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

export const userDesk = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) return null;
    await ensureDemoReplies(owner);
    const listings = await loadMine(owner.id);
    const { readFavorites } = await import("./favorites.server");
    const { threadsFor } = await import("./seller-chat.server");
    const platform = await loadPlatform();
    return {
      userId: owner.id,
      name: personName(owner),
      firstName: owner.telegram?.first_name ?? owner.web?.name ?? "",
      lastName: owner.telegram?.last_name || owner.profile?.lastName || owner.web?.lastName || "",
      phone: owner.profile?.phone || owner.web?.phone || "",
      address: owner.profile?.address || owner.web?.address || "",
      telegram: Boolean(owner.telegram),
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        status: listing.status,
        views: listing.views,
        payment_status: listing.payment_status,
      })),
      views: listings.reduce((sum, listing) => sum + listing.views, 0),
      favorites: readFavorites(owner.id).length,
      threads: threadsFor(owner.id).slice(0, 4),
      notices: (await buildNotices(owner.id, owner)).slice(0, 4),
      payCard: platform.payCard,
      payClick: platform.payClick,
      payPayme: platform.payPayme,
    };
  });

export const publicPlatform = createServerFn({ method: "POST" }).handler(async () => loadPlatform());

export const adminSavePlatform = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      initData: string;
      campaignName: string;
      managerName: string;
      coverage: "country" | "region";
      region: string;
      userPosting: boolean;
      payCard: string;
      payClick: string;
      payPayme: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { writePlatform } = await import("./platform.server");
    const saved = writePlatform({
      campaignName: data.campaignName,
      managerName: data.managerName,
      coverage: data.coverage,
      region: data.region,
      userPosting: data.userPosting,
      payCard: data.payCard,
      payClick: data.payClick,
      payPayme: data.payPayme,
    });
    if (databaseReady()) {
      const db = await admin();
      const { error } = await db
        .from("platform_settings")
        .upsert({ key: "platform", value: JSON.stringify(saved) }, { onConflict: "key" });
      if (error) throw new Error(error.message);
    }
    return saved;
  });

async function incomeTotals() {
  if (!databaseReady()) {
    const { demoIncome } = await import("./demo-listings.server");
    return demoIncome();
  }
  const db = await admin();
  const { data, error } = await db.from("listings").select("placement_fee, payment_status, status");
  if (error) throw new Error(error.message);
  let income = 0;
  let paidCount = 0;
  let waiting = 0;
  for (const row of data ?? []) {
    const fee = Number(row.placement_fee ?? 0);
    if (row.payment_status === "paid" && fee > 0) {
      income += fee;
      paidCount += 1;
    } else if (
      fee > 0 &&
      (row.payment_status === "checking" ||
        (row.payment_status === "unpaid" && row.status === "pending"))
    ) {
      waiting += fee;
    }
  }
  return { income, paidCount, waiting };
}

export const adminDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { listExpenses } = await import("./expenses.server");
    const expenses = listExpenses().map((item) => ({
      created_at: item.created_at,
      amount: item.amount,
    }));
    if (!databaseReady()) {
      const { demoActivity } = await import("./demo-listings.server");
      return { rows: demoActivity(), expenses };
    }
    const db = await admin();
    const { data: rows, error } = await db
      .from("listings")
      .select(
        "id, created_at, owner_telegram_id, category, city, status, views, placement_fee, payment_status, title",
      );
    if (error) throw new Error(error.message);
    return {
      rows: (rows ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        owner: row.owner_telegram_id,
        category: row.category,
        city: row.city ?? "",
        status: row.status,
        views: row.views ?? 0,
        fee: Number(row.placement_fee ?? 0),
        payment: row.payment_status ?? "unpaid",
        title: row.title,
      })),
      expenses,
    };
  });

export const adminFinance = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { listExpenses } = await import("./expenses.server");
    const totals = await incomeTotals();
    const expenses = listExpenses();
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    return { ...totals, expenses, expenseTotal, balance: totals.income - expenseTotal };
  });

export const adminAddExpense = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; title: string; amount: number }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { addExpense } = await import("./expenses.server");
    return addExpense(data.title, data.amount);
  });

export const adminRemoveExpense = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const { removeExpense } = await import("./expenses.server");
    return removeExpense(data.id);
  });

export const placementFee = createServerFn({ method: "POST" }).handler(async () => {
  return { amount: await currentFee() };
});

export const adminSetPlacementFee = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; amount: number }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    const amount = Math.round(Number(data.amount));
    if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) {
      throw new Error("Joylashtirish narxi noto'g'ri");
    }
    if (!databaseReady()) {
      const { writePlacementFee } = await import("./placement.server");
      return { amount: writePlacementFee(amount) };
    }
    const db = await admin();
    const { error } = await db
      .from("platform_settings")
      .upsert({ key: "placement_fee", value: String(amount) }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { amount };
  });

export const claimListingPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string }) => input)
  .handler(async ({ data }) => {
    const owner = await resolveOwner(data.initData);
    if (!owner) throw new Error("Avval ism va telefoningizni kiriting");
    if (!databaseReady()) {
      const { claimDemoPayment } = await import("./demo-listings.server");
      const { orderCode } = await import("./telegram");
      const listing = claimDemoPayment(data.id, owner.id);
      return { listingId: listing.id, orderCode: orderCode(listing.id), paymentStatus: listing.payment_status };
    }
    const db = await admin();
    const { data: row } = await db
      .from("listings")
      .select("owner_telegram_id, payment_status, placement_fee")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.owner_telegram_id !== owner.id) throw new Error("Ruxsat yo'q");
    if (row.payment_status === "paid") throw new Error("To'lov allaqachon qabul qilingan");
    const next = Number(row.placement_fee) > 0 ? "checking" : "paid";
    const { error } = await db.from("listings").update({ payment_status: next }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { orderCode } = await import("./telegram");
    return { listingId: data.id, orderCode: orderCode(data.id), paymentStatus: next };
  });

export const adminSetPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; id: string; paymentStatus: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin(data.initData);
    if (data.paymentStatus !== "paid" && data.paymentStatus !== "unpaid") {
      throw new Error("Noto'g'ri to'lov holati");
    }
    const { notifyTelegram } = await import("./telegram.server");
    if (!databaseReady()) {
      const { setDemoPayment } = await import("./demo-listings.server");
      const listing = setDemoPayment(data.id, data.paymentStatus);
      await notifyTelegram(
        listing.owner_telegram_id,
        data.paymentStatus === "paid"
          ? `Joylashtirish to'lovi qabul qilindi: ${listing.title}`
          : `Joylashtirish to'lovi qabul qilinmadi: ${listing.title}`,
      );
      return { ok: true };
    }
    const db = await admin();
    const { data: current } = await db
      .from("listings")
      .select("owner_telegram_id, title")
      .eq("id", data.id)
      .maybeSingle();
    if (!current) throw new Error("E'lon topilmadi");
    const { error } = await db
      .from("listings")
      .update({ payment_status: data.paymentStatus })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await notifyTelegram(
      current.owner_telegram_id,
      data.paymentStatus === "paid"
        ? `Joylashtirish to'lovi qabul qilindi: ${current.title}`
        : `Joylashtirish to'lovi qabul qilinmadi: ${current.title}`,
    );
    return { ok: true };
  });
