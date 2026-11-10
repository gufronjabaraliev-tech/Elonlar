import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminGate } from "@/components/AdminGate";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { adminCustomers } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/customers")({
  head: () => ({
    meta: [{ title: "Mijozlar" }, { name: "description", content: "E'lon joylagan mijozlar." }],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <AdminGate>
      <Customers />
    </AdminGate>
  );
}

function Customers() {
  const { initData } = useTelegramSession();
  const fetchCustomers = useServerFn(adminCustomers);
  const customers = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fetchCustomers({ data: { initData } }),
  });
  const rows = customers.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">Mijozlar</h1>
        <p className="mt-1 text-sm opacity-80">E'lon joylagan foydalanuvchilar. Qatorni bossangiz, chat ochiladi.</p>
      </section>

      {customers.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : customers.isError ? (
        <p className="py-16 text-center text-sm text-destructive">
          {customers.error instanceof Error ? customers.error.message : "Ma'lumot yuklanmadi"}
        </p>
      ) : rows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          {rows.map((customer, index) => (
            <Link
              key={customer.id}
              to="/admin/chat/$id"
              params={{ id: String(customer.id) }}
              className={cn("flex items-center gap-3 px-3 py-2.5", index > 0 && "border-t border-border/70")}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {customer.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{customer.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {customer.phone || "Telefon yo'q"}
                  {customer.city ? ` · ${customer.city}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{customer.listings} ta</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">Mijozlar yo'q.</p>
      )}
    </div>
  );
}
