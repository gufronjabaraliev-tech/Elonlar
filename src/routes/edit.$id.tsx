import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AccountGate, identityReady } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { ListingForm } from "@/components/ListingForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { getListing, updateListing, type ListingInput } from "@/lib/listings.functions";

export const Route = createFileRoute("/edit/$id")({
  head: () => ({
    meta: [
      { title: "E'lonni tahrirlash" },
      { name: "description", content: "Mavjud e'lonning ma'lumotlari va rasmlarini yangilang." },
      { property: "og:title", content: "E'lonni tahrirlash" },
      {
        property: "og:description",
        content: "Mavjud e'lonning ma'lumotlari va rasmlarini yangilang.",
      },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const { initData, user, ready } = useTelegramSession();
  const tgProfile = useTelegramProfile();
  const web = useWebUser();
  const navigate = useNavigate();
  const fetchListing = useServerFn(getListing);
  const update = useServerFn(updateListing);

  const { data, isPending } = useQuery({
    queryKey: ["listing-edit", id, user?.id],
    enabled: Boolean(user || web.user),
    queryFn: () => fetchListing({ data: { id, initData } }),
  });

  const mutation = useMutation({
    mutationFn: (payload: ListingInput) => update({ data: { initData, id, payload } }),
    onSuccess: () => {
      toast.success("Saqlandi");
      void navigate({ to: "/my" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) return <AccountGate>{null}</AccountGate>;
  if (isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!data)
    return <p className="py-20 text-center text-sm text-muted-foreground">E'lon topilmadi.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">E'lonni tahrirlash</h1>
      <ListingForm
        initData={initData}
        initial={{
          category: data.category,
          title: data.title,
          description: data.description,
          price: Number(data.price),
          currency: data.currency,
          city: data.city,
          phone: data.phone,
          images: data.images,
          attributes: data.attributes ?? {},
        }}
        imageToken={data.imageToken ?? null}
        submitting={mutation.isPending}
        submitLabel="Saqlash"
        onSubmit={(payload) => mutation.mutate(payload)}
      />
    </div>
  );
}
