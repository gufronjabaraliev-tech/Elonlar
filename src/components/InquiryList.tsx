import { Link } from "@tanstack/react-router";

import { postedAgo } from "@/lib/telegram";

export type Inquiry = {
  listingId: string;
  buyerId: number;
  buyerName: string;
  text: string;
  at: string;
};

export function InquiryList({ items }: { items: Inquiry[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Hali hech kim yozmagan.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={`${item.listingId}:${item.buyerId}`}>
          <Link
            to="/messages/$listingId"
            params={{ listingId: item.listingId }}
            search={{ buyer: item.buyerId }}
            className="flex items-start gap-2 rounded-2xl bg-background px-3 py-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {item.buyerName.slice(0, 1).toUpperCase() || "Q"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{item.buyerName}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{postedAgo(item.at)}</span>
              </span>
              <span className="line-clamp-2 text-sm text-muted-foreground">{item.text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
