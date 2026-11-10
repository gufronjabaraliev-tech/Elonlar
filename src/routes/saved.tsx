import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { ListingCard } from "@/components/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/hooks/useFavorites";
import { listingsByIds } from "@/lib/listings.functions";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Sevimlilar" },
      { name: "description", content: "Sevimli e'lonlar." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { ids } = useFavorites();
  const fetchMany = useServerFn(listingsByIds);
  const { data, isPending } = useQuery({
    queryKey: ["saved", ids],
    queryFn: () => fetchMany({ data: { ids } }),
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">Sevimlilar</h1>
        <p className="mt-1 text-sm opacity-80">Belgilab qo'yilgan e'lonlar.</p>
      </section>
      {ids.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Hali sevimli e'lon yo'q.</p>
      ) : isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Saqlangan e'lonlar topilmadi.
        </p>
      )}
    </div>
  );
}
