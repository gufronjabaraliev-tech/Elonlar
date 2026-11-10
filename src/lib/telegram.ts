export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TgUser };
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  requestContact?: (callback?: (shared: boolean) => void) => void;
  openLink?: (url: string) => void;
  HapticFeedback?: { impactOccurred: (s: string) => void };
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void };
};

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? "";
}

export const CATEGORIES = [
  { value: "uy", label: "Uylar" },
  { value: "mashina", label: "Mashinalar" },
  { value: "boshqa", label: "Boshqa" },
] as const;

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Boshqa";
}

export function postedAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "";
  if (days === 0) return "Bugun";
  if (days === 1) return "Kecha";
  return `${days} kun oldin`;
}

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function orderCode(id: string) {
  let n = 2166136261;
  for (const ch of id) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  n >>>= 0;
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += ORDER_ALPHABET[n % ORDER_ALPHABET.length] ?? "2";
    n = Math.floor(n / ORDER_ALPHABET.length);
  }
  return out;
}

export function formatPrice(price: number, currency: string) {
  const n = new Intl.NumberFormat("uz-UZ").format(price);
  return `${n} ${currency === "USD" ? "$" : "so'm"}`;
}

export function imageUrl(path: string, token?: string | null) {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = `/api/public/img/${path}`;
  return token ? `${base}?t=${encodeURIComponent(token)}` : base;
}

export function attributeLine(listing: {
  category: string;
  attributes?: { rooms?: number; area?: number; year?: number; mileage?: number } | null;
}) {
  const extra = listing.attributes ?? {};
  if (listing.category === "uy") {
    return [extra.rooms ? `${extra.rooms} xona` : "", extra.area ? `${extra.area} m²` : ""]
      .filter(Boolean)
      .join(" · ");
  }
  if (listing.category === "mashina") {
    return [
      extra.year ? String(extra.year) : "",
      typeof extra.mileage === "number"
        ? `${new Intl.NumberFormat("uz-UZ").format(extra.mileage)} km`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

export function mapUrl(place: string, point?: { lat?: number; lng?: number }) {
  const lat = point?.lat;
  const lng = point?.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://yandex.uz/maps/?ll=${lng}%2C${lat}&z=16&pt=${lng},${lat}`;
  }
  return `https://yandex.uz/maps/?text=${encodeURIComponent(place)}`;
}
