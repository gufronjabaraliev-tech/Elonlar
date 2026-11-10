import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AdminGate } from "@/components/AdminGate";
import { ListingForm } from "@/components/ListingForm";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { adminCreateListing, type ListingInput } from "@/lib/listings.functions";

export const Route = createFileRoute("/admin_/new")({
  head: () => ({
    meta: [{ title: "E'lon yaratish" }, { name: "description", content: "Admin yangi e'lon joylaydi." }],
  }),
  component: AdminNewPage,
});

function AdminNewPage() {
  return (
    <AdminGate>
      <NewListing />
    </AdminGate>
  );
}

function NewListing() {
  const { initData } = useTelegramSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(adminCreateListing);
  const mutation = useMutation({
    mutationFn: (payload: ListingInput) => create({ data: { initData, payload } }),
    onSuccess: (row) => {
      toast.success("E'lon joylandi");
      void qc.invalidateQueries({ queryKey: ["admin-listings"] });
      void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin-customers"] });
      void navigate({ to: "/admin/listing/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">E'lon yaratish</h1>
        <p className="mt-1 text-sm opacity-80">Admin joylagan e'lon darhol tasdiqlanadi.</p>
      </section>
      <ListingForm
        initData={initData}
        forAdmin
        submitting={mutation.isPending}
        submitLabel="E'lonni joylash"
        onSubmit={(payload) => mutation.mutate(payload)}
      />
    </div>
  );
}
