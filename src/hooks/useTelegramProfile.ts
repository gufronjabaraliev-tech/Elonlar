import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useTelegramSession } from "@/hooks/useTelegramSession";
import { telegramProfileGet } from "@/lib/listings.functions";

export function useTelegramProfile() {
  const { initData, user, ready } = useTelegramSession();
  const fetchProfile = useServerFn(telegramProfileGet);
  const query = useQuery({
    queryKey: ["tg-profile", user?.id ?? 0],
    enabled: ready && Boolean(user),
    queryFn: () => fetchProfile({ data: { initData } }),
  });

  return {
    ready: !user || !query.isPending,
    profile: query.data,
  };
}
