import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { adminChatThreads } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/chat/")({
  head: () => ({
    meta: [{ title: "Chat" }, { name: "description", content: "Mijozlar bilan yozishmalar." }],
  }),
  component: Threads,
});

function stamp(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Threads() {
  const { initData } = useTelegramSession();
  const fetchThreads = useServerFn(adminChatThreads);
  const threads = useQuery({
    queryKey: ["admin-chats"],
    queryFn: () => fetchThreads({ data: { initData } }),
  });
  const rows = threads.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">Chat</h1>
        <p className="mt-1 text-sm opacity-80">Mijozlar yozishmasi. Qatorni bossangiz, suhbat ochiladi.</p>
      </section>

      {threads.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : threads.isError ? (
        <p className="py-16 text-center text-sm text-destructive">
          {threads.error instanceof Error ? threads.error.message : "Ma'lumot yuklanmadi"}
        </p>
      ) : rows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          {rows.map((thread, index) => (
            <Link
              key={thread.id}
              to="/admin/chat/$id"
              params={{ id: String(thread.id) }}
              className={cn("flex items-center gap-3 px-3 py-2.5", index > 0 && "border-t border-border/70")}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {thread.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{thread.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{stamp(thread.at)}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {thread.from === "admin" ? "Siz: " : ""}
                  {thread.last}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Hali xabar yo'q. Mijozlar bo'limidan suhbat boshlashingiz mumkin.
        </p>
      )}
    </div>
  );
}
