import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AccountGate } from "@/components/AccountGate";
import { ListingForm } from "@/components/ListingForm";
import { PayDetails } from "@/components/PayDetails";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { createListing, placementFee, publicPlatform, type ListingInput } from "@/lib/listings.functions";
import { formatPrice } from "@/lib/telegram";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "E'lon joylash" },
      { name: "description", content: "Uy, mashina yoki boshqa mahsulot uchun yangi e'lon qo'shing." },
      { property: "og:title", content: "E'lon joylash" },
      {
        property: "og:description",
        content: "Uy, mashina yoki boshqa mahsulot uchun yangi e'lon qo'shing.",
      },
    ],
  }),
  component: NewListingPage,
});

function NewListingPage() {
  const { initData, ready } = useTelegramSession();
  const navigate = useNavigate();
  const create = useServerFn(createListing);
  const fetchFee = useServerFn(placementFee);
  const fetchPlatform = useServerFn(publicPlatform);
  const fee = useQuery({ queryKey: ["placement-fee"], queryFn: () => fetchFee() });
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const amount = fee.data?.amount ?? 0;

  const mutation = useMutation({
    mutationFn: (payload: ListingInput) => create({ data: { initData, payload } }),
    onSuccess: () => {
      const due = fee.data?.amount;
      toast.success(
        due && due > 0
          ? "E'lon saqlandi. E'lonlarim bo'limida to'lovni belgilang."
          : due === 0
            ? "E'lon yuborildi. Admin tasdiqlagach ko'rinadi."
            : "E'lon saqlandi. To'lov holatini E'lonlarim bo'limida ko'ring.",
      );
      void navigate({ to: "/my" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  if (!ready) return null;
  if (platform.data && !platform.data.userPosting) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-xl font-bold">E'lon joylash yopiq</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu ilovada e'lonlarni faqat admin joylaydi.
        </p>
      </div>
    );
  }

  return (
    <AccountGate>
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Yangi e'lon</h1>
      <div className="rounded-2xl border border-border/70 bg-card p-4 text-sm">
        <p className="font-medium">Joylashtirish narxi</p>
        <p className="mt-1 text-lg font-bold text-primary">
          {fee.isPending ? "—" : amount > 0 ? formatPrice(amount, "UZS") : "Bepul"}
        </p>
        <p className="mt-1 text-muted-foreground">
          {amount > 0
            ? "Pulni shu rekvizitga o'tkazing. E'lonlarimda «To'ladim» ni bossangiz, chat shu buyurtma raqami bilan ochiladi. Chek rasmini shu yerga yuboring."
            : "Hozir joylashtirish bepul. E'lon admin tasdig'idan keyin chiqadi."}
        </p>
        {amount > 0 && platform.data ? (
          <div className="mt-3">
            <PayDetails card={platform.data.payCard} click={platform.data.payClick} payme={platform.data.payPayme} />
          </div>
        ) : null}
      </div>
      <ListingForm
        initData={initData}
        submitting={mutation.isPending}
        submitLabel="E'lonni yuborish"
        onSubmit={(payload) => mutation.mutate(payload)}
      />
    </div>
    </AccountGate>
  );
}
