import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminLogout } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebAdmin } from "@/hooks/useWebAdmin";
import { adminSavePlatform, publicPlatform } from "@/lib/listings.functions";

export const Route = createFileRoute("/admin_/settings/profile")({
  head: () => ({
    meta: [{ title: "Profil" }, { name: "description", content: "Kampaniya va boshqaruvchi ma'lumotlari." }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const router = useRouter();
  const { initData } = useTelegramSession();
  const { isWebAdmin } = useWebAdmin();
  const qc = useQueryClient();
  const fetchPlatform = useServerFn(publicPlatform);
  const savePlatform = useServerFn(adminSavePlatform);
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const [campaign, setCampaign] = useState<string | null>(null);
  const [manager, setManager] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      savePlatform({
        data: {
          initData,
          campaignName: campaign ?? platform.data?.campaignName ?? "",
          managerName: manager ?? platform.data?.managerName ?? "",
          coverage: platform.data?.coverage ?? "country",
          region: platform.data?.region ?? "",
          userPosting: platform.data?.userPosting ?? true,
          payCard: platform.data?.payCard ?? "",
          payClick: platform.data?.payClick ?? "",
          payPayme: platform.data?.payPayme ?? "",
        },
      }),
    onSuccess: () => {
      toast.success("Profil saqlandi");
      setCampaign(null);
      setManager(null);
      void qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.history.back();
          else void router.navigate({ to: "/admin/settings" });
        }}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Sozlamalar
      </button>
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold">Profil</h1>
        <p className="mt-1 text-sm opacity-80">Ilova nomi sarlavhada va bosh sahifada ko'rinadi.</p>
      </section>
      <form
        className="space-y-4 rounded-2xl border border-border/70 bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="campaign">Ilova nomi</Label>
          <Input
            id="campaign"
            value={campaign ?? platform.data?.campaignName ?? ""}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="Masalan: Alibazar e'lonlar"
            className="rounded-xl"
            maxLength={40}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manager">Boshqaruvchi nomi</Label>
          <Input
            id="manager"
            value={manager ?? platform.data?.managerName ?? ""}
            onChange={(e) => setManager(e.target.value)}
            placeholder="Ism familiya"
            className="rounded-xl"
          />
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl" disabled={save.isPending || platform.isPending}>
          Saqlash
        </Button>
      </form>
      {isWebAdmin ? (
        <div className="flex justify-end">
          <AdminLogout />
        </div>
      ) : null}
    </div>
  );
}
