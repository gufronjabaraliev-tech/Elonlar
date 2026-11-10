import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccountGate, identityReady } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { InquiryList } from "@/components/InquiryList";
import { PayDetails } from "@/components/PayDetails";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PaymentBadge } from "@/components/StatusBadge";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { formatPrice, imageUrl, orderCode, postedAgo } from "@/lib/telegram";
import { claimListingPayment, deleteListing, myListings, publicPlatform, userThreads } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my")({
  head: () => ({
    meta: [
      { title: "E'lonlarim" },
      { name: "description", content: "Tasdiqlangan va tasdiqlanmagan e'lonlar, hamda qiziqqanlar xabari." },
      { property: "og:title", content: "E'lonlarim" },
      {
        property: "og:description",
        content: "Tasdiqlangan va tasdiqlanmagan e'lonlar, hamda qiziqqanlar xabari.",
      },
    ],
  }),
  component: MyPage,
});

function MyPage() {
  const { initData, user, ready } = useTelegramSession();
  const tgProfile = useTelegramProfile();
  const web = useWebUser();
  const fetchMine = useServerFn(myListings);
  const fetchThreads = useServerFn(userThreads);
  const remove = useServerFn(deleteListing);
  const claim = useServerFn(claimListingPayment);
  const fetchPlatform = useServerFn(publicPlatform);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [tab, setTab] = useState<"approved" | "waiting">("approved");
  const signedIn = Boolean(user || web.user);
  const me = user?.id ?? web.user?.id ?? 0;
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const canPost = platform.data?.userPosting !== false;

  const { data, isPending } = useQuery({
    queryKey: ["my-listings", user?.id ?? web.user?.id],
    enabled: signedIn,
    queryFn: () => fetchMine({ data: { initData } }),
  });

  const threads = useQuery({
    queryKey: ["seller-threads", me],
    enabled: signedIn && me !== 0,
    queryFn: () => fetchThreads({ data: { initData } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { initData, id } }),
    onSuccess: () => {
      toast.success("E'lon o'chirildi");
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const openReceipt = (id: string) => {
    void navigate({ to: "/chat", search: { listing: id, order: orderCode(id) } });
  };

  const pay = useMutation({
    mutationFn: (id: string) => claim({ data: { initData, id } }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ["my-listings"] });
      if (result.paymentStatus === "checking") {
        toast.success("Chekni chatga yuboring");
        openReceipt(result.listingId);
        return;
      }
      toast.success("To'lov qabul qilindi");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) {
    return (
      <AccountGate title="E'lonlarim" hint="E'lonlaringizni ko'rish uchun telefonni ulashing va manzilni yozing.">
        {null}
      </AccountGate>
    );
  }

  const rows = data ?? [];
  const approved = rows.filter((item) => item.status === "approved");
  const waiting = rows.filter((item) => item.status !== "approved");
  const visible = tab === "approved" ? approved : waiting;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">E'lonlarim</h1>
          <p className="text-sm text-muted-foreground">Har bir e'lon ostida unga qiziqqanlar yozishmasi.</p>
        </div>
        {canPost ? (
          <Button asChild size="sm" className="rounded-xl">
            <Link to="/new">
              <Plus className="mr-1 h-4 w-4" />
              E'lon yaratish
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
        <TabButton active={tab === "approved"} count={approved.length} onClick={() => setTab("approved")}>
          Tasdiqlangan
        </TabButton>
        <TabButton active={tab === "waiting"} count={waiting.length} onClick={() => setTab("waiting")}>
          Tasdiqlanmagan
        </TabButton>
      </div>

      {isPending ? (
        <Skeleton className="h-64 w-full rounded-3xl" />
      ) : visible.length > 0 ? (
        visible.map((listing) => {
          const interest = (threads.data ?? []).filter(
            (item) => item.listingId === listing.id && item.ownerId === me,
          );
          return (
            <article key={listing.id} className="overflow-hidden rounded-3xl border border-border/70 bg-card">
              <Link to="/listing/$id" params={{ id: listing.id }} className="relative block">
                {listing.images[0] ? (
                  <img
                    src={imageUrl(listing.images[0], listing.imageToken)}
                    alt=""
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="h-44 w-full bg-muted" />
                )}
                <span className="absolute left-3 top-3 flex flex-wrap gap-1">
                  <StatusBadge status={listing.status} />
                  <PaymentBadge status={listing.payment_status} />
                </span>
              </Link>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-snug">{listing.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {listing.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {listing.city}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {listing.views}
                      </span>
                      <span>{postedAgo(listing.created_at)}</span>
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-base font-bold text-primary">
                    {formatPrice(Number(listing.price), listing.currency)}
                  </p>
                </div>
                <p className="text-xs font-semibold">Buyurtma {orderCode(listing.id)}</p>
                {listing.placement_fee > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Joylashtirish: {formatPrice(listing.placement_fee, "UZS")}
                  </p>
                ) : null}
                {listing.payment_status === "unpaid" && listing.placement_fee > 0 && platform.data ? (
                  <div className="rounded-2xl bg-muted/60 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Shu yerga o'tkazing</p>
                    <PayDetails
                      card={platform.data.payCard}
                      click={platform.data.payClick}
                      payme={platform.data.payPayme}
                    />
                  </div>
                ) : null}
                {listing.status === "rejected" && listing.reject_reason ? (
                  <p className="text-xs text-destructive">Sabab: {listing.reject_reason}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {listing.payment_status === "unpaid" ? (
                    <Button size="sm" className="h-8 rounded-xl" disabled={pay.isPending} onClick={() => pay.mutate(listing.id)}>
                      To'ladim
                    </Button>
                  ) : null}
                  {listing.payment_status === "checking" ? (
                    <Button size="sm" variant="outline" className="h-8 rounded-xl" onClick={() => openReceipt(listing.id)}>
                      Chek yuborish
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-xl">
                    <Link to="/edit/$id" params={{ id: listing.id }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Tahrirlash
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant={confirmDelete === listing.id ? "destructive" : "ghost"}
                    className="h-8 rounded-xl"
                    onClick={() => {
                      if (confirmDelete === listing.id) {
                        del.mutate(listing.id, { onSuccess: () => setConfirmDelete(null) });
                        return;
                      }
                      setConfirmDelete(listing.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {confirmDelete === listing.id ? "Tasdiqlang" : "O'chirish"}
                  </Button>
                </div>
                <div className="space-y-2 rounded-2xl bg-muted/50 p-3">
                  <p className="text-sm font-semibold">Qiziqqanlar · {interest.length}</p>
                  <InquiryList
                    items={interest.map((item) => ({
                      listingId: item.listingId,
                      buyerId: item.buyerId,
                      buyerName: item.buyerName,
                      text: item.text,
                      at: item.at,
                    }))}
                  />
                </div>
              </div>
            </article>
          );
        })
      ) : (
        <p className="rounded-3xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
          {tab === "approved" ? "Tasdiqlangan e'lon yo'q." : "Tasdiqlanmagan e'lon yo'q."}
          {canPost && rows.length === 0 ? (
            <>
              {" "}
              <Link to="/new" className="font-medium text-primary">
                E'lon yaratish
              </Link>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
      )}
    >
      {children}
      <span className="ml-1 text-xs">{count}</span>
    </button>
  );
}
