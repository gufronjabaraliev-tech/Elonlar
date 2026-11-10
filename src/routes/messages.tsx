import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AccountGate, identityReady } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { userThreads } from "@/lib/listings.functions";
import { postedAgo } from "@/lib/telegram";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [{ title: "Xabarlar" }, { name: "description", content: "Sotuvchi va xaridor yozishmalari." }],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, ready, initData } = useTelegramSession();
  const tgProfile = useTelegramProfile();
  const web = useWebUser();
  const fetchThreads = useServerFn(userThreads);
  const signed = Boolean(user || web.user);
  const me = user?.id ?? web.user?.id ?? 0;
  const query = useQuery({
    queryKey: ["seller-threads", me],
    enabled: ready && web.ready && signed,
    queryFn: () => fetchThreads({ data: { initData } }),
  });

  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) {
    return (
      <AccountGate title="Xabarlar" hint="Sotuvchiga yozish uchun ism, familiya, telefon va manzilni kiriting.">
        {null}
      </AccountGate>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-bold">Xabarlar</h1>
      <p className="text-sm text-muted-foreground">E'lon egasi va xaridor o'rtasidagi yozishmalar.</p>
      {query.isPending ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : query.data && query.data.length > 0 ? (
        query.data.map((item) => (
          <Link
            key={`${item.listingId}:${item.buyerId}`}
            to="/messages/$listingId"
            params={{ listingId: item.listingId }}
            search={item.ownerId === me ? { buyer: item.buyerId } : {}}
            className="block rounded-2xl border border-border/70 bg-card p-3"
          >
            <p className="text-sm font-semibold">{item.listingTitle}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {item.from === "buyer" ? (item.buyerId === me ? "Siz" : item.buyerName) : item.ownerId === me ? "Siz" : "Sotuvchi"}: {item.text}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">{postedAgo(item.at)}</p>
          </Link>
        ))
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Hali yozishma yo'q. E'lon ichidagi «Yozish» tugmasi orqali boshlang.
        </p>
      )}
    </div>
  );
}
