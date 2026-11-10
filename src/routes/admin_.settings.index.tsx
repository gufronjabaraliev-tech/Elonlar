import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import {
  adminAddExpense,
  adminFinance,
  adminRemoveExpense,
  adminSavePlatform,
  adminSetPlacementFee,
  placementFee,
  publicPlatform,
} from "@/lib/listings.functions";
import { formatPrice } from "@/lib/telegram";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/settings/")({
  head: () => ({
    meta: [{ title: "Sozlamalar" }, { name: "description", content: "Narx va harajatlarni boshqarish." }],
  }),
  component: Settings,
});

function stamp(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

function Settings() {
  const { initData } = useTelegramSession();
  const qc = useQueryClient();
  const fetchFee = useServerFn(placementFee);
  const saveFee = useServerFn(adminSetPlacementFee);
  const fetchFinance = useServerFn(adminFinance);
  const add = useServerFn(adminAddExpense);
  const remove = useServerFn(adminRemoveExpense);
  const fetchPlatform = useServerFn(publicPlatform);
  const savePlatform = useServerFn(adminSavePlatform);
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const [campaign, setCampaign] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<"country" | "region" | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [userPosting, setUserPosting] = useState<boolean | null>(null);
  const [payCard, setPayCard] = useState<string | null>(null);
  const [payClick, setPayClick] = useState<string | null>(null);
  const [payPayme, setPayPayme] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fee = useQuery({
    queryKey: ["placement-fee"],
    queryFn: () => fetchFee(),
  });
  const finance = useQuery({
    queryKey: ["admin-finance"],
    queryFn: () => fetchFinance({ data: { initData } }),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-finance"] });
    void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    void qc.invalidateQueries({ queryKey: ["placement-fee"] });
    void qc.invalidateQueries({ queryKey: ["platform"] });
  };

  const chosenCampaign = campaign ?? platform.data?.campaignName ?? "";
  const chosenCoverage = coverage ?? platform.data?.coverage ?? "country";
  const chosenRegion = region ?? platform.data?.region ?? "";
  const postingOn = userPosting ?? platform.data?.userPosting ?? true;

  const saveScope = useMutation({
    mutationFn: () =>
      savePlatform({
        data: {
          initData,
          campaignName: chosenCampaign || "E'lonlar",
          managerName: platform.data?.managerName || "",
          coverage: chosenCoverage,
          region: chosenRegion,
          userPosting: postingOn,
          payCard: payCard ?? platform.data?.payCard ?? "",
          payClick: payClick ?? platform.data?.payClick ?? "",
          payPayme: payPayme ?? platform.data?.payPayme ?? "",
        },
      }),
    onSuccess: () => {
      toast.success("Sozlamalar saqlandi");
      setCampaign(null);
      setCoverage(null);
      setRegion(null);
      setUserPosting(null);
      setPayCard(null);
      setPayClick(null);
      setPayPayme(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const updateFee = useMutation({
    mutationFn: () => saveFee({ data: { initData, amount: Number(amount ?? fee.data?.amount ?? 0) } }),
    onSuccess: () => {
      toast.success("Joylashtirish narxi saqlandi");
      setAmount(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const createExpense = useMutation({
    mutationFn: () => add({ data: { initData, title, amount: Number(cost) } }),
    onSuccess: () => {
      toast.success("Harajat qo'shildi");
      setTitle("");
      setCost("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const dropExpense = useMutation({
    mutationFn: (id: string) => remove({ data: { initData, id } }),
    onSuccess: () => {
      toast.success("Harajat o'chirildi");
      setConfirmId(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  const rows = finance.data?.expenses ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">Sozlamalar</h1>
        <p className="mt-1 text-sm opacity-80">Profil, hudud, narx va harajatlar shu yerda.</p>
      </section>

      <Link
        to="/admin/settings/profile"
        className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3"
      >
        <span>
          <span className="block text-sm font-semibold">Profil</span>
          <span className="block text-xs text-muted-foreground">
            {platform.data?.campaignName || "Ilova nomi"} · {platform.data?.managerName || "Boshqaruvchi kiritilmagan"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <form
        className="space-y-3 rounded-2xl border border-border/70 bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveScope.mutate();
        }}
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold">Ilova nomi</p>
          <Input
            value={chosenCampaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="Masalan: Alibazar e'lonlar"
            className="rounded-xl"
            maxLength={40}
            required
          />
          <p className="text-xs text-muted-foreground">
            Shu nom foydalanuvchi sarlavhasida va bosh sahifada chiqadi.
          </p>
        </div>
        <p className="text-sm font-semibold">Qamrov</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["country", "Butun mamlakat"],
              ["region", "Bitta hudud"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCoverage(value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium",
                chosenCoverage === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {chosenCoverage === "region" ? (
          <Input
            value={chosenRegion}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Masalan: Yunusobod tumani"
            className="rounded-xl"
          />
        ) : (
          <p className="text-xs text-muted-foreground">E'lonlar butun mamlakat bo'yicha ko'rinadi.</p>
        )}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-medium">Foydalanuvchilar e'lon joylaydi</p>
            <p className="text-xs text-muted-foreground">
              O'chiq bo'lsa, e'lonni faqat admin joylaydi. Ochik bo'lsa, admin tasdiqlagach chiqadi.
            </p>
          </div>
          <Switch checked={postingOn} onCheckedChange={setUserPosting} aria-label="Foydalanuvchilar e'lon joylaydi" />
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={saveScope.isPending || platform.isPending}>
          Saqlash
        </Button>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-border/70 bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveScope.mutate();
        }}
      >
        <p className="text-sm font-semibold">To'lov rekvizitlari</p>
        <p className="text-xs text-muted-foreground">E'lon beruvchi shu yerga pul o'tkazadi.</p>
        <Input
          value={payCard ?? platform.data?.payCard ?? ""}
          onChange={(e) => setPayCard(e.target.value)}
          placeholder="Karta raqami"
          className="rounded-xl"
          aria-label="Karta raqami"
        />
        <Input
          value={payClick ?? platform.data?.payClick ?? ""}
          onChange={(e) => setPayClick(e.target.value)}
          placeholder="Click raqami"
          className="rounded-xl"
          aria-label="Click raqami"
        />
        <Input
          value={payPayme ?? platform.data?.payPayme ?? ""}
          onChange={(e) => setPayPayme(e.target.value)}
          placeholder="Payme raqami"
          className="rounded-xl"
          aria-label="Payme raqami"
        />
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={saveScope.isPending}>
          Saqlash
        </Button>
      </form>

      <form
        className="rounded-2xl border border-border/70 bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          updateFee.mutate();
        }}
      >
        <p className="text-sm font-semibold">Joylashtirish narxi</p>
        <p className="mt-1 text-xs text-muted-foreground">
          E'lon beruvchi shu summani to'laydi. 0 kiritsangiz, joylashtirish bepul bo'ladi.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            inputMode="numeric"
            value={amount ?? (fee.data ? String(fee.data.amount) : "")}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            className="rounded-xl"
            aria-label="Joylashtirish narxi"
          />
          <Button type="submit" className="rounded-xl" disabled={updateFee.isPending || fee.isPending}>
            Saqlash
          </Button>
        </div>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-border/70 bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          createExpense.mutate();
        }}
      >
        <p className="text-sm font-semibold">Harajat qo'shish</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nomi, masalan reklama"
          className="rounded-xl"
          required
        />
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Summa, so'm"
            className="rounded-xl"
            required
          />
          <Button type="submit" className="rounded-xl" disabled={createExpense.isPending}>
            Qo'shish
          </Button>
        </div>
      </form>

      {finance.isPending ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : finance.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          {finance.error instanceof Error ? finance.error.message : "Ma'lumot yuklanmadi"}
        </p>
      ) : rows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          {rows.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 ${index > 0 ? "border-t border-border/70" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{stamp(item.created_at)}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{formatPrice(item.amount, "UZS")}</p>
              <Button
                type="button"
                size="sm"
                variant={confirmId === item.id ? "destructive" : "ghost"}
                className="h-8 shrink-0"
                disabled={dropExpense.isPending}
                onClick={() => {
                  if (confirmId === item.id) dropExpense.mutate(item.id);
                  else setConfirmId(item.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmId === item.id ? "O'chirilsin" : ""}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">Hali harajat kiritilmagan.</p>
      )}
    </div>
  );
}
