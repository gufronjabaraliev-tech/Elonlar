import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ListingCard } from "@/components/ListingCard";
import { SideScroll } from "@/components/SideScroll";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES } from "@/lib/telegram";
import { listApproved, publicPlatform } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E'lonlar — uy va mashina e'lonlari" },
      {
        name: "description",
        content:
          "Uy, mashina va boshqa e'lonlarni ko'ring, qidiring va o'z e'loningizni Telegram orqali joylang.",
      },
      { property: "og:title", content: "E'lonlar — uy va mashina e'lonlari" },
      {
        property: "og:description",
        content: "Uy, mashina va boshqa e'lonlar bir joyda. Telegram orqali e'lon joylang.",
      },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [city, setCity] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [currency, setCurrency] = useState("all");
  const [sort, setSort] = useState<"new" | "cheap" | "expensive">("new");
  const [rooms, setRooms] = useState("");
  const [area, setArea] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const fetchList = useServerFn(listApproved);
  const fetchPlatform = useServerFn(publicPlatform);
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const money = currency === "USD" || currency === "UZS" ? currency : "";
  const priceSort = money ? sort : "new";
  const scope = platform.data?.coverage === "region" ? platform.data.region : "country";
  const list = useInfiniteQuery({
    queryKey: ["listings", category, search, city, min, max, money, priceSort, rooms, area, year, mileage, scope],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchList({
        data: {
          category,
          offset: pageParam,
          sort: priceSort,
          ...(search ? { q: search } : {}),
          ...(city ? { city } : {}),
          ...(min ? { min: Number(min) } : {}),
          ...(max ? { max: Number(max) } : {}),
          ...(money ? { currency: money } : {}),
          ...(category === "uy" && rooms ? { rooms: Number(rooms) } : {}),
          ...(category === "uy" && area ? { area: Number(area) } : {}),
          ...(category === "mashina" && year ? { year: Number(year) } : {}),
          ...(category === "mashina" && mileage ? { mileage: Number(mileage) } : {}),
        },
      }),
    getNextPageParam: (last, _pages, pageParam) =>
      last.hasMore ? pageParam + last.items.length : undefined,
  });
  const data = list.data?.pages.flatMap((page) => page.items) ?? [];

  const tabs = [{ value: "all", label: "Barchasi" }, ...CATEGORIES];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">
          {platform.data?.campaignName || "Uy va mashina e'lonlari"}
        </h1>
        <p className="mt-1 text-sm opacity-80">
          {platform.data?.coverage === "region" && platform.data.region
            ? `${platform.data.region} bo'yicha e'lonlar.`
            : "Butun mamlakat bo'yicha e'lonlar."}
        </p>
      </section>

      <div className="flex gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish..."
            className="rounded-xl pl-9 pr-9"
          />
          {q ? (
            <button
              type="button"
              aria-label="Qidiruvni tozalash"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground"
              onClick={() => {
                setQ("");
                setSearch("");
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-xl"
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Filtrlar"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showFilters ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-card p-3 sm:grid-cols-4">
          <Input placeholder="Shahar" value={city} onChange={(e) => setCity(e.target.value)} />
          {category === "uy" ? (
            <>
              <Input placeholder="Kamida xona" inputMode="numeric" value={rooms} onChange={(e) => setRooms(e.target.value.replace(/\D/g, ""))} />
              <Input placeholder="Kamida m²" inputMode="numeric" value={area} onChange={(e) => setArea(e.target.value.replace(/\D/g, ""))} />
            </>
          ) : null}
          {category === "mashina" ? (
            <>
              <Input placeholder="Yildan" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} />
              <Input placeholder="Yurgan yo'l gacha" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))} />
            </>
          ) : null}
          <Input
            placeholder="Eng kam narx"
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          />
          <Input
            placeholder="Eng ko'p narx"
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      ) : null}

      <SideScroll className="-mx-4 w-[calc(100%+2rem)] gap-2 px-4 pb-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setCategory(t.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              category === t.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </SideScroll>

      <SideScroll className="-mx-4 w-[calc(100%+2rem)] gap-2 px-4">
        {(
          [
            ["all", "Barcha pul"],
            ["UZS", "so'm"],
            ["USD", "$"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setCurrency(value);
              if (value === "all") setSort("new");
            }}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
              currency === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
        {(
          [
            ["new", "Yangi"],
            ["cheap", "Arzon"],
            ["expensive", "Qimmat"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={value !== "new" && !money}
            onClick={() => setSort(value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40",
              priceSort === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </SideScroll>

      {list.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : data.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {list.hasNextPage ? (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? "Yuklanmoqda..." : "Yana yuklash"}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {search || city || min || max || money || rooms || area || year || mileage
            ? "Bu filtr bo'yicha e'lon topilmadi."
            : platform.data?.coverage === "region"
              ? "Bu hududda hozircha e'lon yo'q."
              : platform.data?.userPosting === false
                ? "Hozircha e'lon yo'q."
                : "Hozircha e'lon yo'q. E'lonlarim bo'limidan yangi e'lon yaratishingiz mumkin."}
        </p>
      )}
    </div>
  );
}
