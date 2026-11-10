import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, Flag, Heart, MapPin, MessageCircle, Phone, Send, Share2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InquiryList } from "@/components/InquiryList";
import { SideScroll } from "@/components/SideScroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { attributeLine, categoryLabel, formatPrice, imageUrl, mapUrl, postedAgo } from "@/lib/telegram";
import { getListing, listingThread, sendListingMessage, userReportListing } from "@/lib/listings.functions";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({
    meta: [
      { title: "E'lon tafsilotlari" },
      { name: "description", content: "E'lon rasmlari, narxi, joylashuvi va sotuvchi telefoni." },
      { property: "og:title", content: "E'lon tafsilotlari" },
      {
        property: "og:description",
        content: "E'lon rasmlari, narxi, joylashuvi va sotuvchi telefoni.",
      },
    ],
  }),
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { initData, user, ready } = useTelegramSession();
  const web = useWebUser();
  const me = user?.id ?? web.user?.id ?? 0;
  const { ids, toggle } = useFavorites();
  const fetchListing = useServerFn(getListing);
  const fetchThread = useServerFn(listingThread);
  const sendNote = useServerFn(sendListingMessage);
  const report = useServerFn(userReportListing);
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const saved = ids.includes(id);
  const [photo, setPhoto] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const sendReport = useMutation({
    mutationFn: () => report({ data: { initData, id, reason } }),
    onSuccess: () => {
      toast.success("Shikoyat yuborildi");
      setReporting(false);
      setReason("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  const talk = useQuery({
    queryKey: ["listing-thread", id, me],
    enabled: ready && web.ready && me !== 0,
    queryFn: () => fetchThread({ data: { initData, listingId: id } }),
  });

  const leaveNote = useMutation({
    mutationFn: () => sendNote({ data: { initData, listingId: id, text: note } }),
    onSuccess: () => {
      setNote("");
      toast.success("Xabar yuborildi");
      void qc.invalidateQueries({ queryKey: ["listing-thread", id] });
      void qc.invalidateQueries({ queryKey: ["seller-threads"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  const { data, isPending } = useQuery({
    queryKey: ["listing", id, Boolean(initData)],
    enabled: ready,
    queryFn: () => {
      let countView = false;
      if (typeof sessionStorage !== "undefined") {
        const key = `elon-view:${id}`;
        countView = sessionStorage.getItem(key) !== "1";
        if (countView) sessionStorage.setItem(key, "1");
      }
      return fetchListing({ data: { id, initData, countView } });
    },
  });

  if (isPending || !ready) {
    return <Skeleton className="h-80 w-full rounded-3xl" />;
  }

  if (!data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">E'lon topilmadi yoki hali tasdiqlanmagan.</p>
        <Button variant="outline" className="mt-4" onClick={() => goBack(router)}>
          Orqaga
        </Button>
      </div>
    );
  }

  return (
    <article className="space-y-4">
      <button
        type="button"
        onClick={() => goBack(router)}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </button>

      {data.images.length > 0 ? (
        <SideScroll className="-mx-4 w-[calc(100%+2rem)] snap-x snap-mandatory gap-2 px-4">
          {data.images.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              className="relative w-[85%] shrink-0 snap-center"
              onClick={() => setPhoto(index)}
            >
              <img
                src={imageUrl(img, data.imageToken)}
                alt={data.title}
                draggable={false}
                className="pointer-events-none h-56 w-full rounded-2xl object-cover sm:h-80"
              />
              <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium">
                {index + 1}/{data.images.length}
              </span>
            </button>
          ))}
        </SideScroll>
      ) : null}
      {photo !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
          <button type="button" className="absolute right-4 top-4 text-white" aria-label="Yopish" onClick={() => setPhoto(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={imageUrl(data.images[photo] ?? "", data.imageToken)} alt="" className="max-h-[80vh] max-w-full rounded-2xl object-contain" />
          <p className="absolute bottom-6 text-sm text-white">
            {photo + 1}/{data.images.length}
          </p>
        </div>
      ) : null}

      <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
            {categoryLabel(data.category)}
          </span>
          {data.status !== "approved" ? <StatusBadge status={data.status} /> : null}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> {data.views}
          </span>
        </div>

        <h1 className="text-lg font-bold leading-snug">{data.title}</h1>
        <p className="text-xs text-muted-foreground">{postedAgo(data.created_at)} · {data.sellerName}</p>
        {attributeLine(data) ? (
          <p className="text-sm text-muted-foreground">{attributeLine(data)}</p>
        ) : null}
        <p className="text-2xl font-extrabold text-primary">
          {formatPrice(Number(data.price), data.currency)}
        </p>
        {data.city ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {data.city}
          </p>
        ) : null}
        {data.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => toggle(data.id)}
        >
          <Heart className={saved ? "fill-primary text-primary" : ""} />
          {saved ? "Sevimlilarda" : "Sevimli"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => void shareListing(data.title)}
        >
          <Share2 /> Ulashish
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-xl">
          <Link to="/messages/$listingId" params={{ listingId: data.id }}>
            <MessageCircle /> Yozish
          </Link>
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setReporting((value) => !value)}>
          <Flag /> Shikoyat
        </Button>
        {data.city ? (
          <Button asChild variant="outline" className="col-span-2 h-11 rounded-xl">
            <a href={mapUrl(data.city, data.attributes ?? {})} target="_blank" rel="noreferrer">
              <MapPin /> Xaritada ko'rish
            </a>
          </Button>
        ) : null}
      </div>
      {reporting ? (
        <form
          className="space-y-2 rounded-2xl border border-border/70 bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            sendReport.mutate();
          }}
        >
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nima noto'g'ri?"
            className="min-h-20 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
            required
          />
          <Button type="submit" className="rounded-xl" disabled={sendReport.isPending}>
            Yuborish
          </Button>
        </form>
      ) : null}
      {data.more.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Shu sotuvchining boshqa e'lonlari</h2>
          <div className="grid grid-cols-2 gap-2">
            {data.more.map((item) => (
              <Link key={item.id} to="/listing/$id" params={{ id: item.id }} className="rounded-2xl border border-border/70 bg-card p-3">
                <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{formatPrice(Number(item.price), item.currency)}</p>
                {item.city ? <p className="text-xs text-muted-foreground">{item.city}</p> : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
        <h2 className="text-sm font-semibold">
          {data.owner_telegram_id === me ? "Qiziqqanlar" : "E'lon egasiga yozing"}
        </h2>
        {data.owner_telegram_id === me ? (
          <InquiryList
            items={(talk.data?.role === "owner" ? talk.data.buyers : []).map((item) => ({
              listingId: data.id,
              buyerId: item.buyerId,
              buyerName: item.buyerName,
              text: item.text,
              at: item.at,
            }))}
          />
        ) : me === 0 ? (
          <p className="text-sm text-muted-foreground">Xabar qoldirish uchun profilga kiring.</p>
        ) : (
          <>
            {talk.data?.role === "buyer" && talk.data.messages.length > 0 ? (
              <div className="space-y-2">
                {talk.data.messages.slice(-3).map((message) => (
                  <p key={message.id} className="rounded-2xl bg-muted px-3 py-2 text-sm">
                    {message.text}
                  </p>
                ))}
              </div>
            ) : null}
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!note.trim()) return;
                leaveNote.mutate();
              }}
            >
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Shu e'lon haqida yozing"
                className="rounded-xl"
              />
              <Button type="submit" className="h-11 rounded-xl px-3" disabled={leaveNote.isPending || !note.trim()} aria-label="Yuborish">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </section>

      <div className="sticky bottom-20 sm:bottom-4">
        <Button asChild size="lg" className="w-full rounded-2xl text-base">
          <a href={`tel:${data.phone}`}>
            <Phone className="mr-2 h-4 w-4" /> {data.phone}
          </a>
        </Button>
      </div>
    </article>
  );
}

function goBack(router: ReturnType<typeof useRouter>) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.history.back();
    return;
  }
  window.location.assign("/");
}

async function shareListing(title: string) {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      /* bekor qilingan */
    }
    return;
  }
  await navigator.clipboard.writeText(url);
  toast.success("Havola nusxalandi");
}
