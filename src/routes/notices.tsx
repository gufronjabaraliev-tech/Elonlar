import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { AccountGate, identityReady } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { userNotices } from "@/lib/listings.functions";
import { postedAgo } from "@/lib/telegram";

const SEEN = "elon-notice-seen";

export const Route = createFileRoute("/notices")({
  head: () => ({
    meta: [{ title: "Bildirishnomalar" }, { name: "description", content: "E'lon holati va yangi xabarlar." }],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  const { user, ready, initData } = useTelegramSession();
  const tgProfile = useTelegramProfile();
  const web = useWebUser();
  const fetchNotices = useServerFn(userNotices);
  const qc = useQueryClient();
  const signed = Boolean(user || web.user);
  const query = useQuery({
    queryKey: ["notices", user?.id ?? web.user?.id ?? 0],
    enabled: ready && web.ready && signed,
    queryFn: () => fetchNotices({ data: { initData } }),
  });

  useEffect(() => {
    if (!query.data) return;
    const latest = query.data.reduce((max, item) => (item.at > max ? item.at : max), new Date().toISOString());
    localStorage.setItem(SEEN, latest);
    void qc.invalidateQueries({ queryKey: ["notices"] });
  }, [query.data, qc]);

  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) {
    return (
      <AccountGate title="Bildirishnomalar" hint="Holat va xabarlarni ko'rish uchun ism, familiya, telefon va manzilni kiriting.">
        {null}
      </AccountGate>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-bold">Bildirishnomalar</h1>
      {query.isPending ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : query.data && query.data.length > 0 ? (
        query.data.map((item) => (
          <a key={item.id} href={item.href} className="block rounded-2xl border border-border/70 bg-card p-3">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{postedAgo(item.at)}</p>
          </a>
        ))
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">Hozircha yangi xabar yo'q.</p>
      )}
    </div>
  );
}
