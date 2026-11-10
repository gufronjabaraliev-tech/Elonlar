import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, EyeOff, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SideScroll } from "@/components/SideScroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PaymentBadge } from "@/components/StatusBadge";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { attributeLine, categoryLabel, formatPrice, imageUrl, mapUrl, orderCode } from "@/lib/telegram";
import { adminListingReports, adminSetPayment, adminSetStatus, deleteListing, getListing } from "@/lib/listings.functions";

export const Route = createFileRoute("/admin_/listing/$id")({
  head: () => ({
    meta: [{ title: "Admin — e'lon" }],
  }),
  component: AdminListingPage,
});

function AdminListingPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { initData } = useTelegramSession();
  const fetchListing = useServerFn(getListing);
  const fetchReports = useServerFn(adminListingReports);
  const setListingStatus = useServerFn(adminSetStatus);
  const setPayment = useServerFn(adminSetPayment);
  const remove = useServerFn(deleteListing);
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["admin-listing", id],
    queryFn: () => fetchListing({ data: { id, initData, countView: false } }),
  });
  const reports = useQuery({
    queryKey: ["admin-reports", id],
    queryFn: () => fetchReports({ data: { initData, id } }),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-listing", id] });
    void qc.invalidateQueries({ queryKey: ["admin-listings"] });
    void qc.invalidateQueries({ queryKey: ["admin-stats"] });
    void qc.invalidateQueries({ queryKey: ["admin-finance"] });
    void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    void qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  const changeStatus = useMutation({
    mutationFn: (v: { status: string; reason?: string }) =>
      setListingStatus({ data: { initData, id, ...v } }),
    onSuccess: () => {
      toast.success("Yangilandi");
      setRejecting(false);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const changePayment = useMutation({
    mutationFn: (paymentStatus: "paid" | "unpaid") =>
      setPayment({ data: { initData, id, paymentStatus } }),
    onSuccess: () => {
      toast.success("To'lov yangilandi");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const del = useMutation({
    mutationFn: () => remove({ data: { initData, id } }),
    onSuccess: () => {
      toast.success("O'chirildi");
      void router.navigate({ to: "/admin", search: { status: "pending" } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  if (isPending) return <Skeleton className="h-80 w-full rounded-3xl" />;
  if (!data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">E'lon topilmadi.</p>;
  }

  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.history.back();
          else void router.navigate({ to: "/admin", search: { status: "pending" } });
        }}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Admin panel
      </button>

      {data.images.length > 0 ? (
        <SideScroll className="-mx-4 w-[calc(100%+2rem)] snap-x snap-mandatory gap-2 px-4">
          {data.images.map((img, index) => (
            <img
              key={`${img}-${index}`}
              src={imageUrl(img, data.imageToken)}
              alt={data.title}
              draggable={false}
              className="pointer-events-none h-56 w-[85%] shrink-0 snap-center rounded-2xl object-cover sm:h-80 sm:w-[48%]"
            />
          ))}
        </SideScroll>
      ) : null}

      <div className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
            {categoryLabel(data.category)}
          </span>
          <StatusBadge status={data.status} />
          <PaymentBadge status={data.payment_status} />
        </div>
        <h1 className="text-lg font-bold">{data.title}</h1>
        <p className="text-sm font-semibold">Buyurtma {orderCode(data.id)}</p>
        {attributeLine(data) ? (
          <p className="text-sm text-muted-foreground">{attributeLine(data)}</p>
        ) : null}
        <p className="text-2xl font-extrabold text-primary">
          {formatPrice(Number(data.price), data.currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          Joylashtirish: {data.placement_fee > 0 ? formatPrice(data.placement_fee, "UZS") : "bepul"}
        </p>
        <p className="text-sm text-muted-foreground">
          {data.city} · {data.phone}
        </p>
        {data.city ? (
          <a
            href={mapUrl(data.city, data.attributes ?? {})}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary"
          >
            Xaritada ko'rish
          </a>
        ) : null}
        {data.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
        ) : null}
        {data.reject_reason ? (
          <p className="text-sm text-destructive">Sabab: {data.reject_reason}</p>
        ) : null}
        {reports.data && reports.data.length > 0 ? (
          <div className="space-y-1 rounded-2xl bg-destructive/10 p-3">
            <p className="text-sm font-semibold">Shikoyatlar ({reports.data.length})</p>
            {reports.data.map((item) => (
              <p key={item.id} className="text-sm">
                {item.reason}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {rejecting ? (
        <div className="space-y-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rad etish sababi"
            className="rounded-xl"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11 rounded-xl"
              onClick={() => changeStatus.mutate({ status: "rejected", reason })}
            >
              Rad etish
            </Button>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setRejecting(false)}>
              Bekor
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.payment_status !== "paid" ? (
            <p className="text-sm text-muted-foreground">
              E'lonni tasdiqlash uchun avval joylashtirish to'lovini qabul qiling.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {data.payment_status !== "paid" ? (
              <Button
                className="h-11 rounded-xl"
                disabled={changePayment.isPending}
                onClick={() => changePayment.mutate("paid")}
              >
                <Check /> To'lovni qabul qilish
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                disabled={changePayment.isPending}
                onClick={() => changePayment.mutate("unpaid")}
              >
                <X /> To'lovni qaytarish
              </Button>
            )}
            {data.status !== "approved" ? (
              <Button
                className="h-11 rounded-xl"
                disabled={data.payment_status !== "paid" || changeStatus.isPending}
                onClick={() => changeStatus.mutate({ status: "approved" })}
              >
                <Check /> Tasdiqlash
              </Button>
            ) : null}
          {data.status !== "rejected" ? (
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setRejecting(true)}>
              <X /> Rad etish
            </Button>
          ) : null}
          {data.status === "approved" ? (
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => changeStatus.mutate({ status: "hidden" })}
            >
              <EyeOff /> Yashirish
            </Button>
          ) : null}
          <Button
            variant={confirmDelete ? "destructive" : "outline"}
            className="h-11 rounded-xl"
            onClick={() => {
              if (confirmDelete) del.mutate();
              else setConfirmDelete(true);
            }}
          >
            <Trash2 /> {confirmDelete ? "Tasdiqlang" : "O'chirish"}
          </Button>
          </div>
        </div>
      )}
    </article>
  );
}
