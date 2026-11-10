import { Link } from "@tanstack/react-router";
import { Heart, MapPin, ImageOff } from "lucide-react";

import { SideScroll } from "@/components/SideScroll";
import { useFavorites } from "@/hooks/useFavorites";
import { attributeLine, categoryLabel, formatPrice, imageUrl, postedAgo } from "@/lib/telegram";
import type { Listing } from "@/lib/listings.functions";

export function ListingCard({ listing }: { listing: Listing }) {
  const photos = listing.images ?? [];
  const extra = attributeLine(listing);
  const { ids, toggle } = useFavorites();
  const saved = ids.includes(listing.id);
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card transition-shadow hover:shadow-lg"
    >
      <button
        type="button"
        aria-label={saved ? "Sevimlilardan olish" : "Sevimlilarga qo'shish"}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/90"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(listing.id);
        }}
      >
        <Heart className={saved ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} />
      </button>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {photos.length > 0 ? (
          <SideScroll className="h-full snap-x snap-mandatory">
            {photos.map((img, index) => (
              <img
                key={`${img}-${index}`}
                src={imageUrl(img)}
                alt={listing.title}
                draggable={false}
                loading="lazy"
                className="pointer-events-none h-full min-w-full max-w-full shrink-0 snap-center object-cover"
              />
            ))}
          </SideScroll>
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageOff className="h-7 w-7" />
          </div>
        )}
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium">
          {categoryLabel(listing.category)}
        </span>
        {photos.length > 1 ? (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium">
            {photos.length} rasm
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-sm font-medium">{listing.title}</p>
        {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
        <p className="text-base font-semibold text-primary">
          {formatPrice(Number(listing.price), listing.currency)}
        </p>
        {listing.created_at ? <p className="text-[11px] text-muted-foreground">{postedAgo(listing.created_at)}</p> : null}
        {listing.city ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {listing.city}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
