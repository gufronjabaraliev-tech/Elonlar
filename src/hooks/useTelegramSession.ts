import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getSession } from "@/lib/listings.functions";
import { getWebApp, type TgUser } from "@/lib/telegram";

export function useTelegramSession() {
  const [initData, setInitData] = useState<string | null>(null);
  const fetchSession = useServerFn(getSession);

  useEffect(() => {
    const app = getWebApp();
    if (app) {
      try {
        app.ready();
        app.expand();
        app.disableVerticalSwipes?.();
        if (app.colorScheme === "dark") document.documentElement.classList.add("dark");
      } catch {
        /* ignore */
      }
    }
    setInitData(app?.initData ?? "");
  }, []);

  const query = useQuery({
    queryKey: ["tg-session", initData],
    enabled: initData !== null,
    staleTime: 5 * 60 * 1000,
    queryFn: async () =>
      (await fetchSession({ data: { initData: initData ?? "" } })) as {
        user: TgUser | null;
        isAdmin: boolean;
      },
  });

  return {
    initData: initData ?? "",
    ready: initData !== null && !query.isPending,
    user: query.data?.user ?? null,
    isAdmin: query.data?.isAdmin ?? false,
    inTelegram: Boolean(query.data?.user),
  };
}
