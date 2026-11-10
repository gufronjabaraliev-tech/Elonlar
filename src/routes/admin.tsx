import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageOff } from "lucide-react";
import { useState } from "react";

import { AdminGate } from "@/components/AdminGate";
import { SideScroll } from "@/components/SideScroll";
import { ADMIN_TABS, adminStatusFromSearch } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PaymentBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { categoryLabel, formatPrice, imageUrl } from "@/lib/telegram";
import { adminListings, adminStats } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: adminStatusFromSearch(search),
  }),
  head: () => ({
    meta: [
      { title: "Admin paneli" },
      { name: "description", content: "E'lonlarni tasdiqlash, rad etish va boshqarish paneli." },
      { property: "og:title", content: "Admin paneli" },
      {
        property: "og:description",
        content: "E'lonlarni tasdiqlash, rad etish va boshqarish paneli.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <AdminGate>
      <AdminListings />
    </AdminGate>
  );
}

function AdminListings() {
  const { initData } = useTelegramSession();
  const { status } = Route.useSearch();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");

  const fetchList = useServerFn(adminListings);
  const fetchStats = useServerFn(adminStats);

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchStats({ data: { initData } }),
  });

  const list = useInfiniteQuery({
    queryKey: ["admin-listings", status, search, city],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchList({
        data: {
          initData,
          status,
          ...(search ? { q: search } : {}),
          ...(city ? { city } : {}),
          offset: pageParam,
        },
      }),
    getNextPageParam: (last, _pages, pageParam) =>
      last.hasMore ? pageParam + last.items.length : undefined,
  });
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];

  const s = stats.data;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">E'lonlar</h1>
        <p className="mt-1 text-sm opacity-80">
          Kelib tushgan e'lonlarni filtrlab ko'ring. Qatorni bossangiz, to'liq sahifa ochiladi.
        </p>
      </section>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sarlavha bo'yicha qidirish"
          className="rounded-xl"
        />
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Shahar"
          className="max-w-[40%] rounded-xl"
        />
      </form>

      <SideScroll className="-mx-4 w-[calc(100%+2rem)] gap-2 px-4 pb-2">
        {ADMIN_TABS.map((item) => {
          const count =
            item.status === "pending"
              ? s?.pending
              : item.status === "approved"
                ? s?.approved
                : item.status === "rejected"
                  ? s?.rejected
                  : item.status === "hidden"
                    ? s?.hidden
                    : s?.total;
          const active = status === item.status;
          return (
            <Link
              key={item.status}
              to="/admin"
              search={{ status: item.status }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums",
                  active ? "bg-primary-foreground/20" : "bg-muted text-foreground",
                )}
              >
                {count ?? "–"}
              </span>
            </Link>
          );
        })}
      </SideScroll>

      {list.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : list.isError ? (
        <p className="py-16 text-center text-sm text-destructive">
          {list.error instanceof Error ? list.error.message : "Ma'lumot yuklanmadi"}
        </p>
      ) : rows.length > 0 ? (
        <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          {rows.map((l, index) => (
            <Link
              key={l.id}
              to="/admin/listing/$id"
              params={{ id: l.id }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                index > 0 && "border-t border-border/70",
              )}
            >
              {l.images[0] ? (
                <img
                  src={imageUrl(l.images[0], l.imageToken)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <ImageOff className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={l.status} />
                  <PaymentBadge status={l.payment_status} />
                  <span className="truncate text-[11px] text-muted-foreground">
                    {categoryLabel(l.category)}
                  </span>
                </div>
                <p className="truncate text-sm font-medium">{l.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatPrice(Number(l.price), l.currency)}
                  {l.city ? ` · ${l.city}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {list.hasNextPage ? (
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {list.isFetchingNextPage ? "Yuklanmoqda..." : "Yana yuklash"}
          </Button>
        ) : null}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">Bu bo'limda e'lon yo'q.</p>
      )}
    </div>
  );
}
